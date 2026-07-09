import type { GitHubCommit } from '~/github/types'
import type { Grade, StatsAnalysis, UsageAnalysis } from './types'

const WINDOW_WEEKS = 12
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
// 週平均25 AIコミットで VELOCITY 100（対数正規化の上限アンカー）
const VELOCITY_CAP_PER_WEEK = 25
// DIVERSITY: ツール4種で満点。証跡の強さで重み付け（committed 1.0 / assisted 0.75 / equipped 0.5）
const TOOL_FULL_COUNT = 4
const ASSISTED_TOOL_WEIGHT = 0.75
const EQUIPPED_TOOL_WEIGHT = 0.5

export interface StatsInput {
  windowAiCommits: GitHubCommit[]
  commitToolCount: number
  // committed に居ないツールのみを算入（呼び出し側で重複排除済み）
  assistedToolCount: number
  equippedOnlyCount: number
  usage: UsageAnalysis
  // v2.2 レーダー3軸の入力（全て同一12週窓・決定論）。呼び出し側が常に渡すが、
  // 既存アンカーテストを無改変で緑に保つため optional（未指定は 0 相当 = 各軸 0）。
  totalCommitsInWindow?: number // 窓内の全コミット数（AI + 人間）。SYNERGY の分母
  alternationScore?: number // 窓内コミットの人間↔AI交互性 0-1（pattern.alternationScore）
  langCount?: number // languages.languages.length
  activeRepoCount?: number // 窓内コミットが1件以上あるリポジトリ数
  now?: Date
}

export function gradeFromPoints(points: number): Grade {
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
    if (!Number.isFinite(ts)) continue
    const diffMs = nowMs - ts
    // filterToWindow の cutoff（ts >= now - 84日）と inclusive 境界を揃える。
    // ちょうど84日前(diffMs === WINDOW_WEEKS*MS_PER_WEEK)は floor で週12になり得るため、
    // 最終週(WINDOW_WEEKS-1)にクランプして境界コミットの取りこぼしを防ぐ。
    if (diffMs < 0 || diffMs > WINDOW_WEEKS * MS_PER_WEEK) continue
    const weeksAgo = Math.min(WINDOW_WEEKS - 1, Math.floor(diffMs / MS_PER_WEEK))
    weekBins[weeksAgo] += 1
  }

  const aiCommitsInWindow = weekBins.reduce((a, b) => a + b, 0)
  const activeWeeks = weekBins.filter((n) => n > 0).length

  const perWeekAvg = aiCommitsInWindow / WINDOW_WEEKS
  const velocity = Math.min(
    100,
    Math.round((100 * Math.log(1 + perWeekAvg)) / Math.log(1 + VELOCITY_CAP_PER_WEEK)),
  )

  const effectiveTools =
    input.commitToolCount +
    ASSISTED_TOOL_WEIGHT * input.assistedToolCount +
    EQUIPPED_TOOL_WEIGHT * input.equippedOnlyCount
  const toolScore = Math.min(1, effectiveTools / TOOL_FULL_COUNT)
  const diversity = Math.round(100 * (0.6 * toolScore + 0.4 * usageEntropyNorm(input.usage)))

  const consistency = Math.round((100 * activeWeeks) / WINDOW_WEEKS)

  // Grade は従来3軸のまま（V40/D30/C30・閾値80/60/40/20）。新3軸は points に一切寄与しない
  // ので、既存ユーザーのティアは動かない。
  const points = Math.round(0.4 * velocity + 0.3 * diversity + 0.3 * consistency)

  // --- v2.2 レーダー3軸 ---
  const totalInWindow = input.totalCommitsInWindow ?? 0
  const synergy = Math.round(100 * Math.min(1, aiCommitsInWindow / Math.max(1, totalInWindow)))
  const flow = Math.round(100 * Math.max(0, Math.min(1, input.alternationScore ?? 0)))
  const langCount = input.langCount ?? 0
  const activeRepoCount = input.activeRepoCount ?? 0
  const range = Math.round(
    100 * (0.5 * Math.min(1, langCount / 3) + 0.5 * Math.min(1, activeRepoCount / 6)),
  )

  // POWER: 6軸合計 × 17（最大10,200）。トップ層だけが over-9000 に届くキャリブレーション
  const power = Math.round((velocity + diversity + consistency + synergy + range + flow) * 17)

  return {
    velocity,
    diversity,
    consistency,
    synergy,
    range,
    flow,
    points,
    grade: gradeFromPoints(points),
    power,
    aiCommitsInWindow,
    activeWeeks,
  }
}
