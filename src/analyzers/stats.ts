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
