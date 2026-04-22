import { describe, expect, it } from 'vitest'
import { analyzeBadges } from '~/analyzers/badges'
import type {
  ToolAttributionAnalysis,
  UsageAnalysis,
  VelocityAnalysis,
} from '~/analyzers/types'
import type { GitHubCommit } from '~/github/types'

const emptyVelocity: VelocityAnalysis = {
  weeksActive: 0,
  commitsPerWeek: 0,
  sparkline: new Array(12).fill(0),
  firstAiDate: null,
  daysSinceFirst: 0,
}

function makeCommit(date: string, message = 'feat: add'): GitHubCommit {
  return {
    oid: `sha-${date}`,
    message,
    committedDate: `${date}T12:00:00Z`,
    author: { user: { login: 'testuser' } },
  }
}

const baseUsage: UsageAnalysis = {
  categories: [
    { category: 'feature', count: 8, percentage: 80 },
    { category: 'bugfix', count: 1, percentage: 10 },
    { category: 'test', count: 1, percentage: 10 },
    { category: 'refactor', count: 0, percentage: 0 },
  ],
  totalCommits: 10,
}

describe('analyzeBadges', () => {
  it('awards Multi-Tool for 3+ tools', () => {
    const tools: ToolAttributionAnalysis = {
      tools: [
        { toolId: 'claude', toolName: 'Claude', commitCount: 5, percentage: 50 },
        { toolId: 'cursor', toolName: 'Cursor', commitCount: 3, percentage: 30 },
        { toolId: 'copilot', toolName: 'Copilot', commitCount: 2, percentage: 20 },
      ],
      totalAiCommits: 10, verified: false,
    }
    const result = analyzeBadges([makeCommit('2026-03-01')], tools, baseUsage, emptyVelocity)
    expect(result.badges.some((b) => b.id === 'multi-tool')).toBe(true)
  })

  it('does not award Multi-Tool for 2 tools', () => {
    const tools: ToolAttributionAnalysis = {
      tools: [
        { toolId: 'claude', toolName: 'Claude', commitCount: 7, percentage: 70 },
        { toolId: 'cursor', toolName: 'Cursor', commitCount: 3, percentage: 30 },
      ],
      totalAiCommits: 10, verified: false,
    }
    const result = analyzeBadges([makeCommit('2026-03-01')], tools, baseUsage, emptyVelocity)
    expect(result.badges.some((b) => b.id === 'multi-tool')).toBe(false)
  })

  it('excludes unknown from Multi-Tool count', () => {
    const tools: ToolAttributionAnalysis = {
      tools: [
        { toolId: 'claude', toolName: 'Claude', commitCount: 5, percentage: 50 },
        { toolId: 'cursor', toolName: 'Cursor', commitCount: 3, percentage: 30 },
        { toolId: 'unknown', toolName: 'Other', commitCount: 2, percentage: 20 },
      ],
      totalAiCommits: 10, verified: false,
    }
    const result = analyzeBadges([makeCommit('2026-03-01')], tools, baseUsage, emptyVelocity)
    expect(result.badges.some((b) => b.id === 'multi-tool')).toBe(false)
  })

  it('awards Centurion for 100+ commits', () => {
    const tools: ToolAttributionAnalysis = {
      tools: [{ toolId: 'claude', toolName: 'Claude', commitCount: 100, percentage: 100 }],
      totalAiCommits: 100, verified: false,
    }
    const result = analyzeBadges([makeCommit('2026-03-01')], tools, baseUsage, emptyVelocity)
    expect(result.badges.some((b) => b.id === 'centurion')).toBe(true)
  })

  it('awards TDD with AI for test rate >= 20%', () => {
    const tddUsage: UsageAnalysis = {
      categories: [
        { category: 'feature', count: 6, percentage: 60 },
        { category: 'test', count: 3, percentage: 30 },
        { category: 'bugfix', count: 1, percentage: 10 },
        { category: 'refactor', count: 0, percentage: 0 },
      ],
      totalCommits: 10,
    }
    const tools: ToolAttributionAnalysis = {
      tools: [{ toolId: 'claude', toolName: 'Claude', commitCount: 10, percentage: 100 }],
      totalAiCommits: 10, verified: false,
    }
    const result = analyzeBadges([makeCommit('2026-03-01')], tools, tddUsage, emptyVelocity)
    expect(result.badges.some((b) => b.id === 'tdd-ai')).toBe(true)
  })

  it('reports aiStreakDays for 8 consecutive days ending today', () => {
    const NOW = new Date('2026-03-10T00:00:00Z')
    const commits = Array.from({ length: 8 }, (_, i) => {
      const d = new Date('2026-03-10')
      d.setDate(d.getDate() - i)
      return makeCommit(d.toISOString().slice(0, 10))
    })
    const tools: ToolAttributionAnalysis = {
      tools: [{ toolId: 'claude', toolName: 'Claude', commitCount: 8, percentage: 100 }],
      totalAiCommits: 8, verified: false,
    }
    const result = analyzeBadges(commits, tools, baseUsage, emptyVelocity, NOW)
    // Streak is shown via aiStreakDays in the stats line, not duplicated as a pill.
    expect(result.badges.some((b) => b.id === 'streak')).toBe(false)
    expect(result.aiStreakDays).toBe(8)
  })

  it('reports aiStreakDays for 5 consecutive days ending yesterday', () => {
    const NOW = new Date('2026-03-11T00:00:00Z')
    const commits = Array.from({ length: 5 }, (_, i) => {
      const d = new Date('2026-03-10')
      d.setDate(d.getDate() - i)
      return makeCommit(d.toISOString().slice(0, 10))
    })
    const tools: ToolAttributionAnalysis = {
      tools: [{ toolId: 'claude', toolName: 'Claude', commitCount: 5, percentage: 100 }],
      totalAiCommits: 5, verified: false,
    }
    const result = analyzeBadges(commits, tools, baseUsage, emptyVelocity, NOW)
    expect(result.aiStreakDays).toBe(5)
  })

  it('keeps streak when most recent commit is exactly 1 day ago (UTC boundary)', () => {
    // NOW = midnight of 2026-03-12 UTC. Most recent commit day = 2026-03-11.
    // daysSinceMostRecent = 1.0 (not > 1), so streak should NOT be reset.
    const NOW = new Date('2026-03-12T00:00:00Z')
    const commits = [
      makeCommit('2026-03-11'),
      makeCommit('2026-03-10'),
      makeCommit('2026-03-09'),
    ]
    const tools: ToolAttributionAnalysis = {
      tools: [{ toolId: 'claude', toolName: 'Claude', commitCount: 3, percentage: 100 }],
      totalAiCommits: 3, verified: false,
    }
    const result = analyzeBadges(commits, tools, baseUsage, emptyVelocity, NOW)
    expect(result.aiStreakDays).toBe(3)
  })

  it('resets streak when most recent commit is 2 days ago (just past boundary)', () => {
    const NOW = new Date('2026-03-13T00:00:00Z')
    const commits = [
      makeCommit('2026-03-11'),
      makeCommit('2026-03-10'),
    ]
    const tools: ToolAttributionAnalysis = {
      tools: [{ toolId: 'claude', toolName: 'Claude', commitCount: 2, percentage: 100 }],
      totalAiCommits: 2, verified: false,
    }
    const result = analyzeBadges(commits, tools, baseUsage, emptyVelocity, NOW)
    expect(result.aiStreakDays).toBe(0)
  })

  it('reports 0 streak when the most recent AI commit is stale (>1 day ago)', () => {
    // Historical run of 5 consecutive days; "now" is much later, no recent activity.
    const NOW = new Date('2026-04-22T00:00:00Z')
    const commits = Array.from({ length: 5 }, (_, i) => {
      const d = new Date('2025-08-10')
      d.setDate(d.getDate() - i)
      return makeCommit(d.toISOString().slice(0, 10))
    })
    const tools: ToolAttributionAnalysis = {
      tools: [{ toolId: 'claude', toolName: 'Claude', commitCount: 5, percentage: 100 }],
      totalAiCommits: 5, verified: false,
    }
    const result = analyzeBadges(commits, tools, baseUsage, emptyVelocity, NOW)
    expect(result.aiStreakDays).toBe(0)
  })

  it('derives firstAiDate from velocity (YYYY-MM)', () => {
    const commits = [
      makeCommit('2025-06-15'),
      makeCommit('2026-03-01'),
    ]
    const tools: ToolAttributionAnalysis = {
      tools: [{ toolId: 'claude', toolName: 'Claude', commitCount: 2, percentage: 100 }],
      totalAiCommits: 2, verified: false,
    }
    const velocity: VelocityAnalysis = {
      ...emptyVelocity,
      firstAiDate: '2025-06-15',
    }
    const result = analyzeBadges(commits, tools, baseUsage, velocity)
    expect(result.firstAiDate).toBe('2025-06')
  })

  it('returns null firstAiDate when velocity has no first date', () => {
    const tools: ToolAttributionAnalysis = {
      tools: [{ toolId: 'claude', toolName: 'Claude', commitCount: 1, percentage: 100 }],
      totalAiCommits: 1, verified: false,
    }
    const result = analyzeBadges([makeCommit('2026-03-01')], tools, baseUsage, emptyVelocity)
    expect(result.firstAiDate).toBeNull()
  })

  it('handles empty commits', () => {
    const tools: ToolAttributionAnalysis = { tools: [], totalAiCommits: 0, verified: false }
    const result = analyzeBadges([], tools, baseUsage, emptyVelocity)
    expect(result.badges).toHaveLength(0)
    expect(result.firstAiDate).toBeNull()
    expect(result.aiStreakDays).toBe(0)
  })

  it('awards Parallel for 2+ tools with meaningful usage (>=5 commits each)', () => {
    const tools: ToolAttributionAnalysis = {
      tools: [
        { toolId: 'claude', toolName: 'Claude', commitCount: 20, percentage: 66.7 },
        { toolId: 'codex', toolName: 'Codex', commitCount: 10, percentage: 33.3 },
      ],
      totalAiCommits: 30, verified: false,
    }
    const result = analyzeBadges([makeCommit('2026-03-01')], tools, baseUsage, emptyVelocity)
    expect(result.badges.some((b) => b.id === 'parallel')).toBe(true)
  })

  it('does not award Parallel when one tool has <5 commits', () => {
    const tools: ToolAttributionAnalysis = {
      tools: [
        { toolId: 'claude', toolName: 'Claude', commitCount: 20, percentage: 83.3 },
        { toolId: 'codex', toolName: 'Codex', commitCount: 4, percentage: 16.7 },
      ],
      totalAiCommits: 24, verified: false,
    }
    const result = analyzeBadges([makeCommit('2026-03-01')], tools, baseUsage, emptyVelocity)
    expect(result.badges.some((b) => b.id === 'parallel')).toBe(false)
  })

  it('awards Shipper when weeksActive >= 8 and commitsPerWeek >= 3', () => {
    const tools: ToolAttributionAnalysis = {
      tools: [{ toolId: 'claude', toolName: 'Claude', commitCount: 30, percentage: 100 }],
      totalAiCommits: 30, verified: false,
    }
    const velocity: VelocityAnalysis = {
      ...emptyVelocity,
      weeksActive: 9,
      commitsPerWeek: 3.5,
    }
    const result = analyzeBadges([makeCommit('2026-03-01')], tools, baseUsage, velocity)
    expect(result.badges.some((b) => b.id === 'shipper')).toBe(true)
  })

  it('does not award Shipper when weeksActive < 8', () => {
    const tools: ToolAttributionAnalysis = {
      tools: [{ toolId: 'claude', toolName: 'Claude', commitCount: 30, percentage: 100 }],
      totalAiCommits: 30, verified: false,
    }
    const velocity: VelocityAnalysis = {
      ...emptyVelocity,
      weeksActive: 7,
      commitsPerWeek: 5,
    }
    const result = analyzeBadges([makeCommit('2026-03-01')], tools, baseUsage, velocity)
    expect(result.badges.some((b) => b.id === 'shipper')).toBe(false)
  })

  it('does not award Shipper when commitsPerWeek < 3', () => {
    const tools: ToolAttributionAnalysis = {
      tools: [{ toolId: 'claude', toolName: 'Claude', commitCount: 30, percentage: 100 }],
      totalAiCommits: 30, verified: false,
    }
    const velocity: VelocityAnalysis = {
      ...emptyVelocity,
      weeksActive: 12,
      commitsPerWeek: 2.5,
    }
    const result = analyzeBadges([makeCommit('2026-03-01')], tools, baseUsage, velocity)
    expect(result.badges.some((b) => b.id === 'shipper')).toBe(false)
  })
})
