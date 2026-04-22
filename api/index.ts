import { App } from '@octokit/app'
import type { GitHubQueryResponse } from '../src/github/types'
import { handleRequest } from '../src/handler'
import { renderLandingPage } from '../src/landing'
import { isBotRequest, renderOgpHtml, svgToPng } from '../src/ogp'
import { MODULE_HEIGHTS } from '../src/svg/card'

interface RateLimiter {
  limit(opts: { key: string }): Promise<{ success: boolean }>
}

interface Env {
  GITHUB_APP_ID: string
  GITHUB_APP_PRIVATE_KEY: string
  GITHUB_APP_INSTALLATION_ID: string
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

const VALID_MODULES = new Set(Object.keys(MODULE_HEIGHTS))
const VALID_THEMES = new Set(['light', 'dark'])
// GitHub login spec: 1-39 chars, alphanumeric and single hyphens, not starting with hyphen.
const GH_LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/

function parseParams(url: URL) {
  const rawUser = url.searchParams.get('user') ?? ''
  const user = GH_LOGIN_RE.test(rawUser) ? rawUser : ''
  const modules = (url.searchParams.get('modules') ?? '')
    .split(',')
    .filter((m) => VALID_MODULES.has(m))
  const rawTheme = url.searchParams.get('theme') ?? 'light'
  const theme = VALID_THEMES.has(rawTheme) ? rawTheme : 'light'
  return { user, modules, theme }
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

const RATE_LIMITED_RESPONSE = new Response('Rate limit exceeded', {
  status: 429,
  headers: { 'Retry-After': '60' },
})


export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    const pathname = url.pathname

    // /og endpoint — returns PNG image
    if (pathname === '/og') {
      if (await rateLimited(req, env)) return RATE_LIMITED_RESPONSE.clone()
      const { user, modules, theme } = parseParams(url)

      const githubApp = getApp(env)
      const octokit = await githubApp.getInstallationOctokit(
        Number(env.GITHUB_APP_INSTALLATION_ID),
      )

      const result = await handleRequest(
        { user, modules, theme },
        createGraphql(octokit),
      )

      try {
        const png = await svgToPng(result.svg)
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

    // Bot User-Agent → return OGP HTML
    const userAgent = req.headers.get('user-agent') ?? ''
    if (isBotRequest(userAgent)) {
      const { user, theme } = parseParams(url)
      if (user) {
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
    const { user, modules, theme } = parseParams(url)
    if (!user && pathname === '/') {
      return new Response(renderLandingPage(), {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      })
    }

    // Normal request — return SVG
    if (await rateLimited(req, env)) return RATE_LIMITED_RESPONSE.clone()
    const githubApp = getApp(env)
    const octokit = await githubApp.getInstallationOctokit(
      Number(env.GITHUB_APP_INSTALLATION_ID),
    )

    const result = await handleRequest(
      { user, modules, theme },
      createGraphql(octokit),
    )

    return new Response(result.svg, {
      status: result.status,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  },
}
