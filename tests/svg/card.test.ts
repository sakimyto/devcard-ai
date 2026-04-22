import { describe, expect, it } from 'vitest'
import type { CardData } from '~/analyzers/types'
import { renderCard, renderErrorCard } from '~/svg/card'

const mockData: CardData = {
  username: 'testuser',
  score: {
    grade: 'A',
    points: 65,
    breakdown: {
      hasTools: true,
      multipleTools: false,
      activeAiCommits: true,
      recentActivity: true,
    },
  },
  toolAttribution: {
    tools: [
      { toolId: 'claude', toolName: 'Claude', commitCount: 7, percentage: 70 },
      { toolId: 'cursor', toolName: 'Cursor', commitCount: 3, percentage: 30 },
    ],
    totalAiCommits: 10,
    verified: true,
  },
  usage: {
    categories: [
      { category: 'feature', count: 5, percentage: 50 },
      { category: 'bugfix', count: 3, percentage: 30 },
      { category: 'test', count: 1, percentage: 10 },
      { category: 'refactor', count: 1, percentage: 10 },
    ],
    totalCommits: 10,
  },
  languages: {
    languages: [
      { name: 'TypeScript', color: '#3178c6', repoCount: 3 },
    ],
  },
  pattern: {
    pattern: 'Pair Programmer',
    aiRate: 0.5,
    alternationScore: 0.7,
  },
  badges: {
    badges: [
      { id: 'streak', label: 'Streak 12d', icon: '🔥' },
    ],
    totalAiCommits: 10,
    aiStreakDays: 12,
    firstAiDate: '2025-06',
  },
  velocity: {
    weeksActive: 6,
    commitsPerWeek: 2.5,
    sparkline: [0, 1, 0, 2, 3, 1, 2, 0, 4, 2, 5, 3],
    firstAiDate: '2025-06-15',
    daysSinceFirst: 310,
  },
}

describe('renderCard', () => {
  it('returns valid SVG', () => {
    const svg = renderCard(mockData, {
      theme: 'light',
      modules: ['toolsBar', 'usage'],
    })
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
    expect(svg).toContain('testuser')
  })

  it('renders archetype chip in header', () => {
    const svg = renderCard(mockData, { theme: 'light', modules: [] })
    expect(svg).toContain('Pair Programmer')
  })

  it('renders AI BUILDER eyebrow and Verified mark', () => {
    const svg = renderCard(mockData, { theme: 'light', modules: [] })
    expect(svg).toContain('AI BUILDER')
    expect(svg).toContain('Verified')
  })

  it('renders Ship Velocity module', () => {
    const svg = renderCard(mockData, { theme: 'light', modules: ['velocity'] })
    expect(svg).toContain('SHIP VELOCITY')
    expect(svg).toContain('6/12 active weeks')
    expect(svg).toContain('last 12 weeks')
  })

  it('omits Verified when no real tools attributed', () => {
    const unverified: CardData = {
      ...mockData,
      toolAttribution: {
        tools: [
          { toolId: 'unknown', toolName: 'Other', commitCount: 5, percentage: 100 },
        ],
        totalAiCommits: 5,
        verified: false,
      },
    }
    const svg = renderCard(unverified, { theme: 'light', modules: [] })
    expect(svg).not.toContain('Verified')
  })

  it('renders AI Builder Passport footer', () => {
    const svg = renderCard(mockData, { theme: 'light', modules: [] })
    expect(svg).toContain('AI Builder Passport')
    expect(svg).toContain('issued 2025-06')
  })

  it('falls back to "verified" in footer when velocity has no firstAiDate', () => {
    const undated: CardData = {
      ...mockData,
      velocity: { ...mockData.velocity, firstAiDate: null },
    }
    const svg = renderCard(undated, { theme: 'light', modules: [] })
    expect(svg).toContain('AI Builder Passport · verified')
    expect(svg).not.toContain('issued ')
  })

  it('renders tools bar module', () => {
    const svg = renderCard(mockData, { theme: 'light', modules: ['toolsBar'] })
    expect(svg).toContain('TOOLS')
    expect(svg).toContain('Claude')
  })

  it('renders usage module', () => {
    const svg = renderCard(mockData, { theme: 'light', modules: ['usage'] })
    expect(svg).toContain('USAGE')
    expect(svg).toContain('Feature')
  })

  it('supports dark theme', () => {
    const svg = renderCard(mockData, { theme: 'dark', modules: ['toolsBar'] })
    expect(svg).toContain('#0d1117')
  })

  it('renders all default modules when none specified', () => {
    const svg = renderCard(mockData, { theme: 'light', modules: [] })
    expect(svg).toContain('TOOLS')
    expect(svg).toContain('USAGE')
  })

  it('renders Tier label in header', () => {
    const svg = renderCard(mockData, { theme: 'light', modules: ['toolsBar'] })
    expect(svg).toContain('>A</text>')
    expect(svg).toContain('>TIER<')
  })
})

describe('renderErrorCard', () => {
  it('renders user not found message', () => {
    const svg = renderErrorCard('User not found', 'light')
    expect(svg).toContain('<svg')
    expect(svg).toContain('User not found')
  })

  it('supports dark theme', () => {
    const svg = renderErrorCard('Error', 'dark')
    expect(svg).toContain('#0d1117')
  })
})
