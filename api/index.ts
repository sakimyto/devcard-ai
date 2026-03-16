import { App } from 'octokit'
import type { GitHubQueryResponse } from '../src/github/types'
import { handleRequest } from '../src/handler'

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

const VALID_MODULES = new Set(['style', 'tools', 'coauthor', 'heatmap', 'score'])

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    const user = url.searchParams.get('user') ?? ''
    const modules = (url.searchParams.get('modules') ?? '')
      .split(',')
      .filter((m) => VALID_MODULES.has(m))
    const theme = url.searchParams.get('theme') ?? 'light'

    const githubApp = getApp(env)
    const octokit = await githubApp.getInstallationOctokit(
      Number(env.GITHUB_APP_INSTALLATION_ID),
    )

    const graphql = async (query: string, variables: Record<string, unknown>) => {
      return octokit.graphql<GitHubQueryResponse>(query, variables)
    }

    const result = await handleRequest({ user, modules, theme }, graphql)

    return new Response(result.svg, {
      status: result.status,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  },
}
