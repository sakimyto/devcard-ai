import { App } from 'octokit'
import { handleRequest } from '../src/handler'
import type { GitHubQueryResponse } from '../src/github/types'

export const config = {
  runtime: 'edge',
}

let app: App | null = null

function getApp(): App {
  if (!app) {
    app = new App({
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
    })
  }
  return app
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const user = url.searchParams.get('user') ?? ''
  const modules = (url.searchParams.get('modules') ?? '').split(',').filter(Boolean)
  const theme = url.searchParams.get('theme') ?? 'light'
  // lang param reserved for Phase 2 i18n
  // const _lang = url.searchParams.get('lang') ?? 'en'

  const githubApp = getApp()
  const octokit = await githubApp.getInstallationOctokit(
    Number(process.env.GITHUB_APP_INSTALLATION_ID),
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
}
