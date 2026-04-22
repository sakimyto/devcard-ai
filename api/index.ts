import { App } from 'octokit'
import type { GitHubQueryResponse } from '../src/github/types'
import { handleRequest } from '../src/handler'
import { renderLandingPage } from '../src/landing'
import { isBotRequest, renderOgpHtml, svgToPng } from '../src/ogp'
import { MODULE_HEIGHTS } from '../src/svg/card'

interface Env {
  GITHUB_APP_ID: string
  GITHUB_APP_PRIVATE_KEY: string
  GITHUB_APP_INSTALLATION_ID: string
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

function parseParams(url: URL) {
  const user = url.searchParams.get('user') ?? ''
  const modules = (url.searchParams.get('modules') ?? '')
    .split(',')
    .filter((m) => VALID_MODULES.has(m))
  const theme = url.searchParams.get('theme') ?? 'light'
  return { user, modules, theme }
}

function createGraphql(octokit: Awaited<ReturnType<App['getInstallationOctokit']>>) {
  return async (query: string, variables: Record<string, unknown>) => {
    return octokit.graphql<GitHubQueryResponse>(query, variables)
  }
}


export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    const pathname = url.pathname

    // /og endpoint — returns PNG image
    if (pathname === '/og') {
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
      const baseUrl = `${url.protocol}//${url.host}`
      return new Response(renderLandingPage(baseUrl), {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      })
    }

    // Normal request — return SVG
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
