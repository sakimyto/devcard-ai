# Usage-Centric Card Redesign

## Goal

Redesign the devcard from "how much AI is used" (quantity) to "what AI tools are used and how" (quality). The card should answer: what AI tools does this developer use, for what purposes, and in what languages.

## Card Structure (400px wide, ~286px tall)

### Header (y=0..68)
- Username (18px bold)
- Subtitle: "AI Dev Card · {Pattern}" where Pattern = collaboration style
- Grade badge (top-right, 38x38px rounded square)
- Separator gradient line

### Module: Tools (y=72..126)
- Label: "TOOLS" (10px uppercase, #6e7681)
- Stacked horizontal bar (352px wide, 20px tall, rounded)
- Each segment = one AI tool with gradient fill and "Name XX%" label
- Segments sized proportionally to AI commit count per tool

### Module: Usage (y=130..240)
- Label: "USAGE" (10px uppercase)
- Left: SVG donut chart (r=32, stroke-width=10)
  - Center text: total AI commit count + "commits"
  - 4 segments: Feature (green), Bug Fix (red), Test (yellow), Refactor (blue)
- Right of donut: legend with colored dots, category names, and percentages
- Far right column: "LANGUAGES" label + language pill badges (top 3)

### Footer (y=250..286)
- "devcard-ai" centered, 9px

## Modules Removed

| Module | Reason |
|--------|--------|
| Style (TDD Architect etc.) | Replaced by Pattern in header subtitle |
| Coauthor (AI rate %) | Integrated into Tools bar (implicit from total) |
| Heatmap (hourly activity) | Out of scope for "what/how" purpose |
| Score (standalone) | Kept as grade badge in header only |

## New Analyzers

### 1. Tool Attribution Analyzer (`analyzers/toolAttribution.ts`)

Classify each AI commit by which tool produced it, based on Co-Authored-By trailer.

**Input**: `GitHubCommit[]` (pre-filtered to AI commits only)

**Detection rules** (ordered by specificity):
- `@anthropic.com` or `claude` in co-author → `claude`
- `copilot` in co-author → `copilot`
- `cursor` in co-author → `cursor`
- `[bot]` author login → known bot mapping:
  - `copilot-for-prs[bot]` → `copilot`
  - `devin-ai-integration[bot]`, `devin-ai[bot]` → `devin`
  - `sweep-ai[bot]` → `sweep`
  - Other `[bot]` → `unknown`
- Fallback → `unknown`

**Output**:
```ts
interface ToolAttribution {
  toolId: string      // e.g. "claude", "cursor", "copilot"
  toolName: string    // e.g. "Claude", "Cursor"
  commitCount: number
  percentage: number  // 0-100
}
interface ToolAttributionAnalysis {
  tools: ToolAttribution[]  // sorted by commitCount desc
  totalAiCommits: number
}
```

### 2. Usage Category Analyzer (`analyzers/usage.ts`)

Classify AI commits by purpose using conventional commit prefixes.

**Input**: `GitHubCommit[]` (pre-filtered to AI commits only)

**Classification rules**:
- `feat:` or `feature:` → Feature
- `fix:` or `bugfix:` or `hotfix:` → Bug Fix
- `test:` or `spec:` → Test
- `refactor:` or `chore:` or `style:` or `ci:` or `build:` → Refactor
- `docs:` → Docs (grouped into Refactor for display)
- No matching prefix → Feature (default, as most code generation is feature work)

**Output**:
```ts
type UsageCategory = 'feature' | 'bugfix' | 'test' | 'refactor'
interface UsageCategoryData {
  category: UsageCategory
  count: number
  percentage: number  // 0-100
}
interface UsageAnalysis {
  categories: UsageCategoryData[]  // sorted by count desc
  totalCommits: number
}
```

### 3. Language Analyzer (`analyzers/languages.ts`)

Identify languages used in AI-enabled repositories.

**Input**: `GitHubRepo[]` (needs `primaryLanguage` added to GraphQL query)

**Logic**: Count repos per language where AI tool config is detected. Return top 3.

**Output**:
```ts
interface LanguageData {
  name: string        // e.g. "TypeScript"
  color: string       // GitHub's language color
  repoCount: number
}
interface LanguageAnalysis {
  languages: LanguageData[]  // top 3, sorted by repoCount desc
}
```

### 4. Collaboration Pattern Analyzer (`analyzers/pattern.ts`)

Determine how the developer collaborates with AI.

**Input**: `GitHubCommit[]` (all commits, sorted by `committedDate` ascending before analysis), `number` (AI commit count)

**Classification**:
- AI rate >= 60% → "AI Native"
- AI rate 30-60% AND commits alternate human/AI frequently → "Pair Programmer"
- AI rate 30-60% AND commits cluster (batches of AI then batches of human) → "Delegator"
- AI rate < 30% → "Selective User"

"Alternation score": for each consecutive pair of commits, count how often the AI-ness flips. High alternation = pair programming pattern.

**Output**:
```ts
type PatternType = 'AI Native' | 'Pair Programmer' | 'Delegator' | 'Selective User'
interface PatternAnalysis {
  pattern: PatternType
  aiRate: number  // 0-1
  alternationScore: number  // 0-1
}
```

## Type Definition Changes

### `GitHubRepo` (types.ts)
Add field:
```ts
primaryLanguage: { name: string; color: string } | null
```

### `CardData` (analyzers/types.ts)
Replace:
```ts
// Remove: coauthor, tools, style, heatmap
// Keep: username, score
// Add:
interface CardData {
  username: string
  score: ScoreAnalysis
  toolAttribution: ToolAttributionAnalysis
  usage: UsageAnalysis
  languages: LanguageAnalysis
  pattern: PatternAnalysis
}
```

## GraphQL Query Changes

Add `primaryLanguage` to the repository query:

```graphql
primaryLanguage {
  name
  color
}
```

## SVG Module Changes

### New: `modules/toolsBar.ts`
Renders the stacked horizontal bar with gradient fills per tool.

### New: `modules/usage.ts`
Renders the donut chart + legend + languages section.

### Removed: `modules/style.ts`, `modules/tools.ts`, `modules/coauthor.ts`, `modules/heatmap.ts`, `modules/score.ts`

### Modified: `card.ts`
- Default modules: `['toolsBar', 'usage']`
- Update `MODULE_HEIGHTS`
- Add pattern text to header subtitle
- Remove old module imports

## Theme Additions

Add to `Theme` interface:
```ts
// Tool-specific colors (used in stacked bar gradients)
toolColors: Record<string, [string, string]>  // [start, end] gradient

// Usage category colors
usageColors: {
  feature: string
  bugfix: string
  test: string
  refactor: string
}
```

## Data Flow

```
GitHub API → fetchUserData (+ primaryLanguage)
  → allCommits
  → isAiCommit filter → aiCommits
    → analyzeToolAttribution(aiCommits)  → ToolAttributionAnalysis
    → analyzeUsage(aiCommits)            → UsageAnalysis
    → analyzePattern(allCommits, aiCommitCount) → PatternAnalysis
  → analyzeLanguages(repos)              → LanguageAnalysis
  → analyzeScore(toolAttribution, usage, hasRecentActivity) → ScoreAnalysis
  → renderCard(cardData)
```

## Backward Compatibility

- `?modules=` parameter: old module names (`style`, `coauthor`, `heatmap`) become no-ops
- New default modules: `toolsBar`, `usage`
- `?modules=score` still works (opt-in legacy score module)

## Test Strategy

Each new analyzer requires a test file under `tests/analyzers/`:

| Analyzer | Test file | Key edge cases |
|----------|-----------|----------------|
| toolAttribution | `toolAttribution.test.ts` | 0 commits → empty tools array; all commits from same tool; unknown co-author format |
| usage | `usage.test.ts` | 0 commits → all categories 0%; no conventional prefix → defaults to feature; single category 100% |
| languages | `languages.test.ts` | No repos with AI config → empty; all repos same language; repos with null primaryLanguage |
| pattern | `pattern.test.ts` | 0 AI commits → Selective User; 100% AI → AI Native; alternation score boundary at 0.5 |

Division-by-zero guard: all percentage calculations must handle `totalCommits === 0`.

Existing tests for removed analyzers (`coauthor.test.ts`, `heatmap.test.ts`) should be deleted. `score.test.ts` needs updating to reflect new inputs.

## Visual Reference

See `.superpowers/brainstorm/793-1773725227/design-clean.html` for the SVG mockup.
