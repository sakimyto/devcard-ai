import { describe, expect, it } from 'vitest'
import { analyzeRecord } from '~/analyzers/record'
import type { ContributionsCollection } from '~/github/types'

// Time-of-day must not matter: analysis normalizes to the UTC day.
const NOW = new Date('2026-04-22T09:30:00Z')
const MS_PER_DAY = 24 * 60 * 60 * 1000

// Build a calendar from an explicit {date,count} list, chunked into 7-day weeks so
// the shape matches GitHub's response. Totals default to the sum of daily counts.
function cc(
  days: { date: string; contributionCount: number }[],
  totals: Partial<Omit<ContributionsCollection, 'contributionCalendar'>> = {},
): ContributionsCollection {
  const weeks: { contributionDays: { date: string; contributionCount: number }[] }[] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push({ contributionDays: days.slice(i, i + 7) })
  }
  const total = days.reduce((a, d) => a + d.contributionCount, 0)
  return {
    totalCommitContributions: totals.totalCommitContributions ?? 0,
    totalPullRequestContributions: totals.totalPullRequestContributions ?? 0,
    totalPullRequestReviewContributions: totals.totalPullRequestReviewContributions ?? 0,
    totalIssueContributions: totals.totalIssueContributions ?? 0,
    restrictedContributionsCount: totals.restrictedContributionsCount ?? 0,
    contributionCalendar: { totalContributions: total, weeks },
  }
}

// A run of consecutive UTC days ending `endDaysAgo` days before NOW, each with `count`.
function run(
  endDaysAgo: number,
  length: number,
  count = 1,
): { date: string; contributionCount: number }[] {
  const out: { date: string; contributionCount: number }[] = []
  for (let i = length - 1; i >= 0; i--) {
    const d = new Date(NOW.getTime() - (endDaysAgo + i) * MS_PER_DAY)
    out.push({ date: d.toISOString().slice(0, 10), contributionCount: count })
  }
  return out
}

describe('analyzeRecord', () => {
  it('returns all zeros for null/undefined contributionsCollection', () => {
    for (const input of [null, undefined]) {
      const r = analyzeRecord(input, NOW)
      expect(r).toEqual({
        exp: 0,
        commits: 0,
        prs: 0,
        reviews: 0,
        issues: 0,
        inclPrivate: false,
        currentStreak: 0,
        longestStreak: 0,
      })
    }
  })

  it('maps totals: exp=calendar.totalContributions, commits/prs/reviews/issues', () => {
    const r = analyzeRecord(
      cc(run(1, 3, 2), {
        totalCommitContributions: 40,
        totalPullRequestContributions: 7,
        totalPullRequestReviewContributions: 12,
        totalIssueContributions: 3,
      }),
      NOW,
    )
    expect(r.exp).toBe(6) // 3 days × 2
    expect(r.commits).toBe(40)
    expect(r.prs).toBe(7)
    expect(r.reviews).toBe(12)
    expect(r.issues).toBe(3)
  })

  it('inclPrivate reflects restrictedContributionsCount > 0', () => {
    expect(analyzeRecord(cc([], { restrictedContributionsCount: 5 }), NOW).inclPrivate).toBe(true)
    expect(analyzeRecord(cc([], { restrictedContributionsCount: 0 }), NOW).inclPrivate).toBe(false)
  })

  it('all-zero calendar → 0/0 streak', () => {
    const days = run(1, 10, 0) // 10 consecutive days, all count 0
    const r = analyzeRecord(cc(days), NOW)
    expect(r.currentStreak).toBe(0)
    expect(r.longestStreak).toBe(0)
  })

  it('active today only → current 1, longest 1', () => {
    const r = analyzeRecord(cc(run(0, 1, 4)), NOW) // today (0 days ago)
    expect(r.currentStreak).toBe(1)
    expect(r.longestStreak).toBe(1)
  })

  it('today 0, previous 3 days active → current 3 (counts from yesterday)', () => {
    const days = [
      ...run(1, 3, 1), // yesterday, -2, -3
      { date: new Date(NOW.getTime()).toISOString().slice(0, 10), contributionCount: 0 }, // today = 0
    ]
    const r = analyzeRecord(cc(days), NOW)
    expect(r.currentStreak).toBe(3)
  })

  it('today 0 and yesterday 0 → current 0 even if older run exists', () => {
    const days = [
      ...run(3, 4, 1), // an older 4-day run
      {
        date: new Date(NOW.getTime() - MS_PER_DAY).toISOString().slice(0, 10),
        contributionCount: 0,
      },
      { date: new Date(NOW.getTime()).toISOString().slice(0, 10), contributionCount: 0 },
    ]
    const r = analyzeRecord(cc(days), NOW)
    expect(r.currentStreak).toBe(0)
    expect(r.longestStreak).toBe(4)
  })

  it('longest streak ignores gaps and picks the max run', () => {
    // A 5-day run, a 1-day gap, then a 2-day run ending today.
    const days = [
      ...run(10, 5, 1), // 5 consecutive
      // gap at -9 .. handled implicitly by absence; add explicit zero to prove gaps break runs
      {
        date: new Date(NOW.getTime() - 5 * MS_PER_DAY).toISOString().slice(0, 10),
        contributionCount: 0,
      },
      ...run(0, 2, 1), // today + yesterday
    ]
    const r = analyzeRecord(cc(days), NOW)
    expect(r.longestStreak).toBe(5)
    expect(r.currentStreak).toBe(2)
  })

  it('degrades when contributionCalendar/weeks are missing (no crash, zero streaks)', () => {
    const partial = {
      totalCommitContributions: 5,
      totalPullRequestContributions: 1,
      totalPullRequestReviewContributions: 0,
      totalIssueContributions: 0,
      restrictedContributionsCount: 0,
    } as unknown as ContributionsCollection
    const r = analyzeRecord(partial, NOW)
    expect(r.exp).toBe(0)
    expect(r.commits).toBe(5)
    expect(r.currentStreak).toBe(0)
    expect(r.longestStreak).toBe(0)
  })
})
