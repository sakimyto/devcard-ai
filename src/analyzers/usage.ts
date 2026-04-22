import type { GitHubCommit } from '~/github/types'
import type { UsageAnalysis, UsageCategory, UsageCategoryData } from './types'

const PREFIX_MAP: [RegExp, UsageCategory][] = [
  [/^(feat|feature)(\(.+\))?:/i, 'feature'],
  [/^(fix|bugfix|hotfix)(\(.+\))?:/i, 'bugfix'],
  [/^(test|spec)(\(.+\))?:/i, 'test'],
  [/^(refactor|chore|style|ci|build|docs)(\(.+\))?:/i, 'refactor'],
]

// Signals that a commit touched tests, even when the title uses a non-test
// prefix (feat/fix/refactor). Broad coverage is important because AI agents
// often add tests inside a feature commit — without these heuristics TDD-with-AI
// gets undercounted.
const TEST_FILE_MENTION_PATTERNS: RegExp[] = [
  /(?:tests?|__tests__|specs?|e2e)\//i,              // js/ts/py path segments
  /\.(test|spec)\.\w+/i,                              // foo.test.ts / foo.spec.js
  /_test\.(go|py|rb|rs|ts|tsx|js|jsx)\b/i,            // go/py/rb style foo_test.go
  /\b[A-Z]\w*Test(s)?\.(java|kt|cs|swift)\b/,         // jvm/dotnet FooTest.java
  /\b(test_\w+\.py)\b/i,                              // python test_foo.py
  /\b(?:adds?|updates?|fixes?)\s+(?:unit\s+|integration\s+|e2e\s+)?tests?\b/i,
  /\bregression\s+tests?\b/i,
]

function classifyCommit(message: string): UsageCategory {
  const firstLine = message.split('\n')[0].trim()
  for (const [pattern, category] of PREFIX_MAP) {
    if (pattern.test(firstLine)) return category
  }
  return 'feature'
}

function hasTestMention(message: string): boolean {
  return TEST_FILE_MENTION_PATTERNS.some((re) => re.test(message))
}

const ALL_CATEGORIES: UsageCategory[] = ['feature', 'bugfix', 'test', 'refactor']

export function analyzeUsage(
  aiCommits: GitHubCommit[],
): UsageAnalysis {
  const counts = new Map<UsageCategory, number>(
    ALL_CATEGORIES.map((c) => [c, 0]),
  )

  for (const commit of aiCommits) {
    const prefixCat = classifyCommit(commit.message)
    // If commit message mentions test file paths but prefix says otherwise, count as test
    const cat = prefixCat !== 'test' && hasTestMention(commit.message)
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
