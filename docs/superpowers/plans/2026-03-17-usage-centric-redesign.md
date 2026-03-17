# Usage-Centric Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign devcard from quantity-focused ("how much AI") to quality-focused ("what AI tools, for what purpose, in what languages").

**Architecture:** Replace 4 old analyzers (coauthor, style, heatmap, tools) with 4 new ones (toolAttribution, usage, languages, pattern). Replace 5 SVG modules with 2 new ones (toolsBar, usage). Update GraphQL query to fetch `primaryLanguage`. Adapt score analyzer to new inputs.

**Tech Stack:** TypeScript, Cloudflare Workers, Vitest, SVG generation

**Spec:** `docs/superpowers/specs/2026-03-17-usage-centric-redesign.md`

---

## Chunk 1: Types, GraphQL, and New Analyzers

### Task 1: Update types and GraphQL query

**Files:**
- Modify: `src/github/types.ts`
- Modify: `src/github/queries.ts`
- Modify: `src/analyzers/types.ts`

- [ ] **Step 1: Add `primaryLanguage` to `GitHubRepo` type**

```ts
// src/github/types.ts — add after claudeDir field:
primaryLanguage: { name: string; color: string } | null;
```

- [ ] **Step 2: Add `primaryLanguage` to GraphQL query**

```ts
// src/github/queries.ts — add after claudeDir line (before closing `}` of nodes):
primaryLanguage { name color }
```

- [ ] **Step 3: Add new analysis types to `src/analyzers/types.ts`**

Replace the file contents. Keep `ScoreAnalysis` (update breakdown). Add `ToolAttributionAnalysis`, `UsageAnalysis`, `LanguageAnalysis`, `PatternAnalysis`. Update `CardData`.

```ts
// === Score ===
export interface ScoreAnalysis {
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  points: number
  breakdown: {
    hasTools: boolean
    multipleTools: boolean
    activeAiCommits: boolean
    recentActivity: boolean
  }
}

// === Tool Attribution ===
export interface ToolAttribution {
  toolId: string
  toolName: string
  commitCount: number
  percentage: number
}
export interface ToolAttributionAnalysis {
  tools: ToolAttribution[]
  totalAiCommits: number
}

// === Usage ===
export type UsageCategory = 'feature' | 'bugfix' | 'test' | 'refactor'
export interface UsageCategoryData {
  category: UsageCategory
  count: number
  percentage: number
}
export interface UsageAnalysis {
  categories: UsageCategoryData[]
  totalCommits: number
}

// === Languages ===
export interface LanguageData {
  name: string
  color: string
  repoCount: number
}
export interface LanguageAnalysis {
  languages: LanguageData[]
}

// === Pattern ===
export type PatternType = 'AI Native' | 'Pair Programmer' | 'Delegator' | 'Selective User'
export interface PatternAnalysis {
  pattern: PatternType
  aiRate: number
  alternationScore: number
}

// === Card Data ===
export interface CardData {
  username: string
  score: ScoreAnalysis
  toolAttribution: ToolAttributionAnalysis
  usage: UsageAnalysis
  languages: LanguageAnalysis
  pattern: PatternAnalysis
}
```

- [ ] **Step 4: Update mock data in `tests/github/client.test.ts`**

Add `primaryLanguage: { name: 'TypeScript', color: '#3178c6' }` to repo mock objects. Run `bun test tests/github/client.test.ts` — should pass.

- [ ] **Step 5: Commit**

```bash
git add src/github/types.ts src/github/queries.ts src/analyzers/types.ts tests/github/client.test.ts
git commit -m "feat: update types and GraphQL for usage-centric redesign"
```

---

### Task 2: Tool Attribution Analyzer (TDD)

**Files:**
- Create: `src/analyzers/toolAttribution.ts`
- Create: `tests/analyzers/toolAttribution.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/analyzers/toolAttribution.test.ts
import { describe, expect, it } from 'vitest'
import { analyzeToolAttribution } from '~/analyzers/toolAttribution'
import type { GitHubCommit } from '~/github/types'

const commit = (message: string, login: string | null = 'user'): GitHubCommit => ({
  message,
  committedDate: '2026-03-14T10:00:00Z',
  author: { user: login ? { login } : null },
})

describe('analyzeToolAttribution', () => {
  it('returns empty tools for empty commits', () => {
    const result = analyzeToolAttribution([])
    expect(result.tools).toEqual([])
    expect(result.totalAiCommits).toBe(0)
  })

  it('attributes claude from @anthropic.com co-author', () => {
    const commits = [
      commit('feat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>'),
      commit('fix: y\n\nCo-Authored-By: Claude <noreply@anthropic.com>'),
    ]
    const result = analyzeToolAttribution(commits)
    expect(result.tools).toHaveLength(1)
    expect(result.tools[0].toolId).toBe('claude')
    expect(result.tools[0].commitCount).toBe(2)
    expect(result.tools[0].percentage).toBe(100)
  })

  it('attributes copilot from copilot keyword', () => {
    const commits = [
      commit('feat: x\n\nCo-Authored-By: copilot <copilot@github.com>'),
    ]
    const result = analyzeToolAttribution(commits)
    expect(result.tools[0].toolId).toBe('copilot')
  })

  it('splits attribution across multiple tools', () => {
    const commits = [
      commit('feat: a\n\nCo-Authored-By: Claude <noreply@anthropic.com>'),
      commit('feat: b\n\nCo-Authored-By: Claude <noreply@anthropic.com>'),
      commit('feat: c\n\nCo-Authored-By: copilot <copilot@github.com>'),
    ]
    const result = analyzeToolAttribution(commits)
    expect(result.tools).toHaveLength(2)
    expect(result.tools[0].toolId).toBe('claude')
    expect(result.tools[0].percentage).toBeCloseTo(66.7, 0)
    expect(result.tools[1].toolId).toBe('copilot')
  })

  it('handles bot login attribution', () => {
    const commits = [commit('fix: x', 'devin-ai[bot]')]
    const result = analyzeToolAttribution(commits)
    expect(result.tools[0].toolId).toBe('devin')
  })

  it('falls back to unknown for unrecognized patterns', () => {
    const commits = [commit('feat: mystery AI commit')]
    const result = analyzeToolAttribution(commits)
    expect(result.tools[0].toolId).toBe('unknown')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/analyzers/toolAttribution.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement analyzer**

```ts
// src/analyzers/toolAttribution.ts
import type { GitHubCommit } from '~/github/types'
import type { ToolAttribution, ToolAttributionAnalysis } from './types'

const TOOL_NAMES: Record<string, string> = {
  claude: 'Claude',
  copilot: 'Copilot',
  cursor: 'Cursor',
  devin: 'Devin',
  sweep: 'Sweep',
  unknown: 'Other',
}

const BOT_TOOL_MAP: Record<string, string> = {
  'copilot-for-prs[bot]': 'copilot',
  'devin-ai-integration[bot]': 'devin',
  'devin-ai[bot]': 'devin',
  'sweep-ai[bot]': 'sweep',
}

function attributeTool(commit: GitHubCommit): string {
  const msg = commit.message.toLowerCase()
  const login = commit.author?.user?.login ?? ''

  // Bot login check
  if (login && BOT_TOOL_MAP[login]) return BOT_TOOL_MAP[login]
  if (login.endsWith('[bot]')) return 'unknown'

  // Co-author trailer check
  if (msg.includes('@anthropic.com') || /co-authored-by:.*\bclaude\b/i.test(msg)) return 'claude'
  if (/co-authored-by:.*\bcopilot\b/i.test(msg)) return 'copilot'
  if (/co-authored-by:.*\bcursor\b/i.test(msg)) return 'cursor'

  return 'unknown'
}

export function analyzeToolAttribution(aiCommits: GitHubCommit[]): ToolAttributionAnalysis {
  if (aiCommits.length === 0) {
    return { tools: [], totalAiCommits: 0 }
  }

  const counts = new Map<string, number>()
  for (const commit of aiCommits) {
    const toolId = attributeTool(commit)
    counts.set(toolId, (counts.get(toolId) ?? 0) + 1)
  }

  const total = aiCommits.length
  const tools: ToolAttribution[] = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([toolId, count]) => ({
      toolId,
      toolName: TOOL_NAMES[toolId] ?? toolId,
      commitCount: count,
      percentage: Math.round((count / total) * 1000) / 10,
    }))

  return { tools, totalAiCommits: total }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/analyzers/toolAttribution.test.ts`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/analyzers/toolAttribution.ts tests/analyzers/toolAttribution.test.ts
git commit -m "feat: add tool attribution analyzer with tests"
```

---

### Task 3: Usage Category Analyzer (TDD)

**Files:**
- Create: `src/analyzers/usage.ts`
- Create: `tests/analyzers/usage.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/analyzers/usage.test.ts
import { describe, expect, it } from 'vitest'
import { analyzeUsage } from '~/analyzers/usage'
import type { GitHubCommit } from '~/github/types'

const commit = (message: string): GitHubCommit => ({
  message,
  committedDate: '2026-03-14T10:00:00Z',
  author: { user: { login: 'user' } },
})

describe('analyzeUsage', () => {
  it('returns zero categories for empty commits', () => {
    const result = analyzeUsage([])
    expect(result.totalCommits).toBe(0)
    expect(result.categories.every((c) => c.count === 0)).toBe(true)
  })

  it('classifies feat: as feature', () => {
    const result = analyzeUsage([commit('feat: add login')])
    const feat = result.categories.find((c) => c.category === 'feature')
    expect(feat?.count).toBe(1)
    expect(feat?.percentage).toBe(100)
  })

  it('classifies fix: as bugfix', () => {
    const result = analyzeUsage([commit('fix: null check')])
    expect(result.categories.find((c) => c.category === 'bugfix')?.count).toBe(1)
  })

  it('classifies test: as test', () => {
    const result = analyzeUsage([commit('test: add unit tests')])
    expect(result.categories.find((c) => c.category === 'test')?.count).toBe(1)
  })

  it('classifies refactor/chore/docs into refactor', () => {
    const commits = [
      commit('refactor: extract fn'),
      commit('chore: update deps'),
      commit('docs: update readme'),
    ]
    const result = analyzeUsage(commits)
    expect(result.categories.find((c) => c.category === 'refactor')?.count).toBe(3)
  })

  it('defaults to feature for no prefix', () => {
    const result = analyzeUsage([commit('add new thing')])
    expect(result.categories.find((c) => c.category === 'feature')?.count).toBe(1)
  })

  it('sorts categories by count descending', () => {
    const commits = [
      commit('feat: a'), commit('feat: b'), commit('feat: c'),
      commit('fix: d'),
    ]
    const result = analyzeUsage(commits)
    expect(result.categories[0].category).toBe('feature')
    expect(result.categories[1].category).toBe('bugfix')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `bun test tests/analyzers/usage.test.ts`

- [ ] **Step 3: Implement analyzer**

```ts
// src/analyzers/usage.ts
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
  return 'feature' // default: most AI code generation is feature work
}

const ALL_CATEGORIES: UsageCategory[] = ['feature', 'bugfix', 'test', 'refactor']

export function analyzeUsage(aiCommits: GitHubCommit[]): UsageAnalysis {
  const counts = new Map<UsageCategory, number>(
    ALL_CATEGORIES.map((c) => [c, 0]),
  )

  for (const commit of aiCommits) {
    const cat = classifyCommit(commit.message)
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
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `bun test tests/analyzers/usage.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/analyzers/usage.ts tests/analyzers/usage.test.ts
git commit -m "feat: add usage category analyzer with tests"
```

---

### Task 4: Language Analyzer (TDD)

**Files:**
- Create: `src/analyzers/languages.ts`
- Create: `tests/analyzers/languages.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/analyzers/languages.test.ts
import { describe, expect, it } from 'vitest'
import { analyzeLanguages } from '~/analyzers/languages'
import type { GitHubRepo } from '~/github/types'

const repo = (
  lang: { name: string; color: string } | null,
  hasAiConfig: boolean,
): GitHubRepo => ({
  name: 'test',
  pushedAt: '2026-03-14T00:00:00Z',
  defaultBranchRef: null,
  claudeMd: hasAiConfig ? { id: 'x' } : null,
  agentsMd: null,
  cursorrules: null,
  cursorrulesDir: null,
  githubCopilot: null,
  claudeDir: null,
  primaryLanguage: lang,
})

describe('analyzeLanguages', () => {
  it('returns empty for no AI repos', () => {
    const result = analyzeLanguages([repo({ name: 'TypeScript', color: '#3178c6' }, false)])
    expect(result.languages).toEqual([])
  })

  it('returns language from AI-configured repo', () => {
    const result = analyzeLanguages([repo({ name: 'TypeScript', color: '#3178c6' }, true)])
    expect(result.languages).toHaveLength(1)
    expect(result.languages[0].name).toBe('TypeScript')
  })

  it('skips repos with null primaryLanguage', () => {
    const result = analyzeLanguages([repo(null, true)])
    expect(result.languages).toEqual([])
  })

  it('returns top 3 sorted by repo count', () => {
    const repos = [
      repo({ name: 'TypeScript', color: '#3178c6' }, true),
      repo({ name: 'TypeScript', color: '#3178c6' }, true),
      repo({ name: 'Go', color: '#00add8' }, true),
      repo({ name: 'Go', color: '#00add8' }, true),
      repo({ name: 'Go', color: '#00add8' }, true),
      repo({ name: 'Python', color: '#3572a5' }, true),
      repo({ name: 'Rust', color: '#dea584' }, true),
    ]
    const result = analyzeLanguages(repos)
    expect(result.languages).toHaveLength(3)
    expect(result.languages[0].name).toBe('Go')
    expect(result.languages[1].name).toBe('TypeScript')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `bun test tests/analyzers/languages.test.ts`

- [ ] **Step 3: Implement analyzer**

```ts
// src/analyzers/languages.ts
import type { GitHubRepo } from '~/github/types'
import type { LanguageAnalysis, LanguageData } from './types'

function hasAiConfig(repo: GitHubRepo): boolean {
  return !!(
    repo.claudeMd || repo.claudeDir || repo.cursorrules ||
    repo.cursorrulesDir || repo.githubCopilot || repo.agentsMd
  )
}

export function analyzeLanguages(repos: GitHubRepo[]): LanguageAnalysis {
  const counts = new Map<string, { color: string; count: number }>()

  for (const repo of repos) {
    if (!hasAiConfig(repo) || !repo.primaryLanguage) continue
    const { name, color } = repo.primaryLanguage
    const entry = counts.get(name)
    if (entry) {
      entry.count++
    } else {
      counts.set(name, { color, count: 1 })
    }
  }

  const languages: LanguageData[] = [...counts.entries()]
    .map(([name, { color, count }]) => ({ name, color, repoCount: count }))
    .sort((a, b) => b.repoCount - a.repoCount)
    .slice(0, 3)

  return { languages }
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `bun test tests/analyzers/languages.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/analyzers/languages.ts tests/analyzers/languages.test.ts
git commit -m "feat: add language analyzer with tests"
```

---

### Task 5: Pattern Analyzer (TDD)

**Files:**
- Create: `src/analyzers/pattern.ts`
- Create: `tests/analyzers/pattern.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/analyzers/pattern.test.ts
import { describe, expect, it } from 'vitest'
import { analyzePattern } from '~/analyzers/pattern'
import type { GitHubCommit } from '~/github/types'

const commit = (isAi: boolean, date: string): GitHubCommit => ({
  message: isAi ? 'feat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>' : 'manual commit',
  committedDate: date,
  author: { user: { login: 'user' } },
})

describe('analyzePattern', () => {
  it('returns Selective User for 0 AI commits', () => {
    const commits = [commit(false, '2026-03-14T10:00:00Z')]
    const result = analyzePattern(commits, 0)
    expect(result.pattern).toBe('Selective User')
    expect(result.aiRate).toBe(0)
  })

  it('returns AI Native for >= 60% AI rate', () => {
    const commits = [
      commit(true, '2026-03-14T10:00:00Z'),
      commit(true, '2026-03-14T11:00:00Z'),
      commit(true, '2026-03-14T12:00:00Z'),
      commit(false, '2026-03-14T13:00:00Z'),
    ]
    const result = analyzePattern(commits, 3)
    expect(result.pattern).toBe('AI Native')
  })

  it('returns Pair Programmer for alternating AI/human commits', () => {
    const commits = [
      commit(true, '2026-03-14T10:00:00Z'),
      commit(false, '2026-03-14T10:05:00Z'),
      commit(true, '2026-03-14T10:10:00Z'),
      commit(false, '2026-03-14T10:15:00Z'),
      commit(true, '2026-03-14T10:20:00Z'),
      commit(false, '2026-03-14T10:25:00Z'),
    ]
    const result = analyzePattern(commits, 3)
    expect(result.pattern).toBe('Pair Programmer')
    expect(result.alternationScore).toBeGreaterThan(0.5)
  })

  it('returns Delegator for clustered AI commits', () => {
    // 3 AI then 3 human = low alternation
    const commits = [
      commit(true, '2026-03-14T10:00:00Z'),
      commit(true, '2026-03-14T10:01:00Z'),
      commit(true, '2026-03-14T10:02:00Z'),
      commit(false, '2026-03-14T11:00:00Z'),
      commit(false, '2026-03-14T11:01:00Z'),
      commit(false, '2026-03-14T11:02:00Z'),
    ]
    const result = analyzePattern(commits, 3)
    expect(result.pattern).toBe('Delegator')
    expect(result.alternationScore).toBeLessThanOrEqual(0.5)
  })

  it('returns Selective User for < 30% AI rate', () => {
    const commits = [
      commit(true, '2026-03-14T10:00:00Z'),
      commit(false, '2026-03-14T11:00:00Z'),
      commit(false, '2026-03-14T12:00:00Z'),
      commit(false, '2026-03-14T13:00:00Z'),
      commit(false, '2026-03-14T14:00:00Z'),
    ]
    const result = analyzePattern(commits, 1)
    expect(result.pattern).toBe('Selective User')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `bun test tests/analyzers/pattern.test.ts`

- [ ] **Step 3: Implement analyzer**

```ts
// src/analyzers/pattern.ts
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

  // Sort by date ascending for alternation analysis
  const sorted = [...allCommits].sort(
    (a, b) => new Date(a.committedDate).getTime() - new Date(b.committedDate).getTime(),
  )

  // Calculate alternation score: how often does AI-ness flip between consecutive commits?
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
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `bun test tests/analyzers/pattern.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/analyzers/pattern.ts tests/analyzers/pattern.test.ts
git commit -m "feat: add collaboration pattern analyzer with tests"
```

---

## Chunk 2: Theme, SVG Modules, Card, Handler, and Cleanup

### Task 6: Update Theme

**Files:**
- Modify: `src/svg/themes.ts`

- [ ] **Step 1: Add `toolColors` and `usageColors` to Theme interface and both theme objects**

```ts
// Add to Theme interface:
toolColors: Record<string, [string, string]>
usageColors: {
  feature: string
  bugfix: string
  test: string
  refactor: string
}

// light theme additions:
toolColors: {
  claude: ['#d4a574', '#c4956a'],
  copilot: ['#6e7681', '#5a6069'],
  cursor: ['#00b4d8', '#0096b7'],
  devin: ['#a371f7', '#8957e5'],
  sweep: ['#3fb950', '#2ea043'],
  unknown: ['#8b949e', '#6e7681'],
},
usageColors: {
  feature: '#2ea043',
  bugfix: '#cf222e',
  test: '#9a6700',
  refactor: '#0969da',
},

// dark theme additions:
toolColors: {
  claude: ['#d4a574', '#c4956a'],
  copilot: ['#6e7681', '#5a6069'],
  cursor: ['#00b4d8', '#0096b7'],
  devin: ['#a371f7', '#8957e5'],
  sweep: ['#3fb950', '#2ea043'],
  unknown: ['#8b949e', '#6e7681'],
},
usageColors: {
  feature: '#3fb950',
  bugfix: '#f47067',
  test: '#d29922',
  refactor: '#58a6ff',
},
```

- [ ] **Step 2: Run existing theme tests**

Run: `bun test tests/svg` — check nothing breaks

- [ ] **Step 3: Commit**

```bash
git add src/svg/themes.ts
git commit -m "feat: add tool and usage colors to theme"
```

---

### Task 7: New SVG Module — Tools Bar

**Files:**
- Create: `src/svg/modules/toolsBar.ts`
- Create: `tests/svg/modules/toolsBar.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/svg/modules/toolsBar.test.ts
import { describe, expect, it } from 'vitest'
import { renderToolsBarModule } from '~/svg/modules/toolsBar'
import { getTheme } from '~/svg/themes'
import type { ToolAttributionAnalysis } from '~/analyzers/types'

describe('renderToolsBarModule', () => {
  const theme = getTheme('dark')

  it('renders stacked bar with tool segments', () => {
    const data: ToolAttributionAnalysis = {
      tools: [
        { toolId: 'claude', toolName: 'Claude', commitCount: 7, percentage: 70 },
        { toolId: 'cursor', toolName: 'Cursor', commitCount: 3, percentage: 30 },
      ],
      totalAiCommits: 10,
    }
    const svg = renderToolsBarModule(data, theme, 80)
    expect(svg).toContain('TOOLS')
    expect(svg).toContain('Claude')
    expect(svg).toContain('Cursor')
    expect(svg).toContain('70%')
    expect(svg).toContain('clipPath')
  })

  it('renders single tool at full width', () => {
    const data: ToolAttributionAnalysis = {
      tools: [{ toolId: 'claude', toolName: 'Claude', commitCount: 5, percentage: 100 }],
      totalAiCommits: 5,
    }
    const svg = renderToolsBarModule(data, theme, 80)
    expect(svg).toContain('Claude')
    expect(svg).toContain('100%')
  })

  it('handles empty tools', () => {
    const data: ToolAttributionAnalysis = { tools: [], totalAiCommits: 0 }
    const svg = renderToolsBarModule(data, theme, 80)
    expect(svg).toContain('No tools detected')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

- [ ] **Step 3: Implement module**

Create `src/svg/modules/toolsBar.ts` that renders:
- "TOOLS" label at (24, yOffset+12)
- Stacked bar at (24, yOffset+18) width 352 height 20 rx 10
- Use clipPath for rounded corners on the bar
- Each segment: gradient fill from `theme.toolColors[toolId]`, centered "Name XX%" text

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/svg/modules/toolsBar.ts tests/svg/modules/toolsBar.test.ts
git commit -m "feat: add tools bar SVG module with tests"
```

---

### Task 8: New SVG Module — Usage (Donut + Languages)

**Files:**
- Create: `src/svg/modules/usage.ts`
- Create: `tests/svg/modules/usage.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/svg/modules/usage.test.ts
import { describe, expect, it } from 'vitest'
import { renderUsageModule } from '~/svg/modules/usage'
import { getTheme } from '~/svg/themes'
import type { UsageAnalysis, LanguageAnalysis } from '~/analyzers/types'

describe('renderUsageModule', () => {
  const theme = getTheme('dark')
  const usage: UsageAnalysis = {
    categories: [
      { category: 'feature', count: 4, percentage: 40 },
      { category: 'bugfix', count: 3, percentage: 30 },
      { category: 'test', count: 2, percentage: 20 },
      { category: 'refactor', count: 1, percentage: 10 },
    ],
    totalCommits: 10,
  }
  const languages: LanguageAnalysis = {
    languages: [
      { name: 'TypeScript', color: '#3178c6', repoCount: 3 },
      { name: 'Go', color: '#00add8', repoCount: 1 },
    ],
  }

  it('renders donut chart with categories', () => {
    const svg = renderUsageModule(usage, languages, theme, 130)
    expect(svg).toContain('USAGE')
    expect(svg).toContain('Feature')
    expect(svg).toContain('Bug Fix')
    expect(svg).toContain('circle')
  })

  it('renders language badges', () => {
    const svg = renderUsageModule(usage, languages, theme, 130)
    expect(svg).toContain('LANGUAGES')
    expect(svg).toContain('TypeScript')
    expect(svg).toContain('Go')
  })

  it('renders center commit count', () => {
    const svg = renderUsageModule(usage, languages, theme, 130)
    expect(svg).toContain('>10<')
    expect(svg).toContain('commits')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

- [ ] **Step 3: Implement module**

Create `src/svg/modules/usage.ts` that renders:
- "USAGE" label at (24, yOffset+16)
- Donut chart: cx=76, cy=yOffset+62, r=32, stroke-width=10
  - Calculate `stroke-dasharray` and `stroke-dashoffset` from percentages
  - Circumference = 2 * PI * 32 = 201.06
  - Center: commit count (14px bold) + "commits" (8px)
- Legend: 4 rows right of donut at x=134, color dots + category name + percentage
- "LANGUAGES" label at x=284, yOffset+16
- Language pills: rect with rounded corners + colored text

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/svg/modules/usage.ts tests/svg/modules/usage.test.ts
git commit -m "feat: add usage donut + languages SVG module with tests"
```

---

### Task 9: Update Score Analyzer, Card, and Handler

**Files:**
- Modify: `src/analyzers/score.ts`
- Modify: `src/svg/card.ts`
- Modify: `src/handler.ts`
- Modify: `api/index.ts`
- Modify: `tests/handler.test.ts`
- Modify: `tests/analyzers/score.test.ts`
- Modify: `tests/svg/card.test.ts`

- [ ] **Step 1: Update score analyzer to accept new inputs**

```ts
// src/analyzers/score.ts
import type { ScoreAnalysis, ToolAttributionAnalysis, UsageAnalysis } from './types'

export function analyzeScore(
  toolAttribution: ToolAttributionAnalysis,
  usage: UsageAnalysis,
  hasRecentActivity: boolean,
): ScoreAnalysis {
  const hasTools = toolAttribution.tools.length > 0
  const multipleTools = toolAttribution.tools.length >= 2
  const activeAiCommits = toolAttribution.totalAiCommits > 0
    && (toolAttribution.totalAiCommits / Math.max(usage.totalCommits, 1)) > 0.1
  const recentActivity = hasRecentActivity

  let points = 0
  if (hasTools) points += 25
  if (multipleTools) points += 20
  if (activeAiCommits) points += Math.min(35, Math.round(
    (toolAttribution.totalAiCommits / Math.max(usage.totalCommits, 1)) * 70,
  ))
  if (recentActivity) points += 20

  const grade = gradeFromPoints(points)
  return { grade, points, breakdown: { hasTools, multipleTools, activeAiCommits, recentActivity } }
}
```

- [ ] **Step 2: Update card.ts**

- Replace default modules: `['toolsBar', 'usage']`
- Update `MODULE_HEIGHTS`: `{ toolsBar: 50, usage: 110 }`
- Import new modules, remove old imports
- Add pattern text to header subtitle: `"AI Dev Card · {pattern.pattern}"`
- Update switch/case for new module names

- [ ] **Step 3: Update handler.ts**

- Import new analyzers (toolAttribution, usage, languages, pattern)
- Remove old analyzer imports (style, heatmap; keep coauthor for `isAiCommit`)
- Build new `CardData` shape
- Pass `aiCommits` to `analyzeToolAttribution` and `analyzeUsage`
- Call `analyzeLanguages(repos)` and `analyzePattern(allCommits, aiCommits.length)`
- Update "no AI activity" check: `toolAttribution.totalAiCommits === 0`

- [ ] **Step 4: Update api/index.ts**

- Update `VALID_MODULES` derivation (still from `MODULE_HEIGHTS` keys — already dynamic)

- [ ] **Step 5: Update tests**

- `tests/analyzers/score.test.ts`: update to use new inputs
- `tests/handler.test.ts`: update mock data to include `primaryLanguage`, update assertions
- `tests/svg/card.test.ts`: update for new module names and CardData shape

- [ ] **Step 6: Run all tests**

Run: `bun test`
Expected: all PASS

- [ ] **Step 7: Commit**

```bash
git add src/analyzers/score.ts src/svg/card.ts src/handler.ts api/index.ts \
  tests/analyzers/score.test.ts tests/handler.test.ts tests/svg/card.test.ts
git commit -m "feat: wire up usage-centric card with new analyzers and modules"
```

---

### Task 10: Delete Old Files

**Files:**
- Delete: `src/analyzers/style.ts`, `src/analyzers/heatmap.ts`, `src/analyzers/tools.ts`
- Delete: `src/svg/modules/style.ts`, `src/svg/modules/tools.ts`, `src/svg/modules/coauthor.ts`, `src/svg/modules/heatmap.ts`, `src/svg/modules/score.ts`
- Delete: `tests/analyzers/style.test.ts`, `tests/analyzers/heatmap.test.ts`, `tests/analyzers/tools.test.ts`, `tests/analyzers/coauthor.test.ts`
- Delete: `tests/svg/modules/style.test.ts`, `tests/svg/modules/tools.test.ts`, `tests/svg/modules/coauthor.test.ts`, `tests/svg/modules/heatmap.test.ts`, `tests/svg/modules/score.test.ts`

- [ ] **Step 1: Delete old analyzer files and their tests**

```bash
rm src/analyzers/style.ts src/analyzers/heatmap.ts src/analyzers/tools.ts
rm tests/analyzers/style.test.ts tests/analyzers/heatmap.test.ts tests/analyzers/tools.test.ts tests/analyzers/coauthor.test.ts
```

- [ ] **Step 2: Delete old SVG module files and their tests**

```bash
rm src/svg/modules/style.ts src/svg/modules/tools.ts src/svg/modules/coauthor.ts src/svg/modules/heatmap.ts src/svg/modules/score.ts
rm tests/svg/modules/style.test.ts tests/svg/modules/tools.test.ts tests/svg/modules/coauthor.test.ts tests/svg/modules/heatmap.test.ts tests/svg/modules/score.test.ts
```

- [ ] **Step 3: Run all tests to confirm nothing breaks**

Run: `bun test`
Expected: all PASS (fewer test files, same pass rate)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old analyzers and SVG modules"
```

---

### Task 11: Deploy and Verify

- [ ] **Step 1: Run full test suite one final time**

Run: `bun test`

- [ ] **Step 2: Deploy to Cloudflare Workers**

Run: `bunx wrangler deploy`

- [ ] **Step 3: Verify live card**

```bash
curl -s "https://devcard-ai.sakimyto.workers.dev/?user=sakimyto&theme=dark" -o /tmp/devcard-new.svg
```

Open `/tmp/devcard-new.svg` to verify the new design renders correctly.

- [ ] **Step 4: Commit and push**

```bash
git push
```
