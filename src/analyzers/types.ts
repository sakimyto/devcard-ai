import type { ElementResult } from './element'
import type { RecordAnalysis } from './record'
import type { Trait } from './traits'

export interface CoauthorAnalysis {
  totalCommits: number
  aiCommits: number
  rate: number // 0-1
}

// === Stats (v2) ===
export type Grade = 'S' | 'A' | 'B' | 'C' | 'D'
export interface StatsAnalysis {
  velocity: number // 0-100
  diversity: number // 0-100
  consistency: number // 0-100
  synergy: number // 0-100, AI-involved commit rate
  range: number // 0-100, language + active-repo breadth
  flow: number // 0-100, human↔AI alternation over the window
  points: number // 0-100, V40/D30/C30 (unchanged — drives Grade)
  grade: Grade
  power: number // 0-10200, (v+d+c+syn+range+flow)*17 — the over-9000 headline number
  aiCommitsInWindow: number
  activeWeeks: number // 0-12
}

// === Tool Attribution ===
export interface ToolAttribution {
  toolId: string
  toolName: string
  commitCount: number
  percentage: number
}
// assisted: 本文文脈でレビュアー的に使われた AI ツール。committed（tools）に既に居る
// ツールは上位証跡なのでここには重複して出さない。count 降順 → toolId 昇順。
export interface AssistedTool {
  toolId: string
  toolName: string
  count: number
}
export interface ToolAttributionAnalysis {
  tools: ToolAttribution[]
  assisted: AssistedTool[]
  totalAiCommits: number
  verified: boolean
}

// === Equipped (config-file signals) ===
export interface EquippedTool {
  toolId: string
  toolName: string
  repoCount: number
}
export interface EquippedAnalysis {
  equipped: EquippedTool[]
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

// === Velocity ===
export interface VelocityAnalysis {
  weeksActive: number // distinct weeks with AI commits in last 12
  commitsPerWeek: number // total-in-window / weeksActive (1 decimal)
  sparkline: number[] // length 12, oldest → newest
  firstAiDate: string | null // 'YYYY-MM-DD'
  daysSinceFirst: number // days from first AI commit to now (UTC days)
}

// === Card Data (v2) ===
export interface CardDataV2 {
  username: string
  stats: StatsAnalysis
  toolAttribution: ToolAttributionAnalysis
  equipped: EquippedAnalysis
  usage: UsageAnalysis
  languages: LanguageAnalysis
  pattern: PatternAnalysis
  // Contribution record (EXP/streak/PR·review counts). Display-only — never feeds
  // Grade or POWER (tier-invariance rule).
  record: RecordAnalysis
  // v2.6 TCG-density signals. Display-only — like `record`, never feed Grade or POWER.
  // element: dominant radar axis → chip on the archetype row. epithet: builder-type name
  // (internal 4-axis code is discarded). traits: up to 2 activated traits; [] → flavor shows.
  element: ElementResult
  epithet: string
  traits: Trait[]
  flavor: string
  serial: string
  seed: number
  issuedYear: number
  // Circular avatar medallion source. Always a self-built `data:` URI (never a remote
  // http(s) URL — those are blocked in GitHub's <img>/camo context) or null when the
  // fetch failed; the card degrades gracefully with no medallion.
  avatarDataUri: string | null
}
