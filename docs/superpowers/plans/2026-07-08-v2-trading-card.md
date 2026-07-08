# devcard-ai v2 Trading Card Edition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 現行の 400px ダッシュボード風カードを、レアリティ・アーキタイプ・ジェネラティブアートを備えた 750×1050 縦型トレーディングカード（v2）へ全面刷新し、検出精度・OGP フォント・キャッシュ耐障害・計測を同時に引き上げる。

**Architecture:** 分析層（純関数 analyzers）→ 描画層（SVG 文字列生成）→ 配信層（CF Workers, api/index.ts）の3層構造は維持。v2 レンダラは `src/svg/v2/` に新設し、最終タスクで旧レンダラを削除・置換する。全指標は「直近12週・公開リポ」窓に統一。キャッシュは KV による stale-if-error。

**Tech Stack:** TypeScript / Bun / Vitest / Cloudflare Workers / @resvg/resvg-wasm / @octokit/app / Biome

**Spec:** `docs/superpowers/specs/2026-07-08-v2-trading-card-design.md`（正本。判断に迷ったらスペックに従う）

## Global Constraints

- テスト実行: `bun run test`（= `vitest run`）。単一ファイルは `bunx vitest run tests/path/file.test.ts`
- typecheck: `bun run typecheck`、lint: `bun run lint`（Biome: single quotes / 2 spaces / 100 width / semicolons asNeeded）
- `any` 禁止。不明型は `unknown`
- パスエイリアス: `~` = `src/`（vitest.config.ts 設定済み）
- Workers 制約: cpu_ms=100（wrangler.toml）。モジュールスコープで `new Response()` 禁止
- 決定論: 全 analyzer・アート・フレーバーは同一入力→同一出力。`new Date()` は必ず引数注入（`now: Date = new Date()`）
- SVG 内テキストは必ず `escapeXml`（`src/svg/utils.ts`）経由
- コミットメッセージ末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` を付ける
- カード上の英語コピーは Title Case でなく Sentence case（`public · 12wk` 等は小文字固定）

## File Structure（最終形）

```text
src/
├── analyzers/
│   ├── aiPatterns.ts      # 新規: 検出パターン→toolId 単一テーブル（coauthor/toolAttribution が共参照）
│   ├── coauthor.ts        # 変更: aiPatterns へ委譲
│   ├── equipped.ts        # 新規: 設定ファイル由来の equipped tools
│   ├── stats.ts           # 新規: VELOCITY/DIVERSITY/CONSISTENCY + Grade（score.ts を置換）
│   ├── flavor.ts          # 新規: フレーバーテキスト（決定論）
│   ├── window.ts          # 新規: 12週窓フィルタ
│   ├── score.ts           # Task 7 で削除
│   └── (pattern/usage/languages/velocity/toolAttribution/badges.ts は現状維持)
├── card/
│   └── serial.ts          # 新規: fnv1a hash / シリアル / シード
├── svg/
│   ├── v2/
│   │   ├── frame.ts       # 新規: レアリティフレーム（S=Holo アニメ）
│   │   ├── emblem.ts      # 新規: アーキタイプ紋章
│   │   ├── art.ts         # 新規: ジェネラティブアート
│   │   ├── cardV2.ts      # 新規: 750×1050 レンダラ + placeholder カード
│   │   └── ogShare.ts     # 新規: 1200×630 横長シェア画像用 SVG
│   ├── card.ts            # Task 7 で renderErrorCard のみ残して縮小
│   └── modules/           # Task 7 で削除（badges/toolsBar/usage/velocity）
├── cache.ts               # 新規: KV stale-if-error
├── analytics.ts           # 新規: Analytics Engine 記録
├── handler.ts             # 変更: 12週窓 + v2 パイプライン
├── ogp.ts                 # 変更: fontBuffers + 1200×630
└── landing.ts             # 変更: トレカコンセプト LP
fonts/
├── inter-regular-subset.ttf  # 新規（Task 8 で生成）
└── inter-bold-subset.ttf     # 新規
```

各タスクは Red→Green→Commit を厳守。**タスク内の全ステップ完了ごとに必ずコミット**する。

---

### Task 1: 検出拡張 — 共有パターンモジュール aiPatterns.ts（検出↔ツール帰属の契約統一）

**Files:**
- Create: `src/analyzers/aiPatterns.ts`
- Modify: `src/analyzers/coauthor.ts`（aiPatterns へ委譲）
- Modify: `src/analyzers/toolAttribution.ts`（attributeTool を aiPatterns へ委譲）
- Create: `tests/analyzers/__fixtures__/commit-corpus.json`
- Modify: `tests/analyzers/coauthor.test.ts`, `tests/analyzers/toolAttribution.test.ts`（describe 追加のみ、既存テストは変更しない = 旧実装オラクル）

**Interfaces:**
- Produces: `detectAiSignal(message: string, authorLogin: string | null): { isAi: boolean; toolId: string }`（toolId は toolAttribution.ts の TOOL_NAMES キー体系。AI だがツール特定不能な正当ケースは `'unknown'`）
- 契約: **isAiCommit(m,a) === detectAiSignal(m,a).isAi** かつ **attributeTool(c) === detectAiSignal(c.message, c.author?.user?.login ?? null).toolId** — 検出とツール帰属が単一テーブル由来なので、新マーカー追加時に Loadout/DIVERSITY が unknown 落ちする契約不一致が構造的に起きない

- [ ] **Step 1: コーパス fixture を作成（expectedTool = 帰属の許容リスト）**

`tests/analyzers/__fixtures__/commit-corpus.json`（`expectedTool: "unknown"` が「正当な unknown」の明示的許容リスト）:

```json
[
  { "message": "feat: add parser\n\nCo-Authored-By: Claude <noreply@anthropic.com>", "authorLogin": null, "expected": true, "expectedTool": "claude", "note": "existing: claude trailer" },
  { "message": "fix(ci): retry\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>", "authorLogin": null, "expected": true, "expectedTool": "claude", "note": "existing: claude code footer" },
  { "message": "feat: dashboard\n\nGenerated with Cursor", "authorLogin": null, "expected": true, "expectedTool": "cursor", "note": "new: generated WITH + cursor 帰属" },
  { "message": "chore: bump deps", "authorLogin": "dependabot[bot]", "expected": true, "expectedTool": "unknown", "note": "existing: 正当な unknown（依存更新bot）" },
  { "message": "feat: onboarding flow\n\nCo-authored-by: Codex <codex@openai.com>", "authorLogin": null, "expected": true, "expectedTool": "codex", "note": "new: codex trailer" },
  { "message": "fix: null check\n\nCo-authored-by: Windsurf Agent <agent@codeium.com>", "authorLogin": null, "expected": true, "expectedTool": "windsurf", "note": "existing: codeium" },
  { "message": "docs: update readme\n\nCo-authored-by: Gemini <gemini@google.com>", "authorLogin": null, "expected": true, "expectedTool": "gemini", "note": "new: gemini trailer" },
  { "message": "refactor: split module\n\nCo-authored-by: Cody <cody@sourcegraph.com>", "authorLogin": null, "expected": true, "expectedTool": "cody", "note": "new: cody trailer" },
  { "message": "feat: search\n\nAssisted-by: GitHub Copilot", "authorLogin": null, "expected": true, "expectedTool": "copilot", "note": "new: Assisted-by trailer" },
  { "message": "fix: update readme", "authorLogin": "regularuser", "expected": false, "note": "human decoy" },
  { "message": "feat: pair work\n\nCo-Authored-By: John Smith <john@example.com>", "authorLogin": null, "expected": false, "note": "human coauthor decoy" },
  { "message": "feat: generated columns support in ORM", "authorLogin": null, "expected": false, "note": "decoy: 'generated' 単語だけでは検出しない" },
  { "message": "fix: robot arm control loop", "authorLogin": "robotics-dev", "expected": false, "note": "decoy: robot ≠ 🤖" },
  { "message": "perf: cache layer\n\nCommitted via Devin", "authorLogin": null, "expected": true, "expectedTool": "devin", "note": "new: via <agent> footer" },
  { "message": "feat: initial commit", "authorLogin": "copilot-swe-agent[bot]", "expected": true, "expectedTool": "copilot", "note": "existing: [bot] + copilot 帰属" },
  { "message": "feat: squash merge\n\nCo-authored-by: dev <12345+dev@users.noreply.github.com>", "authorLogin": null, "expected": true, "expectedTool": "unknown", "note": "existing: 正当な unknown（squash coauthor 規約）" }
]
```

- [ ] **Step 2: 失敗するコーパステスト（検出）を追加**

`tests/analyzers/coauthor.test.ts` の末尾に追加:

```typescript
import corpus from './__fixtures__/commit-corpus.json'

interface CorpusEntry {
  message: string
  authorLogin: string | null
  expected: boolean
  expectedTool?: string
  note: string
}

describe('isAiCommit corpus (oracle + new detections)', () => {
  for (const c of corpus as CorpusEntry[]) {
    it(`${c.note}: expected=${c.expected}`, () => {
      expect(isAiCommit(c.message, c.authorLogin)).toBe(c.expected)
    })
  }
})
```

- [ ] **Step 3: 失敗する契約テスト（帰属）を追加**

`tests/analyzers/toolAttribution.test.ts` の末尾に追加:

```typescript
import corpus from './__fixtures__/commit-corpus.json'
import type { GitHubCommit } from '~/github/types'

interface CorpusEntry {
  message: string
  authorLogin: string | null
  expected: boolean
  expectedTool?: string
  note: string
}

describe('detection ↔ attribution contract', () => {
  const entries = (corpus as CorpusEntry[]).filter((c) => c.expected)
  for (const c of entries) {
    it(`${c.note} → toolId=${c.expectedTool}`, () => {
      const commit: GitHubCommit = {
        oid: 'x',
        message: c.message,
        committedDate: '2026-07-01T00:00:00Z',
        author: { user: c.authorLogin ? { login: c.authorLogin } : null },
      }
      const result = analyzeToolAttribution([commit])
      expect(result.tools[0]?.toolId).toBe(c.expectedTool)
    })
  }
})
```

- [ ] **Step 4: 失敗を確認**

Run: `bunx vitest run tests/analyzers/coauthor.test.ts tests/analyzers/toolAttribution.test.ts`
Expected: FAIL — 検出側: generated WITH / codex / gemini / cody / Assisted-by / via Devin が落ちる。契約側: 現行 attributeTool に無いマーカー帰属（cursor の generated with 等）が unknown 落ちして失敗（= codex 指摘の契約不一致の再現）

- [ ] **Step 5: aiPatterns.ts を実装し、coauthor/toolAttribution を委譲に書き換え**

`src/analyzers/aiPatterns.ts`:

```typescript
export interface AiDetection {
  isAi: boolean
  toolId: string
}

interface Signal {
  pattern: RegExp
  toolId: string
}

// author login 由来のシグナル。順序が優先度（具体的な bot → 汎用 [bot]）
const BOT_SIGNALS: Signal[] = [
  { pattern: /^copilot-for-prs\[bot\]$/, toolId: 'copilot' },
  { pattern: /^copilot-swe-agent\[bot\]$/, toolId: 'copilot' },
  { pattern: /^devin-ai/, toolId: 'devin' },
  { pattern: /^sweep-ai/, toolId: 'sweep' },
  { pattern: /^dependabot/, toolId: 'unknown' },
  { pattern: /^renovate/, toolId: 'unknown' },
  { pattern: /^github-actions/, toolId: 'unknown' },
  { pattern: /\[bot\]$/, toolId: 'unknown' },
]

// メッセージ由来のシグナル。順序が優先度（ツール特定可能 → 汎用AIマーカー）。
// 検出パターンと toolId 帰属の単一テーブル — ここに追加すれば isAiCommit と
// attributeTool の両方に同時に効く（契約不一致の構造的排除）
const MESSAGE_SIGNALS: Signal[] = [
  { pattern: /@anthropic\.com|co-authored-by:.*\bclaude\b|assisted-by:.*\bclaude\b|generated with \[?claude( code)?\]?|via claude\b/i, toolId: 'claude' },
  { pattern: /@openai\.com|co-authored-by:.*\bcodex\b|via codex\b/i, toolId: 'codex' },
  { pattern: /co-authored-by:.*\bcopilot\b|assisted-by:.*\bcopilot\b/i, toolId: 'copilot' },
  { pattern: /co-authored-by:.*\bcursor\b|generated with cursor\b|via cursor\b/i, toolId: 'cursor' },
  { pattern: /co-authored-by:.*\b(windsurf|codeium)\b/i, toolId: 'windsurf' },
  { pattern: /@aider\.chat|co-authored-by:.*\baider\b|via aider\b/i, toolId: 'aider' },
  { pattern: /@sourcegraph\.com|co-authored-by:.*\b(cody|sourcegraph)\b/i, toolId: 'cody' },
  { pattern: /co-authored-by:.*\b(amazon-?q|amazonq)\b/i, toolId: 'amazonq' },
  { pattern: /@google\.com|co-authored-by:.*\bgemini\b|assisted-by:.*\bgemini\b/i, toolId: 'gemini' },
  { pattern: /co-authored-by:.*\bdevin\b|via devin\b/i, toolId: 'devin' },
  { pattern: /co-authored-by:.*\bsweep\b/i, toolId: 'sweep' },
  // ---- 汎用AIマーカー（AI とは判るがツール特定不能 = 正当な unknown）----
  { pattern: /co-authored-by:\s.*\d+\+[^@]+@users\.noreply\.github\.com/i, toolId: 'unknown' },
  { pattern: /co-authored-by:\s.*noreply@/i, toolId: 'unknown' },
  { pattern: /generated (by|with)/i, toolId: 'unknown' },
  { pattern: /\[ai\]/i, toolId: 'unknown' },
  { pattern: /🤖/, toolId: 'unknown' },
]

export function detectAiSignal(message: string, authorLogin: string | null): AiDetection {
  if (authorLogin) {
    for (const s of BOT_SIGNALS) {
      if (s.pattern.test(authorLogin)) return { isAi: true, toolId: s.toolId }
    }
  }
  for (const s of MESSAGE_SIGNALS) {
    if (s.pattern.test(message)) return { isAi: true, toolId: s.toolId }
  }
  return { isAi: false, toolId: 'unknown' }
}
```

`src/analyzers/coauthor.ts`: `AI_COAUTHOR_PATTERNS`/`AI_MESSAGE_PATTERNS`/`AI_BOT_PATTERNS` の3定数と `isAiCommit` 本体を削除し、委譲に置換（`analyzeCoauthor` は無変更）:

```typescript
import { detectAiSignal } from './aiPatterns'

export function isAiCommit(
	message: string,
	authorLogin: string | null,
): boolean {
	return detectAiSignal(message, authorLogin).isAi
}
```

`src/analyzers/toolAttribution.ts`: `BOT_TOOL_MAP` 定数と `attributeTool` 本体を削除し、委譲に置換（`TOOL_NAMES` と `analyzeToolAttribution` は無変更）:

```typescript
import { detectAiSignal } from './aiPatterns'

function attributeTool(commit: GitHubCommit): string {
  return detectAiSignal(commit.message, commit.author?.user?.login ?? null).toolId
}
```

- [ ] **Step 6: 全テストパスを確認（旧実装オラクル込み）**

Run: `bunx vitest run tests/analyzers/ && bun run typecheck`
Expected: 全 PASS。**既存の coauthor.test.ts / toolAttribution.test.ts の既存 describe が1つでも落ちたらデグレ** — fixture の expected を変えずテーブル側を直す

- [ ] **Step 7: Commit**

```bash
git add src/analyzers/aiPatterns.ts src/analyzers/coauthor.ts src/analyzers/toolAttribution.ts tests/analyzers/
git commit -m "feat(detect): 検出→帰属の単一テーブル aiPatterns + パターン拡張 + 契約テスト

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: equipped シグナル analyzer

**Files:**
- Create: `src/analyzers/equipped.ts`
- Create: `tests/analyzers/equipped.test.ts`
- Modify: `src/analyzers/types.ts`（型追加）

**Interfaces:**
- Consumes: `GitHubRepo`（`~/github/types`。claudeMd/agentsMd/cursorrules/cursorrulesDir/githubCopilot/claudeDir: `{id: string} | null`）
- Produces: `analyzeEquipped(repos: GitHubRepo[]): EquippedAnalysis`。`EquippedAnalysis = { equipped: EquippedTool[] }`, `EquippedTool = { toolId: string; toolName: string; repoCount: number }`（toolId は toolAttribution.ts の TOOL_NAMES キーと同一体系: claude/codex/cursor/copilot）

- [ ] **Step 1: 型を追加**

`src/analyzers/types.ts` の `// === Tool Attribution ===` 節の直後に追加:

```typescript
// === Equipped (config-file signals) ===
export interface EquippedTool {
	toolId: string
	toolName: string
	repoCount: number
}
export interface EquippedAnalysis {
	equipped: EquippedTool[]
}
```

- [ ] **Step 2: 失敗するテストを書く**

`tests/analyzers/equipped.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { analyzeEquipped } from '~/analyzers/equipped'
import type { GitHubRepo } from '~/github/types'

const repo = (over: Partial<GitHubRepo>): GitHubRepo => ({
  name: 'r',
  pushedAt: '2026-07-01T00:00:00Z',
  defaultBranchRef: null,
  claudeMd: null,
  agentsMd: null,
  cursorrules: null,
  cursorrulesDir: null,
  githubCopilot: null,
  claudeDir: null,
  primaryLanguage: null,
  ...over,
})

describe('analyzeEquipped', () => {
  it('maps config files to tools with repo counts, sorted desc', () => {
    const repos = [
      repo({ claudeMd: { id: '1' } }),
      repo({ claudeDir: { id: '2' } }),
      repo({ cursorrules: { id: '3' } }),
      repo({ agentsMd: { id: '4' }, githubCopilot: { id: '5' } }),
    ]
    const result = analyzeEquipped(repos)
    expect(result.equipped).toEqual([
      { toolId: 'claude', toolName: 'Claude', repoCount: 2 },
      { toolId: 'codex', toolName: 'Codex', repoCount: 1 },
      { toolId: 'copilot', toolName: 'Copilot', repoCount: 1 },
      { toolId: 'cursor', toolName: 'Cursor', repoCount: 1 },
    ])
  })

  it('counts claude once per repo even with both CLAUDE.md and .claude/', () => {
    const result = analyzeEquipped([repo({ claudeMd: { id: '1' }, claudeDir: { id: '2' } })])
    expect(result.equipped).toEqual([{ toolId: 'claude', toolName: 'Claude', repoCount: 1 }])
  })

  it('returns empty for no config files / empty repos', () => {
    expect(analyzeEquipped([repo({})]).equipped).toEqual([])
    expect(analyzeEquipped([]).equipped).toEqual([])
  })
})
```

- [ ] **Step 3: 失敗を確認**

Run: `bunx vitest run tests/analyzers/equipped.test.ts`
Expected: FAIL — "Cannot find module '~/analyzers/equipped'"

- [ ] **Step 4: 実装**

`src/analyzers/equipped.ts`:

```typescript
import type { GitHubRepo } from '~/github/types'
import type { EquippedAnalysis, EquippedTool } from './types'

const TOOL_LABELS: Record<string, string> = {
  claude: 'Claude',
  codex: 'Codex',
  cursor: 'Cursor',
  copilot: 'Copilot',
}

function toolsInRepo(repo: GitHubRepo): Set<string> {
  const tools = new Set<string>()
  if (repo.claudeMd || repo.claudeDir) tools.add('claude')
  if (repo.agentsMd) tools.add('codex')
  if (repo.cursorrules || repo.cursorrulesDir) tools.add('cursor')
  if (repo.githubCopilot) tools.add('copilot')
  return tools
}

export function analyzeEquipped(repos: GitHubRepo[]): EquippedAnalysis {
  const counts = new Map<string, number>()
  for (const repo of repos) {
    for (const toolId of toolsInRepo(repo)) {
      counts.set(toolId, (counts.get(toolId) ?? 0) + 1)
    }
  }
  const equipped: EquippedTool[] = [...counts.entries()]
    .map(([toolId, repoCount]) => ({ toolId, toolName: TOOL_LABELS[toolId], repoCount }))
    .sort((a, b) => b.repoCount - a.repoCount || a.toolId.localeCompare(b.toolId))
  return { equipped }
}
```

- [ ] **Step 5: パス確認 + Commit**

Run: `bunx vitest run tests/analyzers/equipped.test.ts` → PASS

```bash
git add src/analyzers/equipped.ts src/analyzers/types.ts tests/analyzers/equipped.test.ts
git commit -m "feat(detect): 設定ファイル由来の equipped tools analyzer

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 12週窓フィルタ + stats analyzer（score.ts 置換の準備）

**Files:**
- Create: `src/analyzers/window.ts`
- Create: `src/analyzers/stats.ts`
- Create: `tests/analyzers/window.test.ts`
- Create: `tests/analyzers/stats.test.ts`
- Modify: `src/analyzers/types.ts`

**Interfaces:**
- Consumes: `GitHubCommit`, `UsageAnalysis`（既存）
- Produces:
  - `filterToWindow(commits: GitHubCommit[], now: Date, days?: number): GitHubCommit[]`（default 84日）
  - `analyzeStats(input: StatsInput): StatsAnalysis`
  - `StatsInput = { windowAiCommits: GitHubCommit[]; commitToolCount: number; equippedOnlyCount: number; usage: UsageAnalysis; now?: Date }`
  - `StatsAnalysis = { velocity: number; diversity: number; consistency: number; points: number; grade: 'S'|'A'|'B'|'C'|'D'; aiCommitsInWindow: number; activeWeeks: number }`

**設計判断（データ取得との整合）**: データ取得は Task 7 で `history(first: 100, since: <12週前>)` に変更する。これにより取得100件は「窓内の per-repo 上限」となり、1リポジトリあたり窓内100コミットまで集計（超過分は切り捨て、pagination は導入しない = YAGNI）。`filterToWindow` は since が効かないケース（未来時刻・クロックずれ）への防御として残す。

- [ ] **Step 1: 型を追加**

`src/analyzers/types.ts` の `// === Score ===` 節の直後に追加（ScoreAnalysis はまだ消さない — Task 7 で削除）:

```typescript
// === Stats (v2) ===
export type Grade = 'S' | 'A' | 'B' | 'C' | 'D'
export interface StatsAnalysis {
	velocity: number // 0-100
	diversity: number // 0-100
	consistency: number // 0-100
	points: number // 0-100, V40/D30/C30
	grade: Grade
	aiCommitsInWindow: number
	activeWeeks: number // 0-12
}
```

- [ ] **Step 2: 失敗するテストを書く**

`tests/analyzers/window.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { filterToWindow } from '~/analyzers/window'
import type { GitHubCommit } from '~/github/types'

const NOW = new Date('2026-07-08T12:00:00Z')
const commit = (committedDate: string): GitHubCommit => ({
  oid: committedDate,
  message: 'feat: x',
  committedDate,
  author: { user: { login: 'u' } },
})

describe('filterToWindow', () => {
  it('keeps commits within 84 days, drops older and future', () => {
    const inside = commit('2026-07-01T00:00:00Z')
    const edge = commit('2026-04-16T00:00:00Z') // 83日前 → 含む
    const outside = commit('2026-04-14T00:00:00Z') // 85日前 → 除外
    const future = commit('2026-07-09T00:00:00Z')
    expect(filterToWindow([inside, edge, outside, future], NOW)).toEqual([inside, edge])
  })

  it('drops unparsable dates and handles empty input', () => {
    expect(filterToWindow([commit('not-a-date')], NOW)).toEqual([])
    expect(filterToWindow([], NOW)).toEqual([])
  })
})
```

`tests/analyzers/stats.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { analyzeStats } from '~/analyzers/stats'
import type { GitHubCommit } from '~/github/types'
import type { UsageAnalysis } from '~/analyzers/types'

const NOW = new Date('2026-07-08T12:00:00Z')

function commitsPerWeek(perWeek: number, weeks: number): GitHubCommit[] {
  const out: GitHubCommit[] = []
  for (let w = 0; w < weeks; w++) {
    for (let i = 0; i < perWeek; i++) {
      const d = new Date(NOW.getTime() - (w * 7 + 1) * 24 * 60 * 60 * 1000)
      out.push({
        oid: `c-${w}-${i}`,
        message: 'feat: x',
        committedDate: d.toISOString(),
        author: { user: { login: 'u' } },
      })
    }
  }
  return out
}

const evenUsage: UsageAnalysis = {
  categories: [
    { category: 'feature', count: 5, percentage: 25 },
    { category: 'bugfix', count: 5, percentage: 25 },
    { category: 'test', count: 5, percentage: 25 },
    { category: 'refactor', count: 5, percentage: 25 },
  ],
  totalCommits: 20,
}
const singleUsage: UsageAnalysis = {
  categories: [
    { category: 'feature', count: 20, percentage: 100 },
    { category: 'bugfix', count: 0, percentage: 0 },
    { category: 'test', count: 0, percentage: 0 },
    { category: 'refactor', count: 0, percentage: 0 },
  ],
  totalCommits: 20,
}

describe('analyzeStats', () => {
  it('zero commits → all-zero stats, grade D', () => {
    const s = analyzeStats({
      windowAiCommits: [],
      commitToolCount: 0,
      equippedOnlyCount: 0,
      usage: { categories: [], totalCommits: 0 },
      now: NOW,
    })
    expect(s).toEqual({
      velocity: 0,
      diversity: 0,
      consistency: 0,
      points: 0,
      grade: 'D',
      aiCommitsInWindow: 0,
      activeWeeks: 0,
    })
  })

  it('heavy consistent user with diverse tools/usage hits S', () => {
    const s = analyzeStats({
      windowAiCommits: commitsPerWeek(25, 12),
      commitToolCount: 3,
      equippedOnlyCount: 2,
      usage: evenUsage,
      now: NOW,
    })
    expect(s.velocity).toBe(100)
    expect(s.consistency).toBe(100)
    expect(s.diversity).toBe(100)
    expect(s.points).toBe(100)
    expect(s.grade).toBe('S')
    expect(s.activeWeeks).toBe(12)
  })

  it('monotone: more velocity never lowers points', () => {
    const base = {
      commitToolCount: 1,
      equippedOnlyCount: 0,
      usage: singleUsage,
      now: NOW,
    }
    const low = analyzeStats({ ...base, windowAiCommits: commitsPerWeek(1, 6) })
    const high = analyzeStats({ ...base, windowAiCommits: commitsPerWeek(10, 6) })
    expect(high.velocity).toBeGreaterThan(low.velocity)
    expect(high.points).toBeGreaterThanOrEqual(low.points)
  })

  it('consistency = activeWeeks / 12', () => {
    const s = analyzeStats({
      windowAiCommits: commitsPerWeek(2, 6),
      commitToolCount: 1,
      equippedOnlyCount: 0,
      usage: singleUsage,
      now: NOW,
    })
    expect(s.activeWeeks).toBe(6)
    expect(s.consistency).toBe(50)
  })

  it('equipped-only tools count at half weight in diversity', () => {
    const none = analyzeStats({
      windowAiCommits: commitsPerWeek(2, 6),
      commitToolCount: 1,
      equippedOnlyCount: 0,
      usage: singleUsage,
      now: NOW,
    })
    const withEquipped = analyzeStats({
      windowAiCommits: commitsPerWeek(2, 6),
      commitToolCount: 1,
      equippedOnlyCount: 2,
      usage: singleUsage,
      now: NOW,
    })
    expect(withEquipped.diversity).toBeGreaterThan(none.diversity)
  })

  it('grade thresholds: 80/60/40/20 on points', () => {
    // points はロジック出力で直接指定できないため、既知入力の境界で検証
    const d = analyzeStats({
      windowAiCommits: commitsPerWeek(1, 1),
      commitToolCount: 0,
      equippedOnlyCount: 0,
      usage: singleUsage,
      now: NOW,
    })
    expect(d.points).toBeLessThan(20)
    expect(d.grade).toBe('D')
  })
})
```

- [ ] **Step 3: 失敗を確認**

Run: `bunx vitest run tests/analyzers/window.test.ts tests/analyzers/stats.test.ts`
Expected: FAIL — モジュール不在

- [ ] **Step 4: 実装**

`src/analyzers/window.ts`:

```typescript
import type { GitHubCommit } from '~/github/types'

const MS_PER_DAY = 24 * 60 * 60 * 1000
export const WINDOW_DAYS = 84 // 12 weeks

export function filterToWindow(
  commits: GitHubCommit[],
  now: Date,
  days: number = WINDOW_DAYS,
): GitHubCommit[] {
  const nowMs = now.getTime()
  const cutoff = nowMs - days * MS_PER_DAY
  return commits.filter((c) => {
    const ts = Date.parse(c.committedDate)
    return Number.isFinite(ts) && ts >= cutoff && ts <= nowMs
  })
}
```

`src/analyzers/stats.ts`:

```typescript
import type { GitHubCommit } from '~/github/types'
import type { Grade, StatsAnalysis, UsageAnalysis } from './types'

const WINDOW_WEEKS = 12
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
// 週平均25 AIコミットで VELOCITY 100（対数正規化の上限アンカー）
const VELOCITY_CAP_PER_WEEK = 25
// DIVERSITY: ツール4種で満点、equipped は 0.5 重み
const TOOL_FULL_COUNT = 4

export interface StatsInput {
  windowAiCommits: GitHubCommit[]
  commitToolCount: number
  equippedOnlyCount: number
  usage: UsageAnalysis
  now?: Date
}

function gradeFromPoints(points: number): Grade {
  if (points >= 80) return 'S'
  if (points >= 60) return 'A'
  if (points >= 40) return 'B'
  if (points >= 20) return 'C'
  return 'D'
}

function usageEntropyNorm(usage: UsageAnalysis): number {
  const counts = usage.categories.map((c) => c.count).filter((n) => n > 0)
  const total = counts.reduce((a, b) => a + b, 0)
  if (total === 0 || counts.length <= 1) return 0
  const h = counts.reduce((acc, n) => {
    const p = n / total
    return acc - p * Math.log(p)
  }, 0)
  return h / Math.log(4)
}

export function analyzeStats(input: StatsInput): StatsAnalysis {
  const now = input.now ?? new Date()
  const nowMs = now.getTime()

  const weekBins = new Array<number>(WINDOW_WEEKS).fill(0)
  for (const c of input.windowAiCommits) {
    const ts = Date.parse(c.committedDate)
    if (!Number.isFinite(ts) || ts > nowMs) continue
    const weeksAgo = Math.floor((nowMs - ts) / MS_PER_WEEK)
    if (weeksAgo >= WINDOW_WEEKS) continue
    weekBins[weeksAgo] += 1
  }

  const aiCommitsInWindow = weekBins.reduce((a, b) => a + b, 0)
  const activeWeeks = weekBins.filter((n) => n > 0).length

  const perWeekAvg = aiCommitsInWindow / WINDOW_WEEKS
  const velocity = Math.min(
    100,
    Math.round((100 * Math.log(1 + perWeekAvg)) / Math.log(1 + VELOCITY_CAP_PER_WEEK)),
  )

  const effectiveTools = input.commitToolCount + 0.5 * input.equippedOnlyCount
  const toolScore = Math.min(1, effectiveTools / TOOL_FULL_COUNT)
  const diversity = Math.round(100 * (0.6 * toolScore + 0.4 * usageEntropyNorm(input.usage)))

  const consistency = Math.round((100 * activeWeeks) / WINDOW_WEEKS)

  const points = Math.round(0.4 * velocity + 0.3 * diversity + 0.3 * consistency)

  return {
    velocity,
    diversity,
    consistency,
    points,
    grade: gradeFromPoints(points),
    aiCommitsInWindow,
    activeWeeks,
  }
}
```

- [ ] **Step 5: パス確認**

Run: `bunx vitest run tests/analyzers/window.test.ts tests/analyzers/stats.test.ts && bun run typecheck`
Expected: 全 PASS。`heavy consistent user hits S` で diversity が 100 にならない場合は entropy 計算ではなく期待値側でなく**実装のバグ**（evenUsage は entropyNorm=1.0、toolScore=1.0 → 100 になるはず）

- [ ] **Step 6: Commit**

```bash
git add src/analyzers/window.ts src/analyzers/stats.ts src/analyzers/types.ts tests/analyzers/window.test.ts tests/analyzers/stats.test.ts
git commit -m "feat(stats): 12週窓フィルタ + VELOCITY/DIVERSITY/CONSISTENCY stats analyzer

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: serial / seed ユーティリティ + フレーバーテキスト

**Files:**
- Create: `src/card/serial.ts`
- Create: `src/analyzers/flavor.ts`
- Create: `tests/card/serial.test.ts`
- Create: `tests/analyzers/flavor.test.ts`

**Interfaces:**
- Produces:
  - `fnv1a32(input: string): number`（32bit unsigned）
  - `cardSerial(username: string): string`（例 `'#7F3A'` — fnv1a32 の上位16bit を hex 4桁大文字）
  - `artSeed(username: string): number`（fnv1a32 そのまま）
  - `flavorText(input: FlavorInput): string`、`FlavorInput = { pattern: PatternType; topToolName: string | null; consistency: number }`

- [ ] **Step 1: 失敗するテストを書く**

`tests/card/serial.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { artSeed, cardSerial, fnv1a32 } from '~/card/serial'

describe('serial/seed', () => {
  it('fnv1a32 is deterministic and differs across inputs', () => {
    expect(fnv1a32('sakimyto')).toBe(fnv1a32('sakimyto'))
    expect(fnv1a32('sakimyto')).not.toBe(fnv1a32('octocat'))
  })

  it('fnv1a32 matches known FNV-1a vector', () => {
    // 標準 FNV-1a 32bit: fnv1a32('a') = 0xe40c292c
    expect(fnv1a32('a')).toBe(0xe40c292c)
  })

  it('cardSerial is #XXXX uppercase hex', () => {
    expect(cardSerial('sakimyto')).toMatch(/^#[0-9A-F]{4}$/)
    expect(cardSerial('sakimyto')).toBe(cardSerial('sakimyto'))
  })

  it('artSeed equals fnv1a32', () => {
    expect(artSeed('x')).toBe(fnv1a32('x'))
  })
})
```

`tests/analyzers/flavor.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { flavorText } from '~/analyzers/flavor'

describe('flavorText', () => {
  it('is deterministic per pattern + tool', () => {
    const a = flavorText({ pattern: 'AI Native', topToolName: 'Claude', consistency: 50 })
    expect(a).toBe(flavorText({ pattern: 'AI Native', topToolName: 'Claude', consistency: 50 }))
    expect(a).toContain('Claude')
  })

  it('covers all four patterns with distinct lines', () => {
    const lines = new Set(
      (['AI Native', 'Pair Programmer', 'Delegator', 'Selective User'] as const).map((p) =>
        flavorText({ pattern: p, topToolName: 'Claude', consistency: 0 }),
      ),
    )
    expect(lines.size).toBe(4)
  })

  it('falls back to "AI" when no tool', () => {
    expect(flavorText({ pattern: 'Delegator', topToolName: null, consistency: 0 })).toContain('AI')
  })

  it('adds streak prefix at consistency >= 75', () => {
    const line = flavorText({ pattern: 'AI Native', topToolName: 'Claude', consistency: 80 })
    expect(line.startsWith('Never misses a week.')).toBe(true)
  })
})
```

- [ ] **Step 2: 失敗を確認**

Run: `bunx vitest run tests/card/serial.test.ts tests/analyzers/flavor.test.ts`
Expected: FAIL — モジュール不在

- [ ] **Step 3: 実装**

`src/card/serial.ts`:

```typescript
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

export function cardSerial(username: string): string {
  const hex = (fnv1a32(username) >>> 16).toString(16).toUpperCase().padStart(4, '0')
  return `#${hex}`
}

export function artSeed(username: string): number {
  return fnv1a32(username)
}
```

`src/analyzers/flavor.ts`:

```typescript
import type { PatternType } from './types'

export interface FlavorInput {
  pattern: PatternType
  topToolName: string | null
  consistency: number
}

const TEMPLATES: Record<PatternType, string> = {
  'AI Native': 'Fully fused with {tool} — ships at machine speed.',
  'Pair Programmer': 'Trades keystrokes with {tool}, line for line.',
  Delegator: 'Points the way. {tool} does the heavy lifting.',
  'Selective User': 'Calls on {tool} only when it counts.',
}

export function flavorText(input: FlavorInput): string {
  const tool = input.topToolName ?? 'AI'
  const base = TEMPLATES[input.pattern].replace('{tool}', tool)
  return input.consistency >= 75 ? `Never misses a week. ${base}` : base
}
```

- [ ] **Step 4: パス確認 + Commit**

Run: `bunx vitest run tests/card/serial.test.ts tests/analyzers/flavor.test.ts` → PASS

```bash
git add src/card/serial.ts src/analyzers/flavor.ts tests/card/serial.test.ts tests/analyzers/flavor.test.ts
git commit -m "feat(card): シリアル/シード + 決定論フレーバーテキスト

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: ジェネラティブアート SVG モジュール

**Files:**
- Create: `src/svg/v2/art.ts`
- Create: `tests/svg/v2/art.test.ts`

**Interfaces:**
- Consumes: `artSeed(username)`（Task 4）、`Theme`（`~/svg/themes`）
- Produces: `renderArt(opts: { seed: number; width: number; height: number; accent: string; bg: string }): string` — `<g>...</g>` の SVG 断片。呼び出し側が clip/配置する

- [ ] **Step 1: 失敗するテストを書く**

`tests/svg/v2/art.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { renderArt } from '~/svg/v2/art'

const opts = { seed: 12345, width: 686, height: 300, accent: '#a371f7', bg: '#161b22' }

describe('renderArt', () => {
  it('is deterministic: same seed → identical svg', () => {
    expect(renderArt(opts)).toBe(renderArt(opts))
  })

  it('different seeds → different svg', () => {
    expect(renderArt(opts)).not.toBe(renderArt({ ...opts, seed: 54321 }))
  })

  it('contains nodes and edges within bounds', () => {
    const svg = renderArt(opts)
    expect(svg).toContain('<g')
    expect(svg).toContain('<circle')
    expect(svg).toContain('<path')
    // 座標が width/height を超えない（数値抽出して検査）
    const nums = [...svg.matchAll(/c?x="([\d.]+)"/g)].map((m) => Number(m[1]))
    expect(nums.length).toBeGreaterThan(0)
    for (const n of nums) expect(n).toBeLessThanOrEqual(686)
  })

  it('escapes nothing user-controlled (no raw text nodes)', () => {
    expect(renderArt(opts)).not.toContain('<text')
  })
})
```

- [ ] **Step 2: 失敗を確認**

Run: `bunx vitest run tests/svg/v2/art.test.ts`
Expected: FAIL — モジュール不在

- [ ] **Step 3: 実装**

`src/svg/v2/art.ts` — 星座（constellation）モチーフ。mulberry32 PRNG で 10 ノードを配置し、近傍を曲線で接続、アクセント色のリング/ドットを重ねる:

```typescript
export interface ArtOptions {
  seed: number
  width: number
  height: number
  accent: string
  bg: string
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const NODE_COUNT = 10
const MARGIN = 24

export function renderArt(opts: ArtOptions): string {
  const rand = mulberry32(opts.seed)
  const w = opts.width
  const h = opts.height

  const nodes: { x: number; y: number; r: number }[] = []
  for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push({
      x: Math.round((MARGIN + rand() * (w - MARGIN * 2)) * 10) / 10,
      y: Math.round((MARGIN + rand() * (h - MARGIN * 2)) * 10) / 10,
      r: Math.round((1.5 + rand() * 3.5) * 10) / 10,
    })
  }

  const edges: string[] = []
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1]
    const b = nodes[i]
    const mx = (a.x + b.x) / 2 + (rand() - 0.5) * 60
    const my = (a.y + b.y) / 2 + (rand() - 0.5) * 60
    edges.push(
      `<path d="M ${a.x} ${a.y} Q ${Math.round(mx * 10) / 10} ${Math.round(my * 10) / 10} ${b.x} ${b.y}" fill="none" stroke="${opts.accent}" stroke-opacity="0.35" stroke-width="1" />`,
    )
  }

  const dots = nodes.map(
    (n, i) =>
      `<circle cx="${n.x}" cy="${n.y}" r="${n.r}" fill="${opts.accent}" fill-opacity="${i % 3 === 0 ? 0.9 : 0.55}" />`,
  )

  const rings = nodes
    .filter((_, i) => i % 4 === 0)
    .map(
      (n) =>
        `<circle cx="${n.x}" cy="${n.y}" r="${n.r + 6}" fill="none" stroke="${opts.accent}" stroke-opacity="0.3" stroke-width="1" />`,
    )

  return `<g>
<rect x="0" y="0" width="${w}" height="${h}" fill="${opts.bg}" />
${edges.join('\n')}
${rings.join('\n')}
${dots.join('\n')}
</g>`
}
```

- [ ] **Step 4: パス確認 + Commit**

Run: `bunx vitest run tests/svg/v2/art.test.ts` → PASS

```bash
git add src/svg/v2/art.ts tests/svg/v2/art.test.ts
git commit -m "feat(v2): username シード決定論のジェネラティブアート

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: レアリティフレーム + 紋章 + カード v2 レンダラ

**Files:**
- Create: `src/svg/v2/frame.ts`
- Create: `src/svg/v2/emblem.ts`
- Create: `src/svg/v2/cardV2.ts`
- Create: `tests/svg/v2/frame.test.ts`
- Create: `tests/svg/v2/cardV2.test.ts`
- Modify: `src/svg/utils.ts`（`wrapText` 追加）
- Modify: `src/analyzers/types.ts`（`CardDataV2` 追加）

**Interfaces:**
- Consumes: `renderArt`（Task 5）、`cardSerial`/`artSeed`（Task 4）、`StatsAnalysis`/`EquippedAnalysis`/`flavorText`（Task 2-4）、`getTheme`/`Theme`、`svgText`/`svgRect`/`escapeXml`/`renderPill`（既存 utils）
- Produces:
  - `renderFrame(grade: Grade, w: number, h: number): { defs: string; frame: string }`
  - `renderEmblem(pattern: PatternType, x: number, y: number, size: number, color: string): string`
  - `renderCardV2(data: CardDataV2, options: { theme: string }): string`（完全な `<svg>` 750×1050）
  - `renderPlaceholderCard(username: string, themeName: string): string`（"Summoning…" カード。Task 9 が使用）
  - `CardDataV2 = { username: string; stats: StatsAnalysis; toolAttribution: ToolAttributionAnalysis; equipped: EquippedAnalysis; usage: UsageAnalysis; languages: LanguageAnalysis; pattern: PatternAnalysis; flavor: string; serial: string; seed: number; issuedYear: number }`

- [ ] **Step 1: 型と wrapText を追加**

`src/analyzers/types.ts` の末尾 `// === Card Data ===` 節の直後に追加:

```typescript
// === Card Data (v2) ===
export interface CardDataV2 {
	username: string
	stats: StatsAnalysis
	toolAttribution: ToolAttributionAnalysis
	equipped: EquippedAnalysis
	usage: UsageAnalysis
	languages: LanguageAnalysis
	pattern: PatternAnalysis
	flavor: string
	serial: string
	seed: number
	issuedYear: number
}
```

`src/svg/utils.ts` の末尾に追加:

```typescript
// 語単位で maxChars に収まるよう行分割する。maxLines 超過分は末尾行に … を付けて切る。
export function wrapText(text: string, maxChars: number, maxLines: number): string[] {
	const words = text.split(/\s+/).filter((w) => w.length > 0);
	const lines: string[] = [];
	let current = "";
	for (const word of words) {
		const candidate = current === "" ? word : `${current} ${word}`;
		if (candidate.length <= maxChars) {
			current = candidate;
		} else {
			if (current !== "") lines.push(current);
			current = word;
		}
	}
	if (current !== "") lines.push(current);
	if (lines.length > maxLines) {
		const kept = lines.slice(0, maxLines);
		kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, maxChars - 1)}…`;
		return kept;
	}
	return lines;
}
```

- [ ] **Step 2: 失敗するテストを書く**

`tests/svg/v2/frame.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { renderFrame } from '~/svg/v2/frame'

describe('renderFrame', () => {
  it('S tier has animated holo gradient + shine sweep', () => {
    const { defs, frame } = renderFrame('S', 750, 1050)
    expect(defs).toContain('holoGrad')
    expect(defs).toContain('<animateTransform')
    expect(frame).toContain('<animate ')
  })

  it('A/B/C are static metallic frames without animation', () => {
    for (const g of ['A', 'B', 'C'] as const) {
      const { defs, frame } = renderFrame(g, 750, 1050)
      expect(defs).not.toContain('animate')
      expect(frame).not.toContain('animate')
      expect(defs).toContain(`metal${g}`)
    }
  })

  it('D is a plain single-color frame with empty defs', () => {
    const { defs, frame } = renderFrame('D', 750, 1050)
    expect(defs).toBe('')
    expect(frame).toContain('stroke')
  })
})
```

`tests/svg/v2/cardV2.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import type { CardDataV2 } from '~/analyzers/types'
import { renderCardV2, renderPlaceholderCard } from '~/svg/v2/cardV2'

function makeData(over: Partial<CardDataV2> = {}): CardDataV2 {
  return {
    username: 'testuser',
    stats: {
      velocity: 82,
      diversity: 60,
      consistency: 74,
      points: 73,
      grade: 'A',
      aiCommitsInWindow: 120,
      activeWeeks: 9,
    },
    toolAttribution: {
      tools: [
        { toolId: 'claude', toolName: 'Claude', commitCount: 84, percentage: 70 },
        { toolId: 'cursor', toolName: 'Cursor', commitCount: 36, percentage: 30 },
      ],
      totalAiCommits: 120,
      verified: true,
    },
    equipped: { equipped: [{ toolId: 'codex', toolName: 'Codex', repoCount: 2 }] },
    usage: {
      categories: [
        { category: 'feature', count: 60, percentage: 50 },
        { category: 'refactor', count: 30, percentage: 25 },
        { category: 'bugfix', count: 18, percentage: 15 },
        { category: 'test', count: 12, percentage: 10 },
      ],
      totalCommits: 120,
    },
    languages: {
      languages: [
        { name: 'TypeScript', color: '#3178c6', repoCount: 5 },
        { name: 'Python', color: '#3572A5', repoCount: 2 },
      ],
    },
    pattern: { pattern: 'Pair Programmer', aiRate: 0.5, alternationScore: 0.6 },
    flavor: 'Trades keystrokes with Claude, line for line.',
    serial: '#7F3A',
    seed: 12345,
    issuedYear: 2026,
    ...over,
  }
}

describe('renderCardV2', () => {
  it('renders 750x1050 with username, serial, window label, flavor', () => {
    const svg = renderCardV2(makeData(), { theme: 'dark' })
    expect(svg).toContain('width="750"')
    expect(svg).toContain('height="1050"')
    expect(svg).toContain('testuser')
    expect(svg).toContain('#7F3A')
    expect(svg).toContain('public · 12wk')
    expect(svg).toContain('Trades keystrokes')
  })

  it('all five grades render for both themes (golden snapshots)', () => {
    for (const grade of ['S', 'A', 'B', 'C', 'D'] as const) {
      for (const theme of ['light', 'dark']) {
        const svg = renderCardV2(
          makeData({ stats: { ...makeData().stats, grade } }),
          { theme },
        )
        expect(svg).toMatchSnapshot(`card-${grade}-${theme}`)
      }
    }
  })

  it('escapes XML in username (39-char boundary + injection attempt)', () => {
    const long = 'a'.repeat(39)
    expect(renderCardV2(makeData({ username: long }), { theme: 'dark' })).toContain(long)
    // GH_LOGIN_RE 通過後の値しか来ないが、描画層は防御的に escape する
    const svg = renderCardV2(makeData({ username: 'x"><script' as string }), { theme: 'dark' })
    expect(svg).not.toContain('"><script')
  })

  it('renders without tools and without commits (zero states)', () => {
    const svg = renderCardV2(
      makeData({
        toolAttribution: { tools: [], totalAiCommits: 0, verified: false },
        equipped: { equipped: [] },
        usage: { categories: [], totalCommits: 0 },
        languages: { languages: [] },
        stats: {
          velocity: 0,
          diversity: 0,
          consistency: 0,
          points: 0,
          grade: 'D',
          aiCommitsInWindow: 0,
          activeWeeks: 0,
        },
      }),
      { theme: 'light' },
    )
    expect(svg).toContain('width="750"')
    expect(svg).not.toContain('NaN')
    expect(svg).not.toContain('undefined')
  })
})

describe('renderPlaceholderCard', () => {
  it('renders summoning card with username', () => {
    const svg = renderPlaceholderCard('testuser', 'dark')
    expect(svg).toContain('Summoning')
    expect(svg).toContain('testuser')
    expect(svg).toContain('width="750"')
  })
})
```

- [ ] **Step 3: 失敗を確認**

Run: `bunx vitest run tests/svg/v2/frame.test.ts tests/svg/v2/cardV2.test.ts`
Expected: FAIL — モジュール不在

- [ ] **Step 4: frame.ts を実装**

`src/svg/v2/frame.ts`:

```typescript
import type { Grade } from '~/analyzers/types'

const METAL_STOPS: Record<'A' | 'B' | 'C', [string, string, string]> = {
  A: ['#f5d76e', '#b8860b', '#f5d76e'],
  B: ['#e8edf2', '#8a939e', '#dfe5eb'],
  C: ['#e0955e', '#7a4a1f', '#cd7f32'],
}

export function renderFrame(
  grade: Grade,
  w: number,
  h: number,
): { defs: string; frame: string } {
  const inset = 10
  const rectAttrs = `x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}" rx="28" fill="none"`

  if (grade === 'S') {
    const defs = `<linearGradient id="holoGrad" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0%" stop-color="#ff6ec7" />
  <stop offset="30%" stop-color="#ffc36e" />
  <stop offset="60%" stop-color="#6ef3ff" />
  <stop offset="100%" stop-color="#a06eff" />
  <animateTransform attributeName="gradientTransform" type="rotate" from="0 0.5 0.5" to="360 0.5 0.5" dur="8s" repeatCount="indefinite" />
</linearGradient>
<linearGradient id="shineGrad" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0%" stop-color="#ffffff" stop-opacity="0" />
  <stop offset="50%" stop-color="#ffffff" stop-opacity="0.35" />
  <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
</linearGradient>
<clipPath id="frameClip"><rect x="0" y="0" width="${w}" height="${h}" rx="36" /></clipPath>`
    const frame = `<rect ${rectAttrs} stroke="url(#holoGrad)" stroke-width="8" />
<g clip-path="url(#frameClip)">
  <rect x="-260" y="0" width="200" height="${h}" fill="url(#shineGrad)" transform="skewX(-18)">
    <animate attributeName="x" from="-260" to="${w + 260}" dur="5s" repeatCount="indefinite" />
  </rect>
</g>`
    return { defs, frame }
  }

  if (grade === 'A' || grade === 'B' || grade === 'C') {
    const [s1, s2, s3] = METAL_STOPS[grade]
    const defs = `<linearGradient id="metal${grade}" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0%" stop-color="${s1}" />
  <stop offset="50%" stop-color="${s2}" />
  <stop offset="100%" stop-color="${s3}" />
</linearGradient>`
    const frame = `<rect ${rectAttrs} stroke="url(#metal${grade})" stroke-width="8" />
<rect x="${inset + 6}" y="${inset + 6}" width="${w - (inset + 6) * 2}" height="${h - (inset + 6) * 2}" rx="24" fill="none" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1" />`
    return { defs, frame }
  }

  return {
    defs: '',
    frame: `<rect ${rectAttrs} stroke="#6e7681" stroke-width="6" stroke-opacity="0.8" />`,
  }
}

export const TIER_GEM_COLORS: Record<Grade, string> = {
  S: '#a06eff',
  A: '#b8860b',
  B: '#8a939e',
  C: '#cd7f32',
  D: '#6e7681',
}
```

- [ ] **Step 5: emblem.ts を実装**

`src/svg/v2/emblem.ts`:

```typescript
import type { PatternType } from '~/analyzers/types'

// 各紋章は (0,0)-(24,24) の viewBox 前提のパス。呼び出し側が transform で配置する。
const EMBLEM_PATHS: Record<PatternType, string> = {
  'AI Native':
    '<path d="M13 2 L6 14 L11 14 L9 22 L18 9 L12.5 9 Z" fill="{c}" />',
  'Pair Programmer':
    '<circle cx="9" cy="12" r="6" fill="none" stroke="{c}" stroke-width="2.5" /><circle cx="15" cy="12" r="6" fill="none" stroke="{c}" stroke-width="2.5" />',
  Delegator:
    '<path d="M4 12 H12 M12 12 L18 6 M12 12 L18 18 M18 6 l-3 0 m3 0 l0 3 M18 18 l-3 0 m3 0 l0 -3" fill="none" stroke="{c}" stroke-width="2.5" stroke-linecap="round" />',
  'Selective User':
    '<circle cx="12" cy="12" r="8" fill="none" stroke="{c}" stroke-width="2.5" /><circle cx="12" cy="12" r="2.5" fill="{c}" />',
}

export function renderEmblem(
  pattern: PatternType,
  x: number,
  y: number,
  size: number,
  color: string,
): string {
  const scale = size / 24
  const body = EMBLEM_PATHS[pattern].replaceAll('{c}', color)
  return `<g transform="translate(${x} ${y}) scale(${scale})">${body}</g>`
}
```

- [ ] **Step 6: cardV2.ts を実装**

`src/svg/v2/cardV2.ts`:

```typescript
import type { CardDataV2 } from '~/analyzers/types'
import { getTheme, type Theme } from '../themes'
import { svgRect, svgText, wrapText } from '../utils'
import { renderArt } from './art'
import { renderEmblem } from './emblem'
import { renderFrame, TIER_GEM_COLORS } from './frame'

export const CARD_W = 750
export const CARD_H = 1050
const PAD = 44

function statBar(label: string, value: number, y: number, theme: Theme): string {
  const barX = PAD + 190
  const barW = CARD_W - barX - PAD - 64
  const filled = Math.round((barW * Math.max(0, Math.min(100, value))) / 100)
  return `${svgText(PAD, y + 15, label, { fontSize: 18, fill: theme.textSecondary, fontWeight: '600' })}
${svgRect(barX, y, barW, 18, { fill: theme.barBg, rx: 9 })}
${filled > 0 ? svgRect(barX, y, Math.max(filled, 18), 18, { fill: theme.accent, rx: 9 }) : ''}
${svgText(barX + barW + 16, y + 15, String(value), { fontSize: 20, fill: theme.text, fontWeight: 'bold' })}`
}

function tierGem(grade: CardDataV2['stats']['grade'], x: number, y: number): string {
  const c = TIER_GEM_COLORS[grade]
  const size = 92
  const half = size / 2
  return `<g transform="translate(${x} ${y})">
<polygon points="${half},0 ${size},${half} ${half},${size} 0,${half}" fill="${c}" />
<polygon points="${half},8 ${size - 8},${half} ${half},${size - 8} 8,${half}" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2" />
${svgText(half, half + 12, grade, { fontSize: 34, fill: '#ffffff', fontWeight: 'bold', anchor: 'middle' })}
</g>`
}

export function renderCardV2(data: CardDataV2, options: { theme: string }): string {
  const theme = getTheme(options.theme)
  const { defs, frame } = renderFrame(data.stats.grade, CARD_W, CARD_H)

  // --- name plate ---
  const namePlate = `${svgText(PAD, 84, 'AI BUILDER', { fontSize: 16, fill: theme.textSecondary, fontWeight: '600' })}
${svgText(PAD, 128, data.username, { fontSize: data.username.length > 20 ? 30 : 42, fill: theme.text, fontWeight: 'bold' })}`

  // --- archetype row ---
  const archetypeY = 156
  const emblem = renderEmblem(data.pattern.pattern, PAD, archetypeY, 30, theme.accent)
  const archetypeLabel = svgText(PAD + 40, archetypeY + 23, data.pattern.pattern, {
    fontSize: 22,
    fill: theme.accent,
    fontWeight: '600',
  })
  const verified = data.toolAttribution.verified
    ? `${svgText(PAD + 40 + data.pattern.pattern.length * 12 + 24, archetypeY + 23, '✓ verified', { fontSize: 16, fill: theme.textSecondary })}`
    : ''

  // --- art area ---
  const artY = 210
  const artH = 290
  const artW = CARD_W - PAD * 2
  const art = `<clipPath id="artClip"><rect x="${PAD}" y="${artY}" width="${artW}" height="${artH}" rx="18" /></clipPath>
<g clip-path="url(#artClip)"><g transform="translate(${PAD} ${artY})">${renderArt({
    seed: data.seed,
    width: artW,
    height: artH,
    accent: theme.accent,
    bg: theme.headerBg,
  })}</g></g>
<rect x="${PAD}" y="${artY}" width="${artW}" height="${artH}" rx="18" fill="none" stroke="${theme.border}" />`

  // --- stats ---
  const statsY = 548
  const stats = `${svgText(PAD, statsY - 18, 'STATS', { fontSize: 15, fill: theme.textSecondary, fontWeight: '600' })}
${statBar('VELOCITY', data.stats.velocity, statsY, theme)}
${statBar('DIVERSITY', data.stats.diversity, statsY + 44, theme)}
${statBar('CONSISTENCY', data.stats.consistency, statsY + 88, theme)}`

  // --- tool loadout ---
  const toolsY = 716
  const toolChips: string[] = []
  let chipX = PAD
  for (const t of data.toolAttribution.tools.slice(0, 3)) {
    const label = `${t.toolName} ${Math.round(t.percentage)}%`
    const cw = 24 + label.length * 11
    toolChips.push(`${svgRect(chipX, toolsY, cw, 36, { fill: theme.badgeBg, rx: 18 })}
${svgText(chipX + cw / 2, toolsY + 24, label, { fontSize: 17, fill: theme.text, fontWeight: '600', anchor: 'middle' })}`)
    chipX += cw + 12
  }
  const commitToolIds = new Set(data.toolAttribution.tools.map((t) => t.toolId))
  for (const e of data.equipped.equipped.filter((e) => !commitToolIds.has(e.toolId)).slice(0, 2)) {
    const label = `${e.toolName} · equipped`
    const cw = 24 + label.length * 10
    toolChips.push(`<rect x="${chipX}" y="${toolsY}" width="${cw}" height="36" rx="18" fill="none" stroke="${theme.accent}" stroke-opacity="0.5" stroke-dasharray="4 3" />
${svgText(chipX + cw / 2, toolsY + 24, label, { fontSize: 15, fill: theme.textSecondary, anchor: 'middle' })}`)
    chipX += cw + 12
  }
  const loadout = `${svgText(PAD, toolsY - 14, 'LOADOUT', { fontSize: 15, fill: theme.textSecondary, fontWeight: '600' })}
${toolChips.length > 0 ? toolChips.join('\n') : svgText(PAD, toolsY + 24, 'no tools detected yet', { fontSize: 16, fill: theme.textSecondary })}`

  // --- languages ---
  const langY = 812
  const langItems = data.languages.languages
    .map((l, i) => {
      const x = PAD + i * 180
      return `<circle cx="${x + 8}" cy="${langY + 18}" r="7" fill="${l.color}" />
${svgText(x + 24, langY + 24, l.name, { fontSize: 18, fill: theme.text })}`
    })
    .join('\n')
  const langs = `${svgText(PAD, langY, 'TYPES', { fontSize: 15, fill: theme.textSecondary, fontWeight: '600' })}
${data.languages.languages.length > 0 ? langItems : svgText(PAD, langY + 24, '—', { fontSize: 16, fill: theme.textSecondary })}`

  // --- flavor ---
  const flavorY = 900
  const flavorLines = wrapText(data.flavor, 46, 2)
  const flavor = flavorLines
    .map((line, i) =>
      svgText(CARD_W / 2, flavorY + i * 28, line, {
        fontSize: 19,
        fill: theme.textSecondary,
        anchor: 'middle',
      }),
    )
    .join('\n')
  const flavorRule = `<line x1="${PAD + 60}" y1="${flavorY - 30}" x2="${CARD_W - PAD - 60}" y2="${flavorY - 30}" stroke="${theme.border}" stroke-width="1" />`

  // --- footer ---
  const footer = `${svgText(PAD, CARD_H - 40, `${data.serial} · ${data.issuedYear} · public · 12wk`, { fontSize: 15, fill: theme.textSecondary })}
${svgText(CARD_W - PAD, CARD_H - 40, 'devcard-ai', { fontSize: 15, fill: theme.textSecondary, anchor: 'end' })}`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
<defs>${defs}</defs>
${svgRect(0, 0, CARD_W, CARD_H, { fill: theme.bg, rx: 36 })}
${frame}
${namePlate}
${emblem}
${archetypeLabel}
${verified}
${art}
${stats}
${loadout}
${langs}
${flavorRule}
${flavor}
${tierGem(data.stats.grade, CARD_W - PAD - 92, 56)}
${footer}
</svg>`
}

export function renderPlaceholderCard(username: string, themeName: string): string {
  const theme = getTheme(themeName)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
${svgRect(0, 0, CARD_W, CARD_H, { fill: theme.bg, rx: 36 })}
<rect x="10" y="10" width="${CARD_W - 20}" height="${CARD_H - 20}" rx="28" fill="none" stroke="${theme.border}" stroke-width="6" stroke-dasharray="10 8" />
${svgText(CARD_W / 2, CARD_H / 2 - 20, 'Summoning…', { fontSize: 34, fill: theme.text, fontWeight: 'bold', anchor: 'middle' })}
${svgText(CARD_W / 2, CARD_H / 2 + 24, `${username}'s card is being drawn`, { fontSize: 18, fill: theme.textSecondary, anchor: 'middle' })}
${svgText(CARD_W / 2, CARD_H - 48, 'devcard-ai', { fontSize: 15, fill: theme.textSecondary, anchor: 'middle' })}
</svg>`
}
```

注意: `svgText` は内部で `escapeXml` するため、呼び出し側で二重エスケープしないこと（上記コードは svgText に生文字列を渡している = 正）。

- [ ] **Step 7: パス確認（snapshot 初回生成）**

Run: `bunx vitest run tests/svg/v2/ && bun run typecheck && bun run lint`
Expected: 全 PASS。snapshot 10 枚が `tests/svg/v2/__snapshots__/` に生成される

- [ ] **Step 8: 目視レビュー（マイルストーン・ゲート）**

```bash
cd /Users/sakimyto/_pjsc/devcard-ai
mkdir -p /tmp/devcard-visual
bun -e "
import { renderCardV2 } from './src/svg/v2/cardV2'
// tests/svg/v2/cardV2.test.ts の makeData と同じデータを流用し、
// S/A/B/C/D × light/dark の10枚を /tmp/devcard-visual/*.svg に書き出すスクリプトを書く
" 
# 実際は scripts/visual-preview.ts を作る:
```

`scripts/visual-preview.ts` を作成:

```typescript
import { mkdirSync, writeFileSync } from 'node:fs'
import type { CardDataV2, Grade } from '../src/analyzers/types'
import { renderCardV2 } from '../src/svg/v2/cardV2'

const base: CardDataV2 = {
  username: 'sakimyto',
  stats: { velocity: 82, diversity: 60, consistency: 74, points: 73, grade: 'A', aiCommitsInWindow: 120, activeWeeks: 9 },
  toolAttribution: {
    tools: [
      { toolId: 'claude', toolName: 'Claude', commitCount: 84, percentage: 70 },
      { toolId: 'cursor', toolName: 'Cursor', commitCount: 36, percentage: 30 },
    ],
    totalAiCommits: 120,
    verified: true,
  },
  equipped: { equipped: [{ toolId: 'codex', toolName: 'Codex', repoCount: 2 }] },
  usage: {
    categories: [
      { category: 'feature', count: 60, percentage: 50 },
      { category: 'refactor', count: 30, percentage: 25 },
      { category: 'bugfix', count: 18, percentage: 15 },
      { category: 'test', count: 12, percentage: 10 },
    ],
    totalCommits: 120,
  },
  languages: {
    languages: [
      { name: 'TypeScript', color: '#3178c6', repoCount: 5 },
      { name: 'Python', color: '#3572A5', repoCount: 2 },
    ],
  },
  pattern: { pattern: 'Pair Programmer', aiRate: 0.5, alternationScore: 0.6 },
  flavor: 'Trades keystrokes with Claude, line for line.',
  serial: '#7F3A',
  seed: 987654321,
  issuedYear: 2026,
}

mkdirSync('/tmp/devcard-visual', { recursive: true })
for (const grade of ['S', 'A', 'B', 'C', 'D'] as Grade[]) {
  for (const theme of ['light', 'dark']) {
    const svg = renderCardV2({ ...base, stats: { ...base.stats, grade } }, { theme })
    writeFileSync(`/tmp/devcard-visual/card-${grade}-${theme}.svg`, svg)
  }
}
console.log('wrote 10 cards to /tmp/devcard-visual')
```

Run:

```bash
bun run scripts/visual-preview.ts
for f in /tmp/devcard-visual/*.svg; do qlmanage -t -s 750 -o /tmp/devcard-visual "$f" >/dev/null 2>&1; done
open /tmp/devcard-visual
```

**人間（またはオーケストレーター）が10枚を目視確認**: 文字の重なり・はみ出し・レアリティ枠の視認性・アートの美観。NG があれば座標定数を調整して snapshot を更新（`bunx vitest run tests/svg/v2/ -u`）し、意図した差分としてコミットメッセージに記す

- [ ] **Step 9: Commit**

```bash
git add src/svg/v2/ src/svg/utils.ts src/analyzers/types.ts tests/svg/v2/ scripts/visual-preview.ts
git commit -m "feat(v2): レアリティフレーム/紋章/750x1050カードレンダラ + placeholder

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: handler を v2 パイプラインへ配線（旧レンダラ削除）

**Files:**
- Modify: `src/handler.ts`（全面書き換え）
- Modify: `src/github/queries.ts`, `src/github/client.ts`（`$since` 導入）, `tests/github/client.test.ts`
- Modify: `src/svg/card.ts`（`renderErrorCard` のみ残す）
- Delete: `src/svg/modules/badges.ts`, `src/svg/modules/toolsBar.ts`, `src/svg/modules/usage.ts`, `src/svg/modules/velocity.ts`, `src/analyzers/score.ts`, `src/analyzers/badges.ts`
- Delete: `tests/svg/modules/`（配下全部）, `tests/analyzers/score.test.ts`, `tests/analyzers/badges.test.ts`
- Modify: `tests/handler.test.ts`, `tests/svg/card.test.ts`, `src/analyzers/types.ts`, `api/index.ts`

**Interfaces:**
- Consumes: Task 1-6 の全成果物
- Produces: `handleRequest(params: RequestParams, graphql: GraphqlFn, now?: Date): Promise<HandlerResult>`、`fetchUserData(login: string, graphql: GraphqlFn, since: string): Promise<GitHubUser | null>`（since は ISO 8601 GitTimestamp）。`HandlerResult = { svg: string; status: number; kind: 'ok' | 'not_found' | 'no_repos' | 'no_ai' | 'error' }`（不正ユーザー名の 400 は api 層の責務 — Task 9）。`RequestParams = { user: string; theme: string }`（modules パラメータは v2 で廃止）

- [ ] **Step 1: 失敗するテストを書く（handler v2 の期待挙動）**

`tests/handler.test.ts` を全面書き換え:

```typescript
import { describe, expect, it } from 'vitest'
import { handleRequest } from '~/handler'
import type { GitHubQueryResponse } from '~/github/types'

const NOW = new Date('2026-07-08T12:00:00Z')
const recent = (daysAgo: number) =>
  new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString()

function graphqlWith(response: GitHubQueryResponse) {
  return async () => response
}

const aiCommit = (daysAgo: number, oid: string) => ({
  oid,
  message: `feat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>`,
  committedDate: recent(daysAgo),
  author: { user: { login: 'someone' } },
})

const fullUser: GitHubQueryResponse = {
  user: {
    login: 'testuser',
    repositories: {
      nodes: [
        {
          name: 'repo1',
          pushedAt: recent(2),
          defaultBranchRef: {
            target: {
              history: {
                nodes: [aiCommit(1, 'a'), aiCommit(8, 'b'), aiCommit(200, 'old')],
                totalCount: 3,
              },
            },
          },
          claudeMd: { id: '1' },
          agentsMd: null,
          cursorrules: null,
          cursorrulesDir: null,
          githubCopilot: null,
          claudeDir: null,
          primaryLanguage: { name: 'TypeScript', color: '#3178c6' },
        },
      ],
    },
  },
}

describe('handleRequest v2', () => {
  it('renders v2 card for user with AI activity in window', async () => {
    const r = await handleRequest({ user: 'testuser', theme: 'dark' }, graphqlWith(fullUser), NOW)
    expect(r.kind).toBe('ok')
    expect(r.status).toBe(200)
    expect(r.svg).toContain('width="750"')
    expect(r.svg).toContain('public · 12wk')
    expect(r.svg).toContain('testuser')
  })

  it('12wk 窓外のコミットは指標に入らない（old commit は無視される）', async () => {
    const r = await handleRequest({ user: 'testuser', theme: 'dark' }, graphqlWith(fullUser), NOW)
    // 窓内 AI コミットは2件 → activeWeeks 2 → カード上の一貫性は 17
    expect(r.svg).toContain('>17<')
  })

  it('not found user → kind not_found', async () => {
    const r = await handleRequest(
      { user: 'ghost', theme: 'light' },
      graphqlWith({ user: null }),
      NOW,
    )
    expect(r.kind).toBe('not_found')
    expect(r.status).toBe(200)
    expect(r.svg).toContain('User not found')
  })

  it('no repos → kind no_repos / no AI in window → kind no_ai', async () => {
    const noRepos = await handleRequest(
      { user: 'u', theme: 'light' },
      graphqlWith({ user: { login: 'u', repositories: { nodes: [] } } }),
      NOW,
    )
    expect(noRepos.kind).toBe('no_repos')

    const stale: GitHubQueryResponse = JSON.parse(JSON.stringify(fullUser))
    stale.user!.repositories.nodes[0].defaultBranchRef!.target.history.nodes = [
      aiCommit(300, 'ancient'),
    ]
    const noAi = await handleRequest({ user: 'u', theme: 'light' }, graphqlWith(stale), NOW)
    expect(noAi.kind).toBe('no_ai')
    expect(noAi.svg).toContain('No public AI activity in the last 12 weeks')
  })

  it('graphql throw → kind error', async () => {
    const r = await handleRequest(
      { user: 'u', theme: 'light' },
      async () => {
        throw new Error('API rate limit exceeded')
      },
      NOW,
    )
    expect(r.kind).toBe('error')
  })

  it('passes $since (= now - 84d) to GraphQL — 窓外データを取得しない', async () => {
    let vars: Record<string, unknown> = {}
    const gql = async (_q: string, v: Record<string, unknown>) => {
      vars = v
      return fullUser
    }
    await handleRequest({ user: 'testuser', theme: 'dark' }, gql, NOW)
    expect(vars.since).toBe('2026-04-15T12:00:00.000Z')
  })
})
```

`tests/svg/card.test.ts` は `renderErrorCard` の describe だけ残して `renderCard`/`mockData` 関連を削除する。

- [ ] **Step 2: 失敗を確認**

Run: `bunx vitest run tests/handler.test.ts`
Expected: FAIL — `kind` プロパティ不在 / v2 カードでない

- [ ] **Step 3: queries.ts / client.ts に $since を導入し、handler.ts を書き換え**

`src/github/queries.ts`: クエリ先頭と history 行を変更（他は現状維持）:

```graphql
query($login: String!, $since: GitTimestamp!) {
  user(login: $login) {
    ...
                history(first: 100, since: $since) {
    ...
```

`src/github/client.ts` 全文:

```typescript
import { USER_REPOS_QUERY } from "./queries";
import type { GitHubQueryResponse, GitHubUser } from "./types";

type GraphqlFn = (
	query: string,
	variables: Record<string, unknown>,
) => Promise<GitHubQueryResponse>;

export async function fetchUserData(
	login: string,
	graphql: GraphqlFn,
	since: string,
): Promise<GitHubUser | null> {
	const response = await graphql(USER_REPOS_QUERY, { login, since });
	return response.user;
}
```

`tests/github/client.test.ts`: 既存テストの `fetchUserData` 呼び出しに第3引数 `'2026-04-15T12:00:00.000Z'` を追加し、「graphql に `{ login, since }` が渡る」アサーションを追加する。

`src/handler.ts` 全文:

```typescript
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
```

- [ ] **Step 4: 旧コード削除と参照更新**

```bash
git rm src/svg/modules/badges.ts src/svg/modules/toolsBar.ts src/svg/modules/usage.ts src/svg/modules/velocity.ts src/analyzers/score.ts src/analyzers/badges.ts
git rm -r tests/svg/modules tests/analyzers/score.test.ts tests/analyzers/badges.test.ts
```

- `src/svg/card.ts`: `renderCard`・`MODULE_HEIGHTS`・モジュール import・`CardOptions` を削除し、`renderErrorCard`（と必要な import: `getTheme`/`svgRect`/`svgText`、`CARD_WIDTH = 400` 定数）だけ残す
- `src/analyzers/types.ts`: `ScoreAnalysis`・`CardData`（v1）・`export type { Badge, BadgeAnalysis }` を削除。`VelocityAnalysis` は velocity.ts が現存する限り残す（handler からは未使用になるが analyzer は温存 — ogShare で使わないなら Task 12 の掃除で判断）
- `api/index.ts`: `MODULE_HEIGHTS` import と `VALID_MODULES`・`modules` パース・`handleRequest` への `modules` 受け渡しを削除（`parseParams` は `{ user, theme }` を返す）

- [ ] **Step 5: 全テスト + typecheck**

Run: `bun run test && bun run typecheck && bun run lint`
Expected: 全 PASS。velocity.test.ts / pattern.test.ts / usage.test.ts / languages.test.ts / toolAttribution.test.ts / coauthor.test.ts は無変更のまま通ること（analyzer 層のデグレ検知）

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(v2): handler を12週窓+v2カードへ配線、旧ダッシュボードレンダラ削除

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: フォント同梱（OGP 文字欠落修正）+ 1200×630 シェア画像

**Files:**
- Create: `fonts/inter-regular-subset.ttf`, `fonts/inter-bold-subset.ttf`（生成手順下記）
- Create: `src/svg/v2/ogShare.ts`
- Create: `tests/svg/v2/ogShare.test.ts`
- Modify: `src/ogp.ts`, `src/types/wasm.d.ts`, `wrangler.toml`, `tests/ogp.test.ts`, `api/index.ts`, `package.json`（devDep: pngjs — テスト専用、Worker には同梱しない）

**Interfaces:**
- Consumes: `CardDataV2`（Task 6）、`renderFrame`/`TIER_GEM_COLORS`（Task 6）
- Produces:
  - `renderOgShare(data: CardDataV2, themeName: string): string`（1200×630 の `<svg>`）
  - `svgToPng(svg: string, widthPx?: number): Promise<Uint8Array>`（フォント同梱済み。default width 1200）

- [ ] **Step 1: フォントサブセットを生成（コピペ再現可能）**

```bash
cd /Users/sakimyto/_pjsc/devcard-ai
mkdir -p fonts /tmp/inter-dl
curl -L -o /tmp/inter-dl/inter.zip https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip
unzip -o /tmp/inter-dl/inter.zip -d /tmp/inter-dl 'extras/ttf/Inter-Regular.ttf' 'extras/ttf/Inter-Bold.ttf'
# fonttools が無ければ: pip3 install --user fonttools
pip3 show fonttools >/dev/null 2>&1 || pip3 install --user fonttools
python3 -m fontTools.subset /tmp/inter-dl/extras/ttf/Inter-Regular.ttf \
  --output-file=fonts/inter-regular-subset.ttf \
  --unicodes="U+0020-007E,U+00B7,U+2026,U+2713" --layout-features='' --no-hinting
python3 -m fontTools.subset /tmp/inter-dl/extras/ttf/Inter-Bold.ttf \
  --output-file=fonts/inter-bold-subset.ttf \
  --unicodes="U+0020-007E,U+00B7,U+2026,U+2713" --layout-features='' --no-hinting
ls -la fonts/  # 各 20-40KB 程度になること（100KB超なら subset 失敗）
```

注意: zip 内のパスが違う場合は `unzip -l /tmp/inter-dl/inter.zip | grep -i 'Regular.ttf'` で実パスを確認して読み替える。U+00B7=·、U+2026=…、U+2713=✓（カードで使用する非ASCII文字）

- [ ] **Step 2: wrangler.toml に Data ルール追加**

`wrangler.toml` 末尾に追加:

```toml
# フォントをバイナリとしてバンドル（resvg の fontBuffers 用）
[[rules]]
type = "Data"
globs = ["**/*.ttf"]
fallthrough = true
```

`src/types/wasm.d.ts` に追加:

```typescript
declare module '*.ttf' {
	const data: ArrayBuffer
	export default data
}
```

- [ ] **Step 2.5: pngjs を devDependency に追加**

```bash
bun add -d pngjs @types/pngjs
```

- [ ] **Step 3: 失敗するテストを書く（フォント欠落のピクセル検査）**

`tests/ogp.test.ts` に追加（既存の wasm 初期化パターンを踏襲。既存テストが `initWasm` をどう呼んでいるか確認し同じ helper を使う）:

```typescript
import { PNG } from 'pngjs'
import { svgToPng } from '~/ogp'
import { themes } from '~/svg/themes'

// テスト SVG のレイアウト定数（マジックナンバー禁止 — 検査矩形はここから導出）
const CANVAS = { w: 200, h: 60 }
const TEXT = { x: 10, baselineY: 40, fontSize: 32, content: 'HELLO' }
// グリフ描画領域: ベースラインから ascent≈fontSize 分上〜descent 少々下
const TEXT_RECT = {
  x: TEXT.x,
  y: TEXT.baselineY - TEXT.fontSize,
  w: Math.round(TEXT.fontSize * 0.6 * TEXT.content.length),
  h: TEXT.fontSize + 8,
}
const MIN_INK_RATIO = 0.02 // 検査矩形の2%以上が非背景色なら「文字が描画された」
const CHANNEL_DIFF_THRESHOLD = 30

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  }
}

describe('svgToPng font rendering regression (pixel inspection)', () => {
  it('renders text ink inside the glyph box — font-missing detector', async () => {
    const bg = themes.light.bg // カードと同じテーマ定数を背景色に使う
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS.w}" height="${CANVAS.h}">
      <rect width="${CANVAS.w}" height="${CANVAS.h}" fill="${bg}"/>
      <text x="${TEXT.x}" y="${TEXT.baselineY}" font-size="${TEXT.fontSize}" fill="#000000" font-family="Inter">${TEXT.content}</text>
    </svg>`
    const bytes = await svgToPng(svg, CANVAS.w)
    const png = PNG.sync.read(Buffer.from(bytes))
    const bgRgb = hexToRgb(bg)

    let ink = 0
    let total = 0
    for (let y = TEXT_RECT.y; y < TEXT_RECT.y + TEXT_RECT.h && y < png.height; y++) {
      for (let x = TEXT_RECT.x; x < TEXT_RECT.x + TEXT_RECT.w && x < png.width; x++) {
        const i = (png.width * y + x) << 2
        total++
        const diff =
          Math.abs(png.data[i] - bgRgb.r) +
          Math.abs(png.data[i + 1] - bgRgb.g) +
          Math.abs(png.data[i + 2] - bgRgb.b)
        if (diff > CHANNEL_DIFF_THRESHOLD) ink++
      }
    }
    expect(total).toBeGreaterThan(0)
    expect(ink / total).toBeGreaterThan(MIN_INK_RATIO)
  })
})
```

`tests/svg/v2/ogShare.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { renderOgShare } from '~/svg/v2/ogShare'
import type { CardDataV2 } from '~/analyzers/types'

const data: CardDataV2 = {
  username: 'testuser',
  stats: { velocity: 82, diversity: 60, consistency: 74, points: 73, grade: 'S', aiCommitsInWindow: 120, activeWeeks: 9 },
  toolAttribution: {
    tools: [{ toolId: 'claude', toolName: 'Claude', commitCount: 84, percentage: 70 }],
    totalAiCommits: 120,
    verified: true,
  },
  equipped: { equipped: [] },
  usage: { categories: [], totalCommits: 120 },
  languages: { languages: [{ name: 'TypeScript', color: '#3178c6', repoCount: 5 }] },
  pattern: { pattern: 'AI Native', aiRate: 0.7, alternationScore: 0.3 },
  flavor: 'Fully fused with Claude — ships at machine speed.',
  serial: '#7F3A',
  seed: 42,
  issuedYear: 2026,
}

describe('renderOgShare', () => {
  it('renders 1200x630 with username, grade, stats, no SMIL animation', () => {
    const svg = renderOgShare(data, 'dark')
    expect(svg).toContain('width="1200"')
    expect(svg).toContain('height="630"')
    expect(svg).toContain('testuser')
    expect(svg).toContain('VELOCITY')
    // PNG 化されるので SMIL アニメは不要かつ入れない
    expect(svg).not.toContain('animate')
    expect(svg).toMatchSnapshot()
  })
})
```

- [ ] **Step 4: 失敗を確認**

Run: `bunx vitest run tests/ogp.test.ts tests/svg/v2/ogShare.test.ts`
Expected: FAIL — ogShare モジュール不在。ピクセル検査は**フォント未同梱の現実装**（fontBuffers なし）に対して ink/total ≈ 0 で FAIL（= OGP 文字欠落バグの Red 再現。この Red を確認してから Step 5 に進むこと）

- [ ] **Step 5: ogp.ts へフォント同梱 + ogShare.ts 実装**

`src/ogp.ts` の先頭部を書き換え:

```typescript
import { Resvg, initWasm } from '@resvg/resvg-wasm'
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
import interBold from '../fonts/inter-bold-subset.ttf'
import interRegular from '../fonts/inter-regular-subset.ttf'

let initialized = false

async function ensureWasmInitialized(): Promise<void> {
  if (initialized) return
  await initWasm(resvgWasm)
  initialized = true
}

export async function svgToPng(svg: string, widthPx = 1200): Promise<Uint8Array> {
  await ensureWasmInitialized()
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: widthPx },
    font: {
      fontBuffers: [new Uint8Array(interRegular), new Uint8Array(interBold)],
      defaultFontFamily: 'Inter',
      loadSystemFonts: false,
    },
  })
  const rendered = resvg.render()
  return rendered.asPng()
}
```

vitest は `.ttf`/`.wasm` import を解決できないため、`tests/ogp.test.ts` が現状どう wasm を読んでいるか（alias/mock）を確認し、同じ方式で ttf を `fs.readFileSync('fonts/inter-regular-subset.ttf')` に差し替える vitest alias か `vi.mock` を用意する。既存 ogp.test.ts が通っている仕組みを壊さないこと（確認してから触る）。

`src/svg/v2/ogShare.ts`:

```typescript
import type { CardDataV2 } from '~/analyzers/types'
import { getTheme, type Theme } from '../themes'
import { svgRect, svgText } from '../utils'
import { TIER_GEM_COLORS } from './frame'

const W = 1200
const H = 630
const PAD = 72

function shareStatBar(label: string, value: number, y: number, theme: Theme): string {
  const barX = PAD + 230
  const barW = 420
  const filled = Math.round((barW * Math.max(0, Math.min(100, value))) / 100)
  return `${svgText(PAD, y + 16, label, { fontSize: 22, fill: theme.textSecondary, fontWeight: '600' })}
${svgRect(barX, y, barW, 20, { fill: theme.barBg, rx: 10 })}
${filled > 0 ? svgRect(barX, y, Math.max(filled, 20), 20, { fill: theme.accent, rx: 10 }) : ''}
${svgText(barX + barW + 20, y + 17, String(value), { fontSize: 24, fill: theme.text, fontWeight: 'bold' })}`
}

export function renderOgShare(data: CardDataV2, themeName: string): string {
  const theme = getTheme(themeName)
  const gemColor = TIER_GEM_COLORS[data.stats.grade]

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Inter">
${svgRect(0, 0, W, H, { fill: theme.bg })}
<rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="24" fill="none" stroke="${gemColor}" stroke-width="6" />
${svgText(PAD, 120, 'AI BUILDER', { fontSize: 24, fill: theme.textSecondary, fontWeight: '600' })}
${svgText(PAD, 180, data.username, { fontSize: 56, fill: theme.text, fontWeight: 'bold' })}
${svgText(PAD, 232, data.pattern.pattern, { fontSize: 30, fill: theme.accent, fontWeight: '600' })}
${shareStatBar('VELOCITY', data.stats.velocity, 300, theme)}
${shareStatBar('DIVERSITY', data.stats.diversity, 356, theme)}
${shareStatBar('CONSISTENCY', data.stats.consistency, 412, theme)}
<g transform="translate(${W - PAD - 180} 100)">
<polygon points="90,0 180,90 90,180 0,90" fill="${gemColor}" />
${svgText(90, 112, data.stats.grade, { fontSize: 64, fill: '#ffffff', fontWeight: 'bold', anchor: 'middle' })}
</g>
${svgText(PAD, H - 70, `${data.serial} · ${data.issuedYear} · public · 12wk`, { fontSize: 20, fill: theme.textSecondary })}
${svgText(W - PAD, H - 70, 'devcard-ai', { fontSize: 22, fill: theme.textSecondary, anchor: 'end' })}
</svg>`
}
```

- [ ] **Step 6: /og ルートを ogShare に切り替え（buildCardData 抽出）**

`src/handler.ts` をリファクタ: 分析部分を `buildCardData` として公開し、`handleRequest` はその薄いラッパにする。

```typescript
export interface BuildResult {
  kind: HandlerKind
  data?: CardDataV2
  errorMessage?: string
}

export async function buildCardData(
  params: RequestParams,
  graphql: GraphqlFn,
  now: Date = new Date(),
): Promise<BuildResult> {
  // 旧 handleRequest の try 節の中身をここへ移動。
  // return 形を { kind: 'not_found', errorMessage: 'User not found' } /
  // { kind: 'ok', data } に変換する。catch 節も同様に
  // { kind: 'error', errorMessage } を返す
}

export async function handleRequest(
  params: RequestParams,
  graphql: GraphqlFn,
  now: Date = new Date(),
): Promise<HandlerResult> {
  const r = await buildCardData(params, graphql, now)
  if (r.kind === 'ok' && r.data) {
    return { svg: renderCardV2(r.data, { theme: params.theme }), status: 200, kind: 'ok' }
  }
  return {
    svg: renderErrorCard(r.errorMessage ?? 'Temporarily unavailable', params.theme),
    status: 200,
    kind: r.kind,
  }
}
```

Task 7 の handler テストはそのまま通ること（公開挙動は不変 = リファクタの回帰ガード）。

`api/index.ts` の `/og` ブロックを書き換え:

```typescript
if (pathname === '/og') {
  const { user, theme, invalidUser } = parseParams(url)
  if (invalidUser || !user) {
    return new Response('Invalid user parameter', {
      status: 400,
      headers: { 'Cache-Control': 'public, max-age=3600' },
    })
  }
  if (await rateLimited(req, env)) return rateLimitedResponse()

  const githubApp = getApp(env)
  const octokit = await githubApp.getInstallationOctokit(
    Number(env.GITHUB_APP_INSTALLATION_ID),
  )
  const r = await buildCardData({ user, theme }, createGraphql(octokit))
  const svg =
    r.kind === 'ok' && r.data
      ? renderOgShare(r.data, theme)
      : renderErrorCard(r.errorMessage ?? 'Temporarily unavailable', theme)

  try {
    const png = await svgToPng(svg, 1200)
    return new Response(png as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (error) {
    console.error('SVG to PNG conversion failed:', error)
    return new Response('Image generation failed', { status: 500 })
  }
}
```

注意: この時点では parseParams は Task 7 形（`{ user, theme }`）のまま — `invalidUser` は Task 9 で導入されるため、**Task 8 の段階では `if (!user)` のみで 400 を返し、Task 9 で invalidUser 条件を追加**する。`renderOgpHtml`（src/ogp.ts）の `og:image:width/height` を 1200/630 に更新し、`tests/ogp.test.ts` の該当アサーションも更新する

- [ ] **Step 7: パス確認 + Commit**

Run: `bun run test && bun run typecheck`
Expected: 全 PASS（フォント回帰テスト含む）

```bash
git add fonts/ src/ogp.ts src/svg/v2/ogShare.ts src/types/wasm.d.ts src/handler.ts api/index.ts wrangler.toml tests/
git commit -m "fix(ogp): フォント同梱でPNGテキスト欠落を修正 + 1200x630シェア画像

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 8: デプロイ後の実機ゲート（リリース時に実施、記録必須）**

```bash
bunx wrangler deploy
curl -s "https://devcard-ai.sakimyto.workers.dev/og?user=sakimyto&theme=dark" -o /tmp/og-check.png
open /tmp/og-check.png  # テキストが描画されていることを目視
```

X card validator / Slack / Discord に URL を貼って画像が出ることを確認する（受け入れ条件2）

---

### Task 9: KV stale-if-error キャッシュ + 400/404 + プレースホルダ

**Files:**
- Create: `src/cache.ts`
- Create: `tests/cache.test.ts`
- Modify: `api/index.ts`, `wrangler.toml`

**Interfaces:**
- Consumes: `HandlerResult`（Task 7）、`renderPlaceholderCard`（Task 6）
- Produces: `getCachedOrProduce<T>(opts: SwrOptions<T>): Promise<{ value: T; cacheState: 'fresh' | 'stale' | 'miss' }>`
  - `SwrOptions<T> = { kv: KVNamespace; key: string; freshTtlSec: number; staleTtlSec: number; produce: () => Promise<T>; shouldCache?: (v: T) => boolean }`

- [ ] **Step 1: KV namespace を作成して binding を追加**

```bash
cd /Users/sakimyto/_pjsc/devcard-ai
bunx wrangler kv namespace create DEVCARD_KV
# 出力された id を wrangler.toml に貼る
```

`wrangler.toml` に追加（`<出力されたid>` を実値に置換）:

```toml
[[kv_namespaces]]
binding = "DEVCARD_KV"
id = "<出力されたid>"
```

- [ ] **Step 2: 失敗するテストを書く**

`tests/cache.test.ts`（KV は in-memory スタブ。ホスト副作用なし）:

```typescript
import { describe, expect, it, vi } from 'vitest'
import { getCachedOrProduce } from '~/cache'

function fakeKv() {
  const store = new Map<string, { value: string; storedAt: number }>()
  return {
    store,
    async get(key: string): Promise<string | null> {
      return store.get(key)?.value ?? null
    },
    async put(key: string, value: string): Promise<void> {
      store.set(key, { value, storedAt: Date.now() })
    },
  } as unknown as KVNamespace & { store: Map<string, { value: string; storedAt: number }> }
}

const NOW = 1_800_000_000_000

describe('getCachedOrProduce', () => {
  it('miss → produce, stores, returns miss', async () => {
    const kv = fakeKv()
    const r = await getCachedOrProduce({
      kv,
      key: 'k',
      freshTtlSec: 3600,
      staleTtlSec: 86400,
      now: () => NOW,
      produce: async () => 'value1',
    })
    expect(r).toEqual({ value: 'value1', cacheState: 'miss' })
    expect(await kv.get('k')).toContain('value1')
  })

  it('fresh hit → no produce call', async () => {
    const kv = fakeKv()
    const produce = vi.fn(async () => 'v2')
    await kv.put('k', JSON.stringify({ v: 'v1', at: NOW - 1000 * 60 }))
    const r = await getCachedOrProduce({
      kv, key: 'k', freshTtlSec: 3600, staleTtlSec: 86400, now: () => NOW, produce,
    })
    expect(r).toEqual({ value: 'v1', cacheState: 'fresh' })
    expect(produce).not.toHaveBeenCalled()
  })

  it('expired + produce ok → refresh', async () => {
    const kv = fakeKv()
    await kv.put('k', JSON.stringify({ v: 'old', at: NOW - 1000 * 60 * 60 * 2 }))
    const r = await getCachedOrProduce({
      kv, key: 'k', freshTtlSec: 3600, staleTtlSec: 86400, now: () => NOW,
      produce: async () => 'new',
    })
    expect(r).toEqual({ value: 'new', cacheState: 'miss' })
  })

  it('expired + produce throws + stale available → stale-if-error', async () => {
    const kv = fakeKv()
    await kv.put('k', JSON.stringify({ v: 'old', at: NOW - 1000 * 60 * 60 * 2 }))
    const r = await getCachedOrProduce({
      kv, key: 'k', freshTtlSec: 3600, staleTtlSec: 86400, now: () => NOW,
      produce: async () => {
        throw new Error('rate limited')
      },
    })
    expect(r).toEqual({ value: 'old', cacheState: 'stale' })
  })

  it('expired beyond staleTtl + produce throws → rethrows', async () => {
    const kv = fakeKv()
    await kv.put('k', JSON.stringify({ v: 'ancient', at: NOW - 1000 * 60 * 60 * 48 }))
    await expect(
      getCachedOrProduce({
        kv, key: 'k', freshTtlSec: 3600, staleTtlSec: 86400, now: () => NOW,
        produce: async () => {
          throw new Error('down')
        },
      }),
    ).rejects.toThrow('down')
  })

  it('shouldCache=false → returned but not stored', async () => {
    const kv = fakeKv()
    const r = await getCachedOrProduce({
      kv, key: 'k', freshTtlSec: 3600, staleTtlSec: 86400, now: () => NOW,
      produce: async () => 'err-card',
      shouldCache: () => false,
    })
    expect(r.cacheState).toBe('miss')
    expect(await kv.get('k')).toBeNull()
  })
})
```

- [ ] **Step 3: 失敗を確認**

Run: `bunx vitest run tests/cache.test.ts`
Expected: FAIL — モジュール不在

- [ ] **Step 4: 実装**

`src/cache.ts`:

```typescript
export interface SwrOptions<T> {
  kv: KVNamespace
  key: string
  freshTtlSec: number
  staleTtlSec: number
  produce: () => Promise<T>
  shouldCache?: (value: T) => boolean
  now?: () => number
}

interface Entry<T> {
  v: T
  at: number
}

export async function getCachedOrProduce<T>(
  opts: SwrOptions<T>,
): Promise<{ value: T; cacheState: 'fresh' | 'stale' | 'miss' }> {
  const nowMs = (opts.now ?? Date.now)()
  const raw = await opts.kv.get(opts.key)
  let entry: Entry<T> | null = null
  if (raw !== null) {
    try {
      entry = JSON.parse(raw) as Entry<T>
    } catch {
      entry = null
    }
  }

  const ageSec = entry ? (nowMs - entry.at) / 1000 : Number.POSITIVE_INFINITY

  if (entry && ageSec < opts.freshTtlSec) {
    return { value: entry.v, cacheState: 'fresh' }
  }

  try {
    const value = await opts.produce()
    if (opts.shouldCache?.(value) ?? true) {
      // KV 側の expirationTtl で staleTtl 超過分は自然消滅させる
      await opts.kv.put(opts.key, JSON.stringify({ v: value, at: nowMs }), {
        expirationTtl: opts.staleTtlSec,
      })
    }
    return { value, cacheState: 'miss' }
  } catch (error) {
    if (entry && ageSec < opts.staleTtlSec) {
      console.error('cache: produce failed, serving stale:', error)
      return { value: entry.v, cacheState: 'stale' }
    }
    throw error
  }
}
```

注意: fakeKv の `put` は第3引数を無視するので expirationTtl はテスト対象外（Workers 実機の挙動）。テストの fakeKv 型キャストはそのままでよい

- [ ] **Step 5: api/index.ts に配線（400/404/プレースホルダ含む）**

`api/index.ts` の SVG ルート（`/` で user あり）を以下の構造に書き換え:

```typescript
// parseParams の変更: 不正 user は '' に潰さず区別する
function parseParams(url: URL) {
  const rawUser = url.searchParams.get('user') ?? ''
  const userValid = rawUser === '' || GH_LOGIN_RE.test(rawUser)
  const user = userValid ? rawUser : ''
  const rawTheme = url.searchParams.get('theme') ?? 'light'
  const theme = VALID_THEMES.has(rawTheme) ? rawTheme : 'light'
  return { user, theme, invalidUser: !userValid }
}
```

ルーティング（fetch 内、SVG パス）:

```typescript
const { user, theme, invalidUser } = parseParams(url)

// 不正なユーザー名は 400（キャッシュ可）
if (invalidUser) {
  return new Response('Invalid user parameter', {
    status: 400,
    headers: { 'Cache-Control': 'public, max-age=3600' },
  })
}

// ... landing 分岐は現状のまま ...

if (await rateLimited(req, env)) return rateLimitedResponse()
const githubApp = getApp(env)
const octokit = await githubApp.getInstallationOctokit(Number(env.GITHUB_APP_INSTALLATION_ID))

let svg: string
let kind = 'error'
let cacheState = 'none'
try {
  const cached = await getCachedOrProduce({
    kv: env.DEVCARD_KV,
    key: `card:v2:${user}:${theme}`,
    freshTtlSec: 3600,
    staleTtlSec: 86400,
    produce: async () => {
      const result = await handleRequest({ user, theme }, createGraphql(octokit))
      if (result.kind === 'error') throw new Error('upstream error') // エラーカードはキャッシュせず stale 継続
      return { svg: result.svg, kind: result.kind }
    },
    shouldCache: (v) => v.kind === 'ok' || v.kind === 'not_found' || v.kind === 'no_ai' || v.kind === 'no_repos',
  })
  svg = cached.value.svg
  kind = cached.value.kind
  cacheState = cached.cacheState
} catch {
  // fresh も stale も無い完全失敗 → プレースホルダカード（エラー画像は出さない）
  svg = renderPlaceholderCard(user, theme)
  kind = 'placeholder'
}

// not_found: HTML を明示要求するクライアント（ブラウザ直叩き）には 404、
// 画像コンテキスト（GitHub camo / <img>）には 200 + エラーカード SVG を返す。
// 4xx を画像に返すと README で broken image になるための設計判断（spec 受け入れ条件4はこの解釈で満たす）
const accept = req.headers.get('accept') ?? ''
if (kind === 'not_found' && accept.includes('text/html')) {
  return new Response('User not found', {
    status: 404,
    headers: { 'Cache-Control': 'public, max-age=3600' },
  })
}

return new Response(svg, {
  status: 200,
  headers: {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    'X-Cache-State': cacheState,
  },
})
```

`Env` interface に `DEVCARD_KV: KVNamespace` を追加。`renderPlaceholderCard` を import。`/og` ルートにも同じ `invalidUser → 400` を先頭に入れる

- [ ] **Step 6: パス確認 + Commit**

Run: `bun run test && bun run typecheck && bunx wrangler deploy --dry-run`
Expected: 全 PASS + dry-run 成功（binding 不整合はここで検出）

```bash
git add src/cache.ts tests/cache.test.ts api/index.ts wrangler.toml
git commit -m "feat(infra): KV stale-if-error キャッシュ + 400/404 + プレースホルダカード

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Analytics Engine 計測

**Files:**
- Modify: `wrangler.toml`, `api/index.ts`
- Create: `src/analytics.ts`, `tests/analytics.test.ts`

**Interfaces:**
- Produces: `recordRender(dataset: AnalyticsEngineDataset | undefined, e: { user: string; theme: string; kind: string; cacheState: string }): void`（例外を握りつぶす fire-and-forget）

- [ ] **Step 1: wrangler.toml に binding 追加**

```toml
[[analytics_engine_datasets]]
binding = "CARD_ANALYTICS"
dataset = "devcard_renders"
```

- [ ] **Step 2: 失敗するテストを書く**

`tests/analytics.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import { recordRender } from '~/analytics'

describe('recordRender', () => {
  it('writes one data point with user index and blobs', () => {
    const writeDataPoint = vi.fn()
    recordRender({ writeDataPoint } as unknown as AnalyticsEngineDataset, {
      user: 'sakimyto', theme: 'dark', kind: 'ok', cacheState: 'fresh',
    })
    expect(writeDataPoint).toHaveBeenCalledWith({
      blobs: ['sakimyto', 'dark', 'ok', 'fresh'],
      indexes: ['sakimyto'],
    })
  })

  it('no-ops when dataset undefined and swallows write errors', () => {
    expect(() => recordRender(undefined, { user: 'u', theme: 'l', kind: 'ok', cacheState: 'miss' })).not.toThrow()
    const throwing = {
      writeDataPoint: () => {
        throw new Error('boom')
      },
    } as unknown as AnalyticsEngineDataset
    expect(() => recordRender(throwing, { user: 'u', theme: 'l', kind: 'ok', cacheState: 'miss' })).not.toThrow()
  })
})
```

- [ ] **Step 3: 失敗を確認 → 実装 → パス確認**

Run: `bunx vitest run tests/analytics.test.ts` → FAIL

`src/analytics.ts`:

```typescript
export interface RenderEvent {
  user: string
  theme: string
  kind: string
  cacheState: string
}

// 計測はベストエフォート。失敗してもレンダリングを止めない
export function recordRender(
  dataset: AnalyticsEngineDataset | undefined,
  e: RenderEvent,
): void {
  if (!dataset) return
  try {
    dataset.writeDataPoint({
      blobs: [e.user, e.theme, e.kind, e.cacheState],
      indexes: [e.user],
    })
  } catch (error) {
    console.error('analytics write failed:', error)
  }
}
```

`api/index.ts`: `Env` に `CARD_ANALYTICS?: AnalyticsEngineDataset` を追加し、SVG ルートの `return new Response(svg, ...)` 直前に `recordRender(env.CARD_ANALYTICS, { user, theme, kind, cacheState })` を挿入。`/og` ルートにも同様に挿入（kind は 'og'）

Run: `bun run test && bun run typecheck` → PASS

- [ ] **Step 4: Commit**

```bash
git add src/analytics.ts tests/analytics.test.ts api/index.ts wrangler.toml
git commit -m "feat(metrics): Analytics Engine で distinct レンダリングユーザー計測

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

distinct ユーザー数の確認クエリ（運用メモ、実装対象外）:

```sql
SELECT count(DISTINCT index1) FROM devcard_renders WHERE timestamp > now() - INTERVAL '30' DAY
```

---

### Task 11: LP v2（トレカコンセプト + 60秒埋め込み動線）

**Files:**
- Modify: `src/landing.ts`
- Create: `tests/landing.test.ts`

**Interfaces:**
- Produces: `renderLandingPage(): string`（静的 HTML。ユーザー入力のサーバー側補間なし = キャッシュ可・XSS 面ゼロ維持）

- [ ] **Step 1: 失敗するテストを書く**

`tests/landing.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { renderLandingPage } from '~/landing'

describe('renderLandingPage v2', () => {
  const html = renderLandingPage()

  it('has trading-card concept copy and title', () => {
    expect(html).toContain('AI Builder Trading Card')
    expect(html).toContain('devcard-ai')
  })

  it('has username input, markdown snippet output and copy button', () => {
    expect(html).toContain('id="username-input"')
    expect(html).toContain('id="markdown-output"')
    expect(html).toContain('id="copy-button"')
    expect(html).toContain('id="share-x"')
  })

  it('reads ?user= client-side with the GitHub login regex (no server interpolation)', () => {
    expect(html).toContain("searchParams.get('user')")
    expect(html).toContain('^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$')
    // サーバー側でユーザー入力を埋め込んでいないことの防御的確認
    expect(html).not.toContain('${user')
  })
})
```

- [ ] **Step 2: 失敗を確認**

Run: `bunx vitest run tests/landing.test.ts` → FAIL

- [ ] **Step 3: landing.ts を書き換え**

`src/landing.ts` 全文を置換。既存ファイルの CSS 変数・構造は流用してよいが、以下を必須要素とする（コピー文言は下記で確定。ヒーローの実カードは自分のカード `?user=sakimyto&theme=dark` を実例として埋める）:

```typescript
export function renderLandingPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>devcard-ai — AI Builder Trading Card</title>
  <meta name="description" content="Your AI coding style as a trading card. Rarity frames, archetype, stats — generated from your public GitHub activity. One line of markdown." />
  <meta property="og:title" content="devcard-ai — AI Builder Trading Card" />
  <meta property="og:description" content="Your AI coding style as a trading card. Proof you ship with AI." />
  <style>
    :root { --bg: #0d1117; --panel: #161b22; --border: #30363d; --text: #c9d1d9; --muted: #8b949e; --accent: #a371f7 }
    * { margin: 0; padding: 0; box-sizing: border-box }
    body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6 }
    .wrap { max-width: 880px; margin: 0 auto; padding: 48px 24px }
    h1 { font-size: 40px; letter-spacing: -0.02em }
    .sub { color: var(--muted); font-size: 18px; margin: 12px 0 32px }
    .hero-card { display: block; margin: 0 auto 40px; max-width: 375px; width: 100% }
    .builder { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 32px }
    .builder label { display: block; font-size: 13px; color: var(--muted); margin-bottom: 8px }
    .row { display: flex; gap: 8px; flex-wrap: wrap }
    input#username-input { flex: 1; min-width: 200px; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 10px 14px; border-radius: 8px; font-size: 15px }
    button { background: var(--accent); border: 0; color: #fff; padding: 10px 18px; border-radius: 8px; font-size: 15px; cursor: pointer; font-weight: 600 }
    button.ghost { background: transparent; border: 1px solid var(--border); color: var(--text) }
    pre#markdown-output { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 14px; margin-top: 16px; overflow-x: auto; font-size: 13px; white-space: pre-wrap; word-break: break-all }
    .steps { color: var(--muted); font-size: 14px; margin-top: 10px }
    footer { color: var(--muted); font-size: 13px; margin-top: 48px; text-align: center }
    a { color: var(--accent) }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Your AI coding style,<br/>as a trading card.</h1>
    <p class="sub">devcard-ai — AI Builder Trading Card. Rarity frame, archetype, stats. Generated from your public GitHub activity. Embedded with one line of markdown.</p>
    <img class="hero-card" src="/?user=sakimyto&theme=dark" alt="Example AI Builder Trading Card" />
    <div class="builder">
      <label for="username-input">GitHub username</label>
      <div class="row">
        <input id="username-input" placeholder="octocat" autocomplete="off" spellcheck="false" />
        <button id="generate-button">Summon my card</button>
      </div>
      <pre id="markdown-output" hidden></pre>
      <div class="row" style="margin-top:12px">
        <button id="copy-button" hidden>Copy markdown</button>
        <a id="share-x" hidden target="_blank" rel="noopener"><button class="ghost">Share on X</button></a>
      </div>
      <p class="steps">1. Summon → 2. Copy → 3. Paste into your profile README. Done in 60 seconds.</p>
    </div>
    <footer>
      <a href="https://github.com/sakimyto/devcard-ai">GitHub</a> · MIT · stats from public repos, last 12 weeks
    </footer>
  </div>
  <script>
    const RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/
    const input = document.getElementById('username-input')
    const output = document.getElementById('markdown-output')
    const copyBtn = document.getElementById('copy-button')
    const shareX = document.getElementById('share-x')
    const base = location.origin

    function summon() {
      const u = input.value.trim()
      if (!RE.test(u)) { input.focus(); return }
      const cardUrl = base + '/?user=' + encodeURIComponent(u) + '&theme=dark'
      const md = '[![AI Builder Trading Card](' + cardUrl + ')](' + base + ')'
      output.textContent = md
      output.hidden = false
      copyBtn.hidden = false
      shareX.hidden = false
      shareX.href = 'https://twitter.com/intent/tweet?text=' +
        encodeURIComponent('Summoned my AI Builder Trading Card 🃏 ' + cardUrl)
      const hero = document.querySelector('.hero-card')
      hero.src = cardUrl
    }

    document.getElementById('generate-button').addEventListener('click', summon)
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') summon() })
    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(output.textContent)
      copyBtn.textContent = 'Copied!'
      setTimeout(() => { copyBtn.textContent = 'Copy markdown' }, 1500)
    })

    const fromQuery = new URLSearchParams(location.search).get('user')
    if (fromQuery && RE.test(fromQuery)) { input.value = fromQuery; summon() }
  </script>
</body>
</html>`
}
```

- [ ] **Step 4: パス確認 + Commit**

Run: `bun run test && bun run typecheck` → PASS

```bash
git add src/landing.ts tests/landing.test.ts
git commit -m "feat(lp): トレカコンセプトLP + ?user引き継ぎ/コピー/Xシェア動線

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 12: 統合検証・最終ゲート

**Files:**
- Modify: 修正が出た箇所のみ

- [ ] **Step 1: 全スイート + 静的検査**

Run: `bun run test && bun run typecheck && bun run lint && bunx wrangler deploy --dry-run`
Expected: 全 PASS

- [ ] **Step 2: ビジュアルマトリクス最終確認（受け入れ条件1）**

```bash
bun run scripts/visual-preview.ts
for f in /tmp/devcard-visual/*.svg; do qlmanage -t -s 750 -o /tmp/devcard-visual "$f" >/dev/null 2>&1; done
open /tmp/devcard-visual
```

10枚（S/A/B/C/D × light/dark）を目視: 文字重なり・はみ出しなし、レアリティ枠が判別可能、D でも惨めに見えないこと

- [ ] **Step 3: ローカル実機確認**

```bash
bun run dev &
sleep 3
curl -s "http://localhost:8787/?user=sakimyto&theme=dark" | head -c 200        # v2 SVG が返る
curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:8787/?user=bad--name"  # 400
curl -s -o /dev/null -w '%{http_code}\n' -H 'Accept: text/html' "http://localhost:8787/?user=zzz-no-such-user-zzz99"  # 404
curl -s "http://localhost:8787/og?user=sakimyto&theme=dark" -o /tmp/og-local.png && open /tmp/og-local.png  # 文字あり
kill %1
```

- [ ] **Step 4: デプロイ + 本番スモーク（受け入れ条件2,4,6）**

```bash
bunx wrangler deploy
curl -s -o /dev/null -w '%{http_code}\n' "https://devcard-ai.sakimyto.workers.dev/?user=sakimyto&theme=dark"  # 200
curl -s "https://devcard-ai.sakimyto.workers.dev/og?user=sakimyto&theme=dark" -o /tmp/og-prod.png && open /tmp/og-prod.png
# X card validator でシェア画像を確認、README の自分のカードを目視
# Analytics: 数分後に
bunx wrangler analytics-engine sql "SELECT count(DISTINCT index1) FROM devcard_renders" 2>/dev/null || echo "dashboard で確認: Workers > Analytics Engine"
```

- [ ] **Step 5: 受け入れ条件チェックリストを埋めて README 更新**

- README.md のカード説明を v2 内容（レアリティ・ステータス・12週窓）に更新し、Add to your README 節はそのまま維持
- spec の受け入れ条件 1-6 に ✅/❌ を記入した結果をコミットメッセージに含める

```bash
git add README.md
git commit -m "docs: README を v2 Trading Card Edition に更新

受け入れ条件: 1)ビジュアル10枚 ✅ 2)OGPテキスト ✅ 3)窓統一 ✅ 4)400/404 ✅ 5)テスト全パス ✅ 6)Analytics ✅

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## スペック → タスク対応表

| スペック節 | タスク |
|---|---|
| S1 レアリティ/フレーム | Task 6 |
| S1 アーキタイプ紋章 | Task 6 |
| S1 レイアウト/アート/シリアル/フレーバー | Task 4, 5, 6 |
| S2 検出拡張（マーカー/equipped/bot） | Task 1, 2 |
| S2 時間窓統一 | Task 3, 7 |
| S2 ステータス/Grade | Task 3 |
| S3 OGP フォント + 1200×630 | Task 8 |
| S3 入力防御（400/404/エスケープ監査） | Task 9, 11 |
| S3 キャッシュ・耐障害 | Task 9 |
| S3 計測 | Task 10 |
| S3 LP 追随 | Task 11 |
| S4 テスト戦略 | 各タスク + Task 12 |
| 受け入れ条件 1-6 | Task 12 |
