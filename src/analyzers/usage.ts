import type { GitHubCommit } from '~/github/types'
import type { UsageAnalysis, UsageCategory, UsageCategoryData } from './types'

const PREFIX_MAP: [RegExp, UsageCategory][] = [
  [/^(feat|feature)(\(.+\))?:/i, 'feature'],
  [/^(fix|bugfix|hotfix)(\(.+\))?:/i, 'bugfix'],
  [/^(test|spec)(\(.+\))?:/i, 'test'],
  [/^(refactor|chore|style|ci|build|docs)(\(.+\))?:/i, 'refactor'],
]

function classifyCommit(message: string): UsageCategory {
  const firstLine = message.split('\n')[0].trim()
  for (const [pattern, category] of PREFIX_MAP) {
    if (pattern.test(firstLine)) return category
  }
  return 'feature'
}

const ALL_CATEGORIES: UsageCategory[] = ['feature', 'bugfix', 'test', 'refactor']

export function analyzeUsage(
  aiCommits: GitHubCommit[],
  testCommitShas?: Set<string>,
): UsageAnalysis {
  const counts = new Map<UsageCategory, number>(
    ALL_CATEGORIES.map((c) => [c, 0]),
  )

  for (const commit of aiCommits) {
    const prefixCat = classifyCommit(commit.message)
    // If commit touches test files but prefix says otherwise, count as test
    const cat = prefixCat !== 'test' && testCommitShas?.has(commit.oid)
      ? 'test'
      : prefixCat
    counts.set(cat, (counts.get(cat) ?? 0) + 1)
  }

  const total = aiCommits.length
  const categories: UsageCategoryData[] = ALL_CATEGORIES
    .map((category) => ({
      category,
      count: counts.get(category) ?? 0,
      percentage: total === 0 ? 0 : Math.round(((counts.get(category) ?? 0) / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count)

  return { categories, totalCommits: total }
}
