import { analyzeEquipped } from './analyzers/equipped'
import { isAiCommit } from './analyzers/coauthor'
import { flavorText } from './analyzers/flavor'
import { analyzeLanguages } from './analyzers/languages'
import { analyzePattern } from './analyzers/pattern'
import { analyzeStats } from './analyzers/stats'
import { analyzeToolAttribution } from './analyzers/toolAttribution'
import { analyzeUsage } from './analyzers/usage'
import { WINDOW_DAYS, filterToWindow } from './analyzers/window'
import type { CardDataV2 } from './analyzers/types'
import { artSeed, cardSerial } from './card/serial'
import { fetchUserData } from './github/client'
import type { GitHubCommit, GitHubQueryResponse } from './github/types'
import { renderErrorCard } from './svg/card'
import { renderCardV2 } from './svg/v2/cardV2'

export interface RequestParams {
  user: string
  theme: string
}

export type HandlerKind = 'ok' | 'not_found' | 'no_repos' | 'no_ai' | 'error'

export interface HandlerResult {
  svg: string
  status: number
  kind: HandlerKind
}

type GraphqlFn = (
  query: string,
  variables: Record<string, unknown>,
) => Promise<GitHubQueryResponse>

export async function handleRequest(
  params: RequestParams,
  graphql: GraphqlFn,
  now: Date = new Date(),
): Promise<HandlerResult> {
  const { user, theme } = params

  try {
    // 12週窓の下限を GraphQL 側にも伝え、窓外コミットの取得自体を止める（per-repo 100件上限を窓内に使う）
    const since = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const userData = await fetchUserData(user, graphql, since)
    if (!userData) {
      return { svg: renderErrorCard('User not found', theme), status: 200, kind: 'not_found' }
    }

    const repos = userData.repositories.nodes
    if (repos.length === 0) {
      return { svg: renderErrorCard('No public repos', theme), status: 200, kind: 'no_repos' }
    }

    const allCommits: GitHubCommit[] = repos.flatMap((r) =>
      (r.defaultBranchRef?.target.history.nodes ?? []).map((c) => ({
        ...c,
        repoFullName: `${userData.login}/${r.name}`,
      })),
    )

    // v2: 全指標を「直近12週・公開リポ」窓に統一する（since 済みだが未来時刻/クロックずれ防御で再フィルタ）
    const windowCommits = filterToWindow(allCommits, now)
    const windowAiCommits = windowCommits.filter((c) =>
      isAiCommit(c.message, c.author?.user?.login ?? null),
    )

    const equipped = analyzeEquipped(repos)

    if (windowAiCommits.length === 0) {
      return {
        svg: renderErrorCard('No public AI activity in the last 12 weeks', theme),
        status: 200,
        kind: 'no_ai',
      }
    }

    const toolAttribution = analyzeToolAttribution(windowAiCommits)
    const usage = analyzeUsage(windowAiCommits)
    const languages = analyzeLanguages(repos)
    const pattern = analyzePattern(windowCommits, windowAiCommits.length)

    const commitToolIds = new Set(toolAttribution.tools.map((t) => t.toolId))
    const equippedOnlyCount = equipped.equipped.filter((e) => !commitToolIds.has(e.toolId)).length

    const stats = analyzeStats({
      windowAiCommits,
      commitToolCount: toolAttribution.tools.filter((t) => t.toolId !== 'unknown').length,
      equippedOnlyCount,
      usage,
      now,
    })

    const data: CardDataV2 = {
      username: userData.login,
      stats,
      toolAttribution,
      equipped,
      usage,
      languages,
      pattern,
      flavor: flavorText({
        pattern: pattern.pattern,
        topToolName: toolAttribution.tools.find((t) => t.toolId !== 'unknown')?.toolName ?? null,
        consistency: stats.consistency,
      }),
      serial: cardSerial(userData.login),
      seed: artSeed(userData.login),
      issuedYear: now.getUTCFullYear(),
    }

    return { svg: renderCardV2(data, { theme }), status: 200, kind: 'ok' }
  } catch (error) {
    const isRateLimit = error instanceof Error && error.message.includes('rate limit')
    console.error(`handleRequest error [${isRateLimit ? 'rate_limit' : 'unknown'}]:`, error)
    const message = isRateLimit ? 'GitHub API rate limit exceeded' : 'Temporarily unavailable'
    return { svg: renderErrorCard(message, theme), status: 200, kind: 'error' }
  }
}
