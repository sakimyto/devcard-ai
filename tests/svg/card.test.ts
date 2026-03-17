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

  it('renders pattern in subtitle', () => {
    const svg = renderCard(mockData, { theme: 'light', modules: [] })
    expect(svg).toContain('Pair Programmer')
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

  it('renders grade badge in header', () => {
    const svg = renderCard(mockData, { theme: 'light', modules: ['toolsBar'] })
    expect(svg).toContain('>A</text>')
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
