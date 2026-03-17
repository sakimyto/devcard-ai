import { isAiCommit } from './analyzers/coauthor'
import { analyzeLanguages } from './analyzers/languages'
import { analyzePattern } from './analyzers/pattern'
import { analyzeScore } from './analyzers/score'
import { analyzeToolAttribution } from './analyzers/toolAttribution'
import { analyzeUsage } from './analyzers/usage'
import type { CardData } from './analyzers/types'
import { fetchUserData } from './github/client'
import type { GitHubCommit, GitHubQueryResponse } from './github/types'
import { renderCard, renderErrorCard } from './svg/card'

export interface RequestParams {
  user: string
  modules: string[]
  theme: string
}

export interface HandlerResult {
  svg: string
  status: number
}

type GraphqlFn = (
  query: string,
  variables: Record<string, unknown>,
) => Promise<GitHubQueryResponse>

export async function handleRequest(
  params: RequestParams,
  graphql: GraphqlFn,
): Promise<HandlerResult> {
  const { user, modules, theme } = params

  if (!user) {
    return {
      svg: renderErrorCard('User parameter required', theme),
      status: 200,
    }
  }

  try {
    const userData = await fetchUserData(user, graphql)

    if (!userData) {
      return { svg: renderErrorCard('User not found', theme), status: 200 }
    }

    const repos = userData.repositories.nodes

    if (repos.length === 0) {
      return { svg: renderErrorCard('No public repos', theme), status: 200 }
    }

    const allCommits: GitHubCommit[] = repos.flatMap(
      (r) => r.defaultBranchRef?.target.history.nodes ?? [],
    )

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const hasRecentActivity = repos.some(
      (r) => new Date(r.pushedAt) >= thirtyDaysAgo,
    )

    const aiCommits = allCommits.filter((c) =>
      isAiCommit(c.message, c.author?.user?.login ?? null),
    )

    const toolAttribution = analyzeToolAttribution(aiCommits)

    if (toolAttribution.totalAiCommits === 0) {
      return {
        svg: renderErrorCard('No AI activity detected yet', theme),
        status: 200,
      }
    }

    const usage = analyzeUsage(aiCommits)
    const languages = analyzeLanguages(repos)
    const pattern = analyzePattern(allCommits, aiCommits.length)
    const score = analyzeScore(toolAttribution, usage, hasRecentActivity)

    const cardData: CardData = {
      username: userData.login,
      score,
      toolAttribution,
      usage,
      languages,
      pattern,
    }

    const svg = renderCard(cardData, { theme, modules })
    return { svg, status: 200 }
  } catch (error) {
    const isRateLimit =
      error instanceof Error && error.message.includes('rate limit')
    const errorType = isRateLimit ? 'rate_limit' : 'unknown'
    console.error(`handleRequest error [${errorType}]:`, error)
    const message = isRateLimit
      ? 'GitHub API rate limit exceeded'
      : 'Temporarily unavailable'
    return { svg: renderErrorCard(message, theme), status: 200 }
  }
}
