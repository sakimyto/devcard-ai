import { describe, expect, it } from 'vitest'
import { analyzeStats, gradeFromPoints } from '~/analyzers/stats'
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

  it('counts a commit exactly at the 84-day boundary (consistent with filterToWindow)', () => {
    const boundary: GitHubCommit = {
      oid: 'boundary',
      message: 'feat: x',
      committedDate: new Date(NOW.getTime() - 84 * 24 * 60 * 60 * 1000).toISOString(),
      author: { user: { login: 'u' } },
    }
    const s = analyzeStats({
      windowAiCommits: [boundary],
      commitToolCount: 0,
      equippedOnlyCount: 0,
      usage: singleUsage,
      now: NOW,
    })
    expect(s.aiCommitsInWindow).toBe(1)
    expect(s.activeWeeks).toBe(1)
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

  it('gradeFromPoints pins A/B/C/D/S boundary edges (20/40/60/80)', () => {
    // C/D edge at 20
    expect(gradeFromPoints(19)).toBe('D')
    expect(gradeFromPoints(20)).toBe('C')
    // B/C edge at 40
    expect(gradeFromPoints(39)).toBe('C')
    expect(gradeFromPoints(40)).toBe('B')
    // A/B edge at 60
    expect(gradeFromPoints(59)).toBe('B')
    expect(gradeFromPoints(60)).toBe('A')
    // S/A edge at 80
    expect(gradeFromPoints(79)).toBe('A')
    expect(gradeFromPoints(80)).toBe('S')
  })
})
