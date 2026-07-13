import { App } from '@octokit/app'
import { recordRender } from '../src/analytics'
import { getCachedOrProduce } from '../src/cache'
import { listGallery, recordGallery } from '../src/gallery'
import type { GitHubQueryResponse } from '../src/github/types'
import { buildCardData, handleRequest } from '../src/handler'
import { renderLandingPage } from '../src/landing'
import { isBotRequest, renderOgpHtml, svgToPng } from '../src/ogp'
import { renderPlaceholderCard } from '../src/svg/v2/cardV2'
import { renderOgError, renderOgShare } from '../src/svg/v2/ogShare'

interface RateLimiter {
  limit(opts: { key: string }): Promise<{ success: boolean }>
}

interface Env {
  GITHUB_APP_ID: string
  GITHUB_APP_PRIVATE_KEY: string
  GITHUB_APP_INSTALLATION_ID: string
  DEVCARD_KV: KVNamespace
  CARD_ANALYTICS?: AnalyticsEngineDataset
  API_RATELIMIT?: RateLimiter
}

let cachedApp: { app: App; appId: string } | null = null

function getApp(env: Env): App {
  if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) {
    throw new Error('Missing required GitHub App environment variables')
  }
  if (cachedApp && cachedApp.appId === env.GITHUB_APP_ID) {
    return cachedApp.app
  }
  const app = new App({ appId: env.GITHUB_APP_ID, privateKey: env.GITHUB_APP_PRIVATE_KEY })
  cachedApp = { app, appId: env.GITHUB_APP_ID }
  return app
}

const VALID_THEMES = new Set(['light', 'dark'])
// GitHub login spec: 1-39 chars, alphanumeric and single hyphens, not starting with hyphen.
const GH_LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/

function parseParams(url: URL) {
  const rawUser = url.searchParams.get('user') ?? ''
  // 空はランディング用に有効扱い。非空で GitHub login 規約に合わないものだけ不正
  const userValid = rawUser === '' || GH_LOGIN_RE.test(rawUser)
  const user = userValid ? rawUser : ''
  const rawTheme = url.searchParams.get('theme') ?? 'light'
  const theme = VALID_THEMES.has(rawTheme) ? rawTheme : 'light'
  return { user, theme, invalidUser: !userValid }
}

function badRequestResponse(message: string): Response {
  return new Response(message, {
    status: 400,
    headers: { 'Cache-Control': 'public, max-age=3600' },
  })
}

function notFoundResponse(): Response {
  return new Response('User not found', {
    status: 404,
    headers: { 'Cache-Control': 'public, max-age=3600' },
  })
}

interface ResolvedCard {
  svg: string
  kind: string
  cacheState: string
  // ギャラリー記録用（ok の miss 時のみ意味を持つ表示値）
  grade?: string
  power?: number
  element?: string
  epithet?: string
}

// KV SWR 経由でカードを解決する。GitHub App 認証は produce 内（miss/expired 時のみ）に
// 遅延させ、fresh hit を GitHub 側の認証・API 障害から完全に切り離す。
// fresh も stale も無い完全失敗だけが placeholder に落ちる。
async function resolveCard(user: string, theme: string, env: Env): Promise<ResolvedCard> {
  try {
    const cached = await getCachedOrProduce({
      kv: env.DEVCARD_KV,
      key: `card:v2:${user}:${theme}`,
      freshTtlSec: 3600,
      staleTtlSec: 86400,
      produce: async () => {
        const githubApp = getApp(env)
        const octokit = await githubApp.getInstallationOctokit(
          Number(env.GITHUB_APP_INSTALLATION_ID),
        )
        const result = await handleRequest({ user, theme }, createGraphql(octokit))
        // エラーカードはキャッシュせず throw して stale 供給に切り替える
        if (result.kind === 'error') throw new Error('upstream error')
        return {
          svg: result.svg,
          kind: result.kind,
          grade: result.grade,
          power: result.power,
          element: result.element,
          epithet: result.epithet,
        }
      },
      shouldCache: (v) =>
        v.kind === 'ok' || v.kind === 'not_found' || v.kind === 'no_ai' || v.kind === 'no_repos',
    })
    return {
      svg: cached.value.svg,
      kind: cached.value.kind,
      cacheState: cached.cacheState,
      grade: cached.value.grade,
      power: cached.value.power,
      element: cached.value.element,
      epithet: cached.value.epithet,
    }
  } catch {
    return { svg: renderPlaceholderCard(user, theme), kind: 'placeholder', cacheState: 'none' }
  }
}

function createGraphql(octokit: Awaited<ReturnType<App['getInstallationOctokit']>>) {
  return async (query: string, variables: Record<string, unknown>) => {
    return octokit.graphql<GitHubQueryResponse>(query, variables)
  }
}

async function rateLimited(req: Request, env: Env): Promise<boolean> {
  if (!env.API_RATELIMIT) return false
  const ip = req.headers.get('cf-connecting-ip') ?? 'unknown'
  const { success } = await env.API_RATELIMIT.limit({ key: ip })
  return !success
}

function rateLimitedResponse(): Response {
  // Constructed per-call — `new Response()` at module scope is disallowed
  // on the Cloudflare Workers runtime (validation error 10021).
  return new Response('Rate limit exceeded', {
    status: 429,
    headers: { 'Retry-After': '60' },
  })
}

// 正準ドメイン（pullcard.sakimyto.com）へ 301 集約するレガシーホスト。旧バッジ URL は
// 他人の README に永久に残る。camo はリダイレクト追従するので 301 で全部生かす。
// workers.dev エントリは wrangler.toml の `name = "devcard-ai"` から派生しており、
// worker 名を変えるとこのホストが dead になる（wrangler.toml 側のコメントも参照）
const LEGACY_HOSTS = new Set(['devcard-ai.sakimyto.workers.dev', 'devcard.sakimyto.com'])

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url)
    const pathname = url.pathname

    // このブロックは絶対に消さない（旧バッジの生存線）
    if (LEGACY_HOSTS.has(url.hostname)) {
      url.hostname = 'pullcard.sakimyto.com'
      return Response.redirect(url.toString(), 301)
    }

    // 召喚ギャラリー: 直近召喚者一覧（KV metadata 由来、at 降順 top24）。60s キャッシュ。
    if (pathname === '/api/gallery') {
      const entries = await listGallery(env.DEVCARD_KV)
      return new Response(JSON.stringify(entries), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=60',
        },
      })
    }

    // /og endpoint — returns a 1200x630 landscape PNG share image
    if (pathname === '/og') {
      const { user, theme, invalidUser } = parseParams(url)
      if (invalidUser) return badRequestResponse('Invalid user parameter')
      if (!user) return badRequestResponse('User parameter required')
      if (await rateLimited(req, env)) return rateLimitedResponse()

      const githubApp = getApp(env)
      const octokit = await githubApp.getInstallationOctokit(Number(env.GITHUB_APP_INSTALLATION_ID))

      const r = await buildCardData({ user, theme }, createGraphql(octokit))
      const svg =
        r.kind === 'ok' && r.data
          ? renderOgShare(r.data, theme)
          : renderOgError(r.errorMessage ?? 'Temporarily unavailable', theme)

      try {
        const png = await svgToPng(svg, 1200)
        recordRender(env.CARD_ANALYTICS, { user, theme, kind: 'og', cacheState: 'none' })
        return new Response(png as unknown as BodyInit, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          },
        })
      } catch (error) {
        console.error('SVG to PNG conversion failed:', error)
        return new Response('Image generation failed', { status: 500 })
      }
    }

    // Bot User-Agent → return OGP HTML（存在しないユーザーは 200 を返さず 404）
    const userAgent = req.headers.get('user-agent') ?? ''
    if (isBotRequest(userAgent)) {
      const { user, theme, invalidUser } = parseParams(url)
      if (!invalidUser && user) {
        if (await rateLimited(req, env)) return rateLimitedResponse()
        const card = await resolveCard(user, theme, env)
        if (card.kind === 'not_found') return notFoundResponse()
        const baseUrl = `${url.protocol}//${url.host}`
        const html = renderOgpHtml(user, baseUrl, theme)
        return new Response(html, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          },
        })
      }
    }

    // No user param → landing page
    const { user, theme, invalidUser } = parseParams(url)
    if (invalidUser) return badRequestResponse('Invalid user parameter')
    if (!user && pathname === '/') {
      return new Response(renderLandingPage(), {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      })
    }
    // 空 user がランディング以外に流れたら GitHub API に触れる前に 400 で止める
    if (!user) return badRequestResponse('User parameter required')

    // Normal request — return SVG（KV stale-if-error キャッシュ経由）
    if (await rateLimited(req, env)) return rateLimitedResponse()
    const card = await resolveCard(user, theme, env)
    recordRender(env.CARD_ANALYTICS, { user, theme, kind: card.kind, cacheState: card.cacheState })

    // 召喚ギャラリー記録: ok の miss（fresh 生成）時のみ。fresh hit では書かず KV 無料枠に収める。
    // fire-and-forget（waitUntil）でレスポンスをブロックしない。
    if (card.kind === 'ok' && card.cacheState === 'miss') {
      ctx.waitUntil(
        recordGallery(env.DEVCARD_KV, user, {
          at: Date.now(),
          grade: card.grade,
          power: card.power,
          element: card.element,
          epithet: card.epithet,
        }),
      )
    }

    // not_found: HTML を明示要求するクライアント（ブラウザ直叩き）には 404、
    // 画像コンテキスト（GitHub camo / <img>）には 200 + エラーカード SVG を返す。
    // 4xx を画像に返すと README で broken image になるための設計判断（spec 受け入れ条件4）
    const accept = req.headers.get('accept') ?? ''
    if (card.kind === 'not_found' && accept.includes('text/html')) {
      return notFoundResponse()
    }

    // placeholder は一時障害の産物なのでキャッシュさせない（復旧後すぐ実カードに戻す）
    if (card.kind === 'placeholder') {
      return new Response(card.svg, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-store',
          'X-Cache-State': card.cacheState,
        },
      })
    }

    return new Response(card.svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'X-Cache-State': card.cacheState,
      },
    })
  },
}
