import type { GitHubCommit } from '~/github/types'
import type {
  ToolAttributionAnalysis,
  UsageAnalysis,
  VelocityAnalysis,
} from './types'

export interface Badge {
  id: string
  label: string
  icon: string
}

export interface BadgeAnalysis {
  badges: Badge[]
  totalAiCommits: number
  aiStreakDays: number
  firstAiDate: string | null
}

function utcDayMs(isoDate: string): number {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function startOfUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

const DAY_MS = 86_400_000

// A streak only counts if the most recent AI day is today or yesterday —
// otherwise we'd surface stale historical runs as a "current" streak, which
// is misleading in a hiring-signal context.
function computeStreak(aiCommits: GitHubCommit[], now: Date): number {
  if (aiCommits.length === 0) return 0

  const uniqueDays = new Set<number>()
  for (const c of aiCommits) {
    uniqueDays.add(utcDayMs(c.committedDate))
  }
  const sorted = [...uniqueDays].sort((a, b) => b - a)

  const today = startOfUtcDay(now)
  const daysSinceMostRecent = (today - sorted[0]) / DAY_MS
  if (daysSinceMostRecent > 1) return 0

  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const gap = (sorted[i - 1] - sorted[i]) / DAY_MS
    if (gap === 1) streak++
    else break
  }
  return streak
}

export function analyzeBadges(
  aiCommits: GitHubCommit[],
  toolAttribution: ToolAttributionAnalysis,
  usage: UsageAnalysis,
  velocity: VelocityAnalysis,
  now: Date = new Date(),
): BadgeAnalysis {
  const badges: Badge[] = []

  const realTools = toolAttribution.tools.filter((t) => t.toolId !== 'unknown')

  if (realTools.length >= 3) {
    badges.push({ id: 'multi-tool', label: 'Multi-Tool', icon: '🛠' })
  }

  const meaningfulTools = realTools.filter((t) => t.commitCount >= 5)
  if (meaningfulTools.length >= 2) {
    badges.push({ id: 'parallel', label: 'Parallel', icon: '⚡' })
  }

  if (toolAttribution.totalAiCommits >= 100) {
    badges.push({ id: 'centurion', label: 'Centurion', icon: '💯' })
  }

  const testCat = usage.categories.find((c) => c.category === 'test')
  if (testCat && testCat.percentage >= 20) {
    badges.push({ id: 'tdd-ai', label: 'TDD with AI', icon: '🧪' })
  }

  if (velocity.weeksActive >= 8 && velocity.commitsPerWeek >= 3) {
    badges.push({ id: 'shipper', label: 'Shipper', icon: '🚢' })
  }

  // Streak is surfaced via the stats line ('{n}d streak'), not duplicated as a pill.
  const streak = computeStreak(aiCommits, now)

  return {
    badges,
    totalAiCommits: toolAttribution.totalAiCommits,
    aiStreakDays: streak,
    firstAiDate: velocity.firstAiDate?.slice(0, 7) ?? null,
  }
}
