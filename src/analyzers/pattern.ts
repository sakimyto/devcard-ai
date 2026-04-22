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

  // Tag once so the alternation walk is O(n), not O(n) × 2 isAiCommit calls.
  const tagged = allCommits
    .map((c) => ({
      ts: Date.parse(c.committedDate),
      isAi: isAiCommit(c.message, c.author?.user?.login ?? null),
    }))
    .sort((a, b) => a.ts - b.ts)

  let flips = 0
  for (let i = 1; i < tagged.length; i++) {
    if (tagged[i - 1].isAi !== tagged[i].isAi) flips++
  }
  const alternationScore = tagged.length <= 1 ? 0 : flips / (tagged.length - 1)

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
