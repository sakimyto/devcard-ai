import { describe, expect, it } from 'vitest'
import { analyzeStats } from '~/analyzers/stats'
import type { UsageAnalysis } from '~/analyzers/types'
import type { GitHubCommit } from '~/github/types'

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
  it('zero commits → all-zero stats without a rank', () => {
    const s = analyzeStats({
      windowAiCommits: [],
      commitToolCount: 0,
      assistedToolCount: 0,
      equippedOnlyCount: 0,
      usage: { categories: [], totalCommits: 0 },
      now: NOW,
    })
    expect(s).toEqual({
      velocity: 0,
      diversity: 0,
      consistency: 0,
      synergy: 0,
      range: 0,
      flow: 0,
      power: 0,
      aiCommitsInWindow: 0,
      activeWeeks: 0,
    })
  })

  it('heavy consistent user with diverse tools/usage reaches full visible stats', () => {
    const s = analyzeStats({
      windowAiCommits: commitsPerWeek(25, 12),
      commitToolCount: 3,
      assistedToolCount: 0,
      equippedOnlyCount: 2,
      usage: evenUsage,
      now: NOW,
    })
    expect(s.velocity).toBe(100)
    expect(s.consistency).toBe(100)
    expect(s.diversity).toBe(100)
    expect(s.activeWeeks).toBe(12)
    expect(s).not.toHaveProperty('grade')
    expect(s).not.toHaveProperty('points')
  })

  it('monotone: more velocity never lowers POWER', () => {
    const base = {
      commitToolCount: 1,
      assistedToolCount: 0,
      equippedOnlyCount: 0,
      usage: singleUsage,
      now: NOW,
    }
    const low = analyzeStats({ ...base, windowAiCommits: commitsPerWeek(1, 6) })
    const high = analyzeStats({ ...base, windowAiCommits: commitsPerWeek(10, 6) })
    expect(high.velocity).toBeGreaterThan(low.velocity)
    expect(high.power).toBeGreaterThanOrEqual(low.power)
  })

  it('consistency = activeWeeks / 12', () => {
    const s = analyzeStats({
      windowAiCommits: commitsPerWeek(2, 6),
      commitToolCount: 1,
      assistedToolCount: 0,
      equippedOnlyCount: 0,
      usage: singleUsage,
      now: NOW,
    })
    expect(s.activeWeeks).toBe(6)
    expect(s.consistency).toBe(50)
  })

  it('DIVERSITY weights committed 1.0 / assisted 0.75 / equipped 0.5 (numeric anchors)', () => {
    // singleUsage → usageEntropyNorm = 0, so diversity = round(100 * 0.6 * toolScore).
    // toolScore = (committed + 0.75*assisted + 0.5*equippedOnly) / 4, capped at 1.
    const base = {
      windowAiCommits: commitsPerWeek(2, 6),
      usage: singleUsage,
      now: NOW,
    }
    // committed=1 only → toolScore 0.25 → round(60 * 0.25) = 15
    expect(
      analyzeStats({ ...base, commitToolCount: 1, assistedToolCount: 0, equippedOnlyCount: 0 })
        .diversity,
    ).toBe(15)
    // committed=1 + assisted=1 → toolScore 0.4375 → round(60 * 0.4375) = round(26.25) = 26
    expect(
      analyzeStats({ ...base, commitToolCount: 1, assistedToolCount: 1, equippedOnlyCount: 0 })
        .diversity,
    ).toBe(26)
    // committed=1 + assisted=1 + equipped=1 → toolScore 0.5625 → round(60 * 0.5625) = 34
    expect(
      analyzeStats({ ...base, commitToolCount: 1, assistedToolCount: 1, equippedOnlyCount: 1 })
        .diversity,
    ).toBe(34)
  })

  it('assisted tools raise diversity, but less than committed (0.75 < 1.0)', () => {
    const base = {
      windowAiCommits: commitsPerWeek(2, 6),
      usage: singleUsage,
      now: NOW,
    }
    const committed = analyzeStats({
      ...base,
      commitToolCount: 2,
      assistedToolCount: 0,
      equippedOnlyCount: 0,
    }).diversity
    const assisted = analyzeStats({
      ...base,
      commitToolCount: 1,
      assistedToolCount: 1,
      equippedOnlyCount: 0,
    }).diversity
    // one committed + one assisted (1.75) < two committed (2.0)
    expect(assisted).toBeLessThan(committed)
  })

  it('equipped-only tools count at half weight in diversity', () => {
    const none = analyzeStats({
      windowAiCommits: commitsPerWeek(2, 6),
      commitToolCount: 1,
      assistedToolCount: 0,
      equippedOnlyCount: 0,
      usage: singleUsage,
      now: NOW,
    })
    const withEquipped = analyzeStats({
      windowAiCommits: commitsPerWeek(2, 6),
      commitToolCount: 1,
      assistedToolCount: 0,
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
      assistedToolCount: 0,
      equippedOnlyCount: 0,
      usage: singleUsage,
      now: NOW,
    })
    expect(s.aiCommitsInWindow).toBe(1)
    expect(s.activeWeeks).toBe(1)
  })

  it('SYNERGY = AI-involved / total commits in window (0 → 0, all-AI → 100)', () => {
    const base = {
      commitToolCount: 0,
      assistedToolCount: 0,
      equippedOnlyCount: 0,
      usage: singleUsage,
      alternationScore: 0,
      langCount: 0,
      activeRepoCount: 0,
      now: NOW,
    }
    // no AI commits in the window → synergy 0
    expect(analyzeStats({ ...base, windowAiCommits: [], totalCommitsInWindow: 0 }).synergy).toBe(0)
    // 5 AI commits over 5 total → 100%
    expect(
      analyzeStats({ ...base, windowAiCommits: commitsPerWeek(5, 1), totalCommitsInWindow: 5 })
        .synergy,
    ).toBe(100)
    // 3 AI of 6 total → 50
    expect(
      analyzeStats({ ...base, windowAiCommits: commitsPerWeek(3, 1), totalCommitsInWindow: 6 })
        .synergy,
    ).toBe(50)
  })

  it('FLOW = round(100 * alternationScore), clamped to 0-100', () => {
    const base = {
      windowAiCommits: commitsPerWeek(2, 6),
      commitToolCount: 0,
      assistedToolCount: 0,
      equippedOnlyCount: 0,
      usage: singleUsage,
      totalCommitsInWindow: 12,
      langCount: 0,
      activeRepoCount: 0,
      now: NOW,
    }
    expect(analyzeStats({ ...base, alternationScore: 0 }).flow).toBe(0)
    expect(analyzeStats({ ...base, alternationScore: 0.5 }).flow).toBe(50)
    expect(analyzeStats({ ...base, alternationScore: 1 }).flow).toBe(100)
  })

  it('RANGE = langCount/3 and activeRepoCount/6 each at half weight (caps at 100)', () => {
    const base = {
      windowAiCommits: commitsPerWeek(2, 6),
      commitToolCount: 0,
      assistedToolCount: 0,
      equippedOnlyCount: 0,
      usage: singleUsage,
      totalCommitsInWindow: 12,
      alternationScore: 0,
      now: NOW,
    }
    // 3 langs + 6 active repos → both halves maxed → 100
    expect(analyzeStats({ ...base, langCount: 3, activeRepoCount: 6 }).range).toBe(100)
    // beyond the caps still 100 (min clamp)
    expect(analyzeStats({ ...base, langCount: 9, activeRepoCount: 20 }).range).toBe(100)
    // 0/0 → 0
    expect(analyzeStats({ ...base, langCount: 0, activeRepoCount: 0 }).range).toBe(0)
    // 3 langs (0.5) + 3 repos (0.25) → round(100*(0.5+0.25)) = 75
    expect(analyzeStats({ ...base, langCount: 3, activeRepoCount: 3 }).range).toBe(75)
  })

  it('POWER = round(sum of the 6 axes * 17)', () => {
    const s = analyzeStats({
      windowAiCommits: commitsPerWeek(25, 12),
      commitToolCount: 3,
      assistedToolCount: 0,
      equippedOnlyCount: 2,
      usage: evenUsage,
      totalCommitsInWindow: 300,
      alternationScore: 1,
      langCount: 3,
      activeRepoCount: 6,
      now: NOW,
    })
    const sum = s.velocity + s.diversity + s.consistency + s.synergy + s.range + s.flow
    expect(s.power).toBe(Math.round(sum * 17))
    // all-100 axes → the over-9000 ceiling (100*6*17 = 10200)
    expect(s.power).toBe(10200)
  })

  it('radar inputs affect POWER without changing the three source axes', () => {
    const withRadar = analyzeStats({
      windowAiCommits: commitsPerWeek(3, 8),
      commitToolCount: 2,
      assistedToolCount: 0,
      equippedOnlyCount: 0,
      usage: evenUsage,
      totalCommitsInWindow: 40,
      alternationScore: 0.7,
      langCount: 3,
      activeRepoCount: 5,
      now: NOW,
    })
    // Same core inputs but no radar inputs supplied → identical source axes.
    const withoutRadar = analyzeStats({
      windowAiCommits: commitsPerWeek(3, 8),
      commitToolCount: 2,
      assistedToolCount: 0,
      equippedOnlyCount: 0,
      usage: evenUsage,
      now: NOW,
    })
    expect(withRadar.velocity).toBe(withoutRadar.velocity)
    expect(withRadar.diversity).toBe(withoutRadar.diversity)
    expect(withRadar.consistency).toBe(withoutRadar.consistency)
    expect(withRadar.power).toBeGreaterThan(withoutRadar.power)
  })
})
