import { isAiCommit } from './coauthor'
import type { GitHubCommit } from '~/github/types'
import type { PatternAnalysis, PatternType } from './types'

export function analyzePattern(
  allCommits: GitHubCommit[],
  aiCommitCount: number,
): PatternAnalysis {
  const total = allCommits.length
  if (total === 0) {
    return { pattern: 'Selective User', aiRate: 0, alternationScore: 0 }
  }

  const aiRate = aiCommitCount / total

  const sorted = [...allCommits].sort(
    (a, b) => new Date(a.committedDate).getTime() - new Date(b.committedDate).getTime(),
  )

  let flips = 0
  for (let i = 1; i < sorted.length; i++) {
    const prevIsAi = isAiCommit(sorted[i - 1].message, sorted[i - 1].author?.user?.login ?? null)
    const currIsAi = isAiCommit(sorted[i].message, sorted[i].author?.user?.login ?? null)
    if (prevIsAi !== currIsAi) flips++
  }
  const alternationScore = sorted.length <= 1 ? 0 : flips / (sorted.length - 1)

  let pattern: PatternType
  if (aiRate >= 0.6) {
    pattern = 'AI Native'
  } else if (aiRate >= 0.3) {
    pattern = alternationScore > 0.5 ? 'Pair Programmer' : 'Delegator'
  } else {
    pattern = 'Selective User'
  }

  return { pattern, aiRate, alternationScore }
}
