import type { ContributionsCollection } from '~/github/types'

export interface RecordAnalysis {
  exp: number // calendar.totalContributions (restricted only if the user made it public)
  commits: number // totalCommitContributions
  prs: number // totalPullRequestContributions
  reviews: number // totalPullRequestReviewContributions
  issues: number // totalIssueContributions
  inclPrivate: boolean // restrictedContributionsCount > 0
  currentStreak: number // consecutive active days ending today (or yesterday if today is 0)
  longestStreak: number // longest consecutive active-day run within the window
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

const ZERO: RecordAnalysis = {
  exp: 0,
  commits: 0,
  prs: 0,
  reviews: 0,
  issues: 0,
  inclPrivate: false,
  currentStreak: 0,
  longestStreak: 0,
}

function startOfUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

// Deterministic: `now` is injected and every calendar date is compared as a UTC day
// (GitHub emits date-only 'YYYY-MM-DD' strings, which Date.parse reads as UTC midnight).
export function analyzeRecord(
  cc: ContributionsCollection | null | undefined,
  now: Date,
): RecordAnalysis {
  if (!cc) return { ...ZERO }

  const calendar = cc.contributionCalendar
  const weeks = calendar?.weeks ?? []

  // Set of UTC-day timestamps that had at least one contribution.
  const activeDays = new Set<number>()
  for (const w of weeks) {
    for (const day of w.contributionDays ?? []) {
      if (day.contributionCount > 0) {
        const ts = Date.parse(day.date)
        if (Number.isFinite(ts)) activeDays.add(startOfUtcDay(new Date(ts)))
      }
    }
  }

  // Current streak: walk back from today; if today is idle, start from yesterday.
  let cursor = startOfUtcDay(now)
  if (!activeDays.has(cursor)) cursor -= MS_PER_DAY
  let currentStreak = 0
  while (activeDays.has(cursor)) {
    currentStreak++
    cursor -= MS_PER_DAY
  }

  // Longest streak: from each run-start (a day whose predecessor is idle) walk forward.
  let longestStreak = 0
  for (const ts of activeDays) {
    if (activeDays.has(ts - MS_PER_DAY)) continue // not a run start
    let len = 0
    let d = ts
    while (activeDays.has(d)) {
      len++
      d += MS_PER_DAY
    }
    if (len > longestStreak) longestStreak = len
  }

  return {
    exp: calendar?.totalContributions ?? 0,
    commits: cc.totalCommitContributions ?? 0,
    prs: cc.totalPullRequestContributions ?? 0,
    reviews: cc.totalPullRequestReviewContributions ?? 0,
    issues: cc.totalIssueContributions ?? 0,
    inclPrivate: (cc.restrictedContributionsCount ?? 0) > 0,
    currentStreak,
    longestStreak,
  }
}
