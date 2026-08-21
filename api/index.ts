import { App } from '@octokit/app'
import { recordRender } from '../src/analytics'
import { getCachedOrProduce } from '../src/cache'
import {
  type CardTheme,
  type GlowStyle,
  normalizeGlow,
  normalizeTheme,
} from '../src/card/customization'
import { listGallery, recordGallery, removeFromGallery } from '../src/gallery'
import type { GitHubQueryResponse } from '../src/github/types'
import { type BuildResult, CARD_DATA_REV, buildCardData, renderCardResult } from '../src/handler'
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
  UPSTREAM_RATELIMIT?: RateLimiter
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

// 「App を自分のアカウントに入れると private 込みで集計される（verified+）」という約束は、
// 固定の installation token では本人以外に成立しない — その token に見えるのは token の
// 持ち主のアカウントの private だけだから。ユーザーごとにその人自身の installation を
// 解決してから叩く。入れていない人は従来どおり固定 installation で公開分のみを見る。
// 解決できたかどうかは同時に「本人がオプトインした」ことの証拠でもあり、
// 召喚ギャラリーへの掲載可否がこれに乗る（他人が勝手に載せられない根拠）。
async function octokitForUser(app: App, user: string, fallbackInstallationId: number) {
  try {
    const res = await app.octokit.request('GET /users/{username}/installation', { username: user })
    return { octokit: await app.getInstallationOctokit(res.data.id), optedIn: true }
  } catch {
    // 未インストール（404）でも、参照に失敗しても、公開分だけの経路に落ちる
    return { octokit: await app.getInstallationOctokit(fallbackInstallationId), optedIn: false }
  }
}

// GitHub login spec: 1-39 chars, alphanumeric and single hyphens, not starting with hyphen.
const GH_LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/

function parseParams(url: URL) {
  const rawUser = url.searchParams.get('user') ?? ''
  // 空はランディング用に有効扱い。非空で GitHub login 規約に合わないものだけ不正
  const userValid = rawUser === '' || GH_LOGIN_RE.test(rawUser)
  const user = userValid ? rawUser : ''
  const theme = normalizeTheme(url.searchParams.get('theme'))
  const glow = normalizeGlow(url.searchParams.get('glow'))
  return { user, theme, glow, invalidUser: !userValid }
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

// GitHub App の GraphQL クォータ（5,000 pt/h）は全リクエストで共有する資源で、IP 単位の
// レート制限では守れない（IP を替えれば素通りする）。1時間の窓で上限に達したら GitHub を
// 叩くこと自体を断る。断られた側は stale か placeholder に落ちる — 全員が枯渇したクォータを
// 叩き続けて誰のカードも出ない状態より良い。
//
// 単価は推定ではなく実測: 3本のクエリはいずれも rateLimit.cost = 1 で、キャッシュミス1回
// あたり 3pt（2026-08-21 実測。GitHub 文書のノード数式から素朴に見積もると 74pt になるが、
// 実際の課金はそれよりはるかに緩い）。5,000pt/h ÷ 3pt ≒ 1,600 回が物理的な天井なので、
// REST の installation 解決ぶんを残して 1,500 回/h に置く。
// KV は結果整合なので厳密な会計にはならない。これは安全弁であって課金計算ではない。
const UPSTREAM_MISS_BUDGET_PER_HOUR = 1500
const UPSTREAM_BUDGET_PREFIX = 'budget:miss:'
// 上流が落ちている間の再突入を止めるサーキットブレーカ。これが無いと、失敗した produce は
// 何もキャッシュしないまま次のリクエストでまた GraphQL を3本焚き、障害中に負荷が最大化する
const UPSTREAM_TRIP_KEY = 'upstream:tripped'
const UPSTREAM_TRIP_SEC = 60

async function upstreamTripped(env: Env): Promise<boolean> {
  try {
    return (await env.DEVCARD_KV.get(UPSTREAM_TRIP_KEY)) !== null
  } catch {
    return false
  }
}

async function tripUpstream(env: Env): Promise<void> {
  try {
    await env.DEVCARD_KV.put(UPSTREAM_TRIP_KEY, '1', { expirationTtl: UPSTREAM_TRIP_SEC })
  } catch (error) {
    console.error('upstream: trip failed (ignored):', error)
  }
}

async function withinUpstreamBudget(env: Env): Promise<boolean> {
  // 主の関門。KV の読んで足して書くはアトミックでないので、同時に走ったミスは同じ値を
  // 読んで同じ数を書き、上限を素通りする。Cloudflare 側のレート制限は原子的に効くので、
  // 「毎分25回まで」という形で同じ予算（1,500回/時）をこちらで確実に締める
  if (env.UPSTREAM_RATELIMIT) {
    const { success } = await env.UPSTREAM_RATELIMIT.limit({ key: 'upstream-miss' })
    if (!success) return false
  }

  // 従の関門。時間窓の総量を見るのはこちら（バインディング未設定の環境でも最低限効く）
  const key = `${UPSTREAM_BUDGET_PREFIX}${Math.floor(Date.now() / 3_600_000)}`
  try {
    const spent = Number((await env.DEVCARD_KV.get(key)) ?? '0')
    if (spent >= UPSTREAM_MISS_BUDGET_PER_HOUR) return false
    // 窓が変わったら自然消滅させる（2時間で消えれば十分）
    await env.DEVCARD_KV.put(key, String(spent + 1), { expirationTtl: 7200 })
    return true
  } catch (error) {
    // 予算カウンタが読めない = KV 障害。上流を守る側に倒す
    console.error('upstream: budget check failed, refusing miss:', error)
    return false
  }
}

// キャッシュから来た解析結果が今の描画コードで扱える形か。壊れていたら「無い」と同じ扱いに
// して作り直す — 壊れた値を1時間 fresh で配り続けるより、GraphQL を1回余分に叩く方が安い。
function isRenderable(v: BuildResult): boolean {
  if (v.kind !== 'ok') return true
  const d = v.data
  return (
    !!d &&
    typeof d.username === 'string' &&
    typeof d.stats?.power === 'number' &&
    Array.isArray(d.record?.weeklyContributions) &&
    typeof d.element?.id === 'string' &&
    Array.isArray(d.languages?.languages) &&
    Array.isArray(d.toolAttribution?.tools) &&
    Array.isArray(d.usage?.categories) &&
    typeof d.pattern?.pattern === 'string' &&
    Array.isArray(d.traits)
  )
}

// 高コスト層（GitHub App 認証 + GraphQL×3 + avatar fetch + 全アナライザ）だけを
// KV SWR でキャッシュする。キーが user だけなのは buildCardData の結果が theme/glow に
// 依存しないから。外観の組み合わせをキーに含めると、同じユーザーの同じデータに対して
// 組み合わせ数ぶんの GraphQL 往復が走り、GitHub App のクォータを組み合わせ数倍で焼く。
// カード（/）と共有画像（/og）も同じエントリを共有する。
// fresh hit は GitHub 側の認証・API 障害から完全に切り離される。
async function resolveCardData(
  user: string,
  env: Env,
): Promise<{ value: BuildResult; cacheState: string }> {
  // GitHub の login は大文字小文字を区別しない。区別したままキーにすると Octocat と octocat で
  // 同じ人に2世代ぶんの GraphQL が走る（10文字の login なら 1,024 通り作れてしまう）
  const key = `data:v${CARD_DATA_REV}:${user.toLowerCase()}`

  const produce = async (): Promise<BuildResult> => {
    // 上流が落ちている間は叩かない。stale があればそれ、無ければ placeholder へ
    if (await upstreamTripped(env)) throw new Error('upstream circuit open')
    if (!(await withinUpstreamBudget(env))) throw new Error('upstream budget exhausted')
    let result: BuildResult
    let optedIn = false
    try {
      const githubApp = getApp(env)
      const resolved = await octokitForUser(githubApp, user, Number(env.GITHUB_APP_INSTALLATION_ID))
      optedIn = resolved.optedIn
      result = await buildCardData(user, createGraphql(resolved.octokit))
    } catch (error) {
      await tripUpstream(env)
      throw error
    }
    // 一過性エラー（rate limit・upstream 障害）はキャッシュせず throw して stale 供給へ。
    // 同時にブレーカを落とし、後続が同じ壁に3本ずつ投げ続けるのを止める
    if (result.kind === 'error') {
      await tripUpstream(env)
      throw new Error('upstream error')
    }
    return { ...result, optedIn }
  }

  const swr = {
    kv: env.DEVCARD_KV,
    key,
    // fresh を1時間から6時間へ。12週窓の指標は1時間で意味のある変化をしない一方、
    // キャッシュミスは GitHub App のクォータを直接削る（1ミス ≒ 74pt / 5,000pt 毎時）
    freshTtlSec: 21600,
    staleTtlSec: 86400,
    produce,
    shouldCache: (v: BuildResult) =>
      v.kind === 'ok' || v.kind === 'not_found' || v.kind === 'no_ai' || v.kind === 'no_repos',
  }

  const cached = await getCachedOrProduce(swr)
  if (isRenderable(cached.value)) return { value: cached.value, cacheState: cached.cacheState }

  // 壊れた世代を掴んだ。消してから1回だけ作り直す（作り直しも壊れていたら諦めて返す —
  // 無限に GitHub を叩かない）
  console.error('cache: stored card data is not renderable, refreshing:', key)
  try {
    await env.DEVCARD_KV.delete(key)
  } catch (error) {
    console.error('cache: delete of unrenderable entry failed (ignored):', error)
  }
  const rebuilt = await getCachedOrProduce(swr)
  return { value: rebuilt.value, cacheState: rebuilt.cacheState }
}

// /og の共有画像 SVG。カード本体と同じ解析結果から、横長レイアウトで描き直す。
async function resolveOgSvg(
  user: string,
  theme: CardTheme,
  glow: GlowStyle,
  env: Env,
): Promise<{ svg: string; cacheState: string }> {
  try {
    const { value, cacheState } = await resolveCardData(user, env)
    const svg =
      value.kind === 'ok' && value.data
        ? renderOgShare(value.data, theme, glow)
        : renderOgError(value.errorMessage ?? 'Temporarily unavailable', theme)
    return { svg, cacheState }
  } catch {
    // fresh も stale も無い完全失敗のみ。キャッシュしない一過性エラー画像を返す
    return { svg: renderOgError('Temporarily unavailable', theme), cacheState: 'none' }
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

// 画像レスポンス共通のヘッダ。SVG は LP と同一オリジンで配られるため、直接開かれたときに
// スクリプト文脈を持たないことを CSP で明示する（中身は全部エスケープ済みだが、
// 「エスケープが完璧である」ことに単独で依存しない）。nosniff は PNG/SVG の取り違え防止。
function imageHeaders(contentType: string, cacheControl: string): Record<string, string> {
  return {
    'Content-Type': contentType,
    'Cache-Control': cacheControl,
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    'X-Content-Type-Options': 'nosniff',
  }
}

// Worker はエッジキャッシュの**前段**で走るので、Cache-Control を付けただけでは
// Cloudflare 側に何も残らない（届くのはブラウザと GitHub camo のキャッシュだけ）。
// 明示的に Cache API へ入れて初めて、README の再表示や連続する unfurl が
// KV も描画もラスタライズも踏まずに返る。
// キーに正規化済みの user / theme / glow だけを使うのは、?user=Octocat と ?user=octocat、
// あるいは無関係なパラメータ付きの URL で別エントリを量産させないため。
function edgeCacheKey(url: URL, user: string, theme: CardTheme, glow: GlowStyle, tag: string) {
  const key = new URL(url.origin)
  key.pathname = url.pathname
  key.search = `user=${user.toLowerCase()}&theme=${theme}&glow=${glow}&v=${tag}`
  return new Request(key.toString(), { method: 'GET' })
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url)
    const pathname = url.pathname

    // このブロックは絶対に消さない（旧バッジの生存線）
    if (LEGACY_HOSTS.has(url.hostname)) {
      url.hostname = 'pullcard.sakimyto.com'
      return Response.redirect(url.toString(), 301)
    }

    const cache = caches.default

    // 召喚ギャラリー: 直近召喚者一覧（KV metadata 由来、at 降順 top24）。
    // 1リクエストが KV list を複数回まわすので、レート制限とエッジキャッシュの両方を噛ませる。
    if (pathname === '/api/gallery') {
      if (await rateLimited(req, env)) return rateLimitedResponse()
      const galleryKey = new Request(`${url.origin}/api/gallery`, { method: 'GET' })
      const hit = await cache.match(galleryKey)
      if (hit) return hit
      const entries = await listGallery(env.DEVCARD_KV)
      const res = new Response(JSON.stringify(entries), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=60',
          'X-Content-Type-Options': 'nosniff',
        },
      })
      ctx.waitUntil(cache.put(galleryKey, res.clone()))
      return res
    }

    // /og endpoint — returns a 1200x630 landscape PNG share image
    if (pathname === '/og') {
      const { user, theme, glow, invalidUser } = parseParams(url)
      if (invalidUser) return badRequestResponse('Invalid user parameter')
      if (!user) return badRequestResponse('User parameter required')

      // ラスタライズは KV ヒットでも必ず走る（KV が持つのは SVG であって PNG ではない）。
      // unfurl は同じ URL に集中するので、エッジで返せる分がそのまま CPU の節約になる
      const ogKey = edgeCacheKey(url, user, theme, glow, 'og1')
      const ogHit = await cache.match(ogKey)
      if (ogHit) return ogHit
      if (await rateLimited(req, env)) return rateLimitedResponse()

      const { svg, cacheState } = await resolveOgSvg(user, theme, glow, env)

      try {
        const png = await svgToPng(svg, 1200)
        recordRender(env.CARD_ANALYTICS, { user, theme, glow, kind: 'og', cacheState })
        // cacheState==='none' は「fresh も stale も無い完全失敗」= 一過性エラー画像。
        // これを1時間エッジに置くと、上流が復旧しても共有プレビューだけが壊れたまま残る
        const transient = cacheState === 'none'
        const res = new Response(png as unknown as BodyInit, {
          headers: imageHeaders(
            'image/png',
            transient ? 'public, max-age=60' : 'public, max-age=3600, s-maxage=3600',
          ),
        })
        if (!transient) ctx.waitUntil(cache.put(ogKey, res.clone()))
        return res
      } catch (error) {
        console.error('SVG to PNG conversion failed:', error)
        return new Response('Image generation failed', { status: 500 })
      }
    }

    // Bot User-Agent → return OGP HTML（存在しないユーザーは 200 を返さず 404）
    const userAgent = req.headers.get('user-agent') ?? ''
    if (isBotRequest(userAgent)) {
      const { user, theme, glow, invalidUser } = parseParams(url)
      if (!invalidUser && user) {
        if (await rateLimited(req, env)) return rateLimitedResponse()
        // 判定に要るのは kind だけ。ここでカードを描いても捨てるだけなので描かない
        let kind = 'placeholder'
        try {
          kind = (await resolveCardData(user, env)).value.kind
        } catch {
          // 上流の完全失敗。存在しないと断定はできないので OGP HTML を返す側に倒す
        }
        if (kind === 'not_found') return notFoundResponse()
        const baseUrl = `${url.protocol}//${url.host}`
        const html = renderOgpHtml(user, baseUrl, theme, glow)
        return new Response(html, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
          },
        })
      }
    }

    // No user param → landing page
    const { user, theme, glow, invalidUser } = parseParams(url)
    if (invalidUser) return badRequestResponse('Invalid user parameter')
    if (!user && pathname === '/') {
      return new Response(renderLandingPage(), {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
      })
    }
    // 空 user がランディング以外に流れたら GitHub API に触れる前に 400 で止める
    if (!user) return badRequestResponse('User parameter required')

    // Normal request — return SVG（KV stale-if-error キャッシュ経由）
    // not_found の応答は Accept で分岐する（下記）ので、その分岐までキーに含める
    const accept = req.headers.get('accept') ?? ''
    const wantsHtml = accept.includes('text/html')
    const cardKey = edgeCacheKey(url, user, theme, glow, wantsHtml ? 'card1h' : 'card1i')
    const cardHit = await cache.match(cardKey)
    if (cardHit) return cardHit
    if (await rateLimited(req, env)) return rateLimitedResponse()

    let svg: string
    let kind: string
    let cacheState = 'none'
    try {
      const resolved = await resolveCardData(user, env)
      cacheState = resolved.cacheState
      // 描く前に判定する。404 を返す相手にカードを組み立てても捨てるだけ
      if (resolved.value.kind === 'not_found' && wantsHtml) return notFoundResponse()
      const result = renderCardResult(resolved.value, { theme, glow })
      svg = result.svg
      kind = result.kind

      // 召喚ギャラリー記録。**本人がオプトインした召喚だけ**を載せる — 誰でも他人を召喚できる
      // 以上、「描画されたから載せる」では本人の同意なくログイン名と数値が公開ページに並ぶ。
      // includesPrivate = その人自身が GitHub App を自分のアカウントに入れた証明。
      // 逆に App を外した人は、次のキャッシュミス時にギャラリーから外れる（削除依頼が要らない）。
      if (resolved.value.kind === 'ok' && resolved.value.data) {
        if (resolved.value.optedIn) {
          ctx.waitUntil(
            recordGallery(env.DEVCARD_KV, user, {
              at: Date.now(),
              theme,
              glow,
              power: result.power,
              element: result.element,
              epithet: result.epithet,
            }),
          )
        } else if (cacheState === 'miss') {
          ctx.waitUntil(removeFromGallery(env.DEVCARD_KV, user))
        }
      }
    } catch {
      svg = renderPlaceholderCard(user, theme, glow)
      kind = 'placeholder'
      cacheState = 'none'
    }

    recordRender(env.CARD_ANALYTICS, { user, theme, glow, kind, cacheState })

    // not_found: HTML を明示要求するクライアント（ブラウザ直叩き）には 404、
    // 画像コンテキスト（GitHub camo / <img>）には 200 + エラーカード SVG を返す。
    // 4xx を画像に返すと README で broken image になるための設計判断（spec 受け入れ条件4）

    // placeholder は一時障害の産物。長くは持たせないが、no-store にすると復旧待ちの間
    // クライアントが即座に叩き直し、枯渇した上流をさらに押すので短い max-age を置く
    if (kind === 'placeholder') {
      return new Response(svg, {
        status: 200,
        headers: {
          ...imageHeaders('image/svg+xml', 'public, max-age=60'),
          'X-Cache-State': cacheState,
        },
      })
    }

    const res = new Response(svg, {
      status: 200,
      headers: {
        ...imageHeaders('image/svg+xml', 'public, max-age=3600, s-maxage=3600'),
        'X-Cache-State': cacheState,
      },
    })
    ctx.waitUntil(cache.put(cardKey, res.clone()))
    return res
  },
}
