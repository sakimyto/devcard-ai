import type { GitHubCommit } from '~/github/types'
import type { VelocityAnalysis } from './types'

const WINDOW_WEEKS = 12
const MS_PER_DAY = 24 * 60 * 60 * 1000

function startOfUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export function analyzeVelocity(
  aiCommits: GitHubCommit[],
  now: Date = new Date(),
): VelocityAnalysis {
  const sparkline = new Array<number>(WINDOW_WEEKS).fill(0)

  if (aiCommits.length === 0) {
    return {
      weeksActive: 0,
      commitsPerWeek: 0,
      sparkline,
      firstAiDate: null,
      daysSinceFirst: 0,
    }
  }

  const nowStart = startOfUtcDay(now)

  let firstTs = Number.POSITIVE_INFINITY
  for (const c of aiCommits) {
    const ts = Date.parse(c.committedDate)
    if (!Number.isFinite(ts)) continue
    const dayStart = startOfUtcDay(new Date(ts))
    const daysAgo = Math.floor((nowStart - dayStart) / MS_PER_DAY)
    if (daysAgo < 0) continue
    if (dayStart < firstTs) firstTs = dayStart
    const weeksAgo = Math.floor(daysAgo / 7)
    if (weeksAgo >= WINDOW_WEEKS) continue
    const bin = WINDOW_WEEKS - 1 - weeksAgo
    sparkline[bin] += 1
  }

  const totalInWindow = sparkline.reduce((a, b) => a + b, 0)
  const weeksActive = sparkline.filter((n) => n > 0).length
  const commitsPerWeek =
    weeksActive === 0 ? 0 : Math.round((totalInWindow / weeksActive) * 10) / 10

  const firstAiDate =
    firstTs === Number.POSITIVE_INFINITY
      ? null
      : new Date(firstTs).toISOString().slice(0, 10)
  const daysSinceFirst =
    firstTs === Number.POSITIVE_INFINITY
      ? 0
      : Math.floor((nowStart - firstTs) / MS_PER_DAY)

  return {
    weeksActive,
    commitsPerWeek,
    sparkline,
    firstAiDate,
    daysSinceFirst,
  }
}
