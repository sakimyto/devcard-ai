import { describe, it, expect } from 'vitest'
import { renderCard } from '~/svg/card'
import type { CardData } from '~/analyzers/types'

const mockData: CardData = {
  username: 'testuser',
  coauthor: { totalCommits: 100, aiCommits: 42, rate: 0.42 },
  tools: { tools: [{ id: 'claude', name: 'Claude Code', repoCount: 3 }] },
  score: { grade: 'A', points: 65, breakdown: { hasAiConfig: true, multipleTools: false, activeAiCommits: true, recentActivity: true } },
}

describe('renderCard', () => {
  it('returns valid SVG', () => {
    const svg = renderCard(mockData, { theme: 'light', modules: ['tools', 'coauthor', 'score'] })
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
    expect(svg).toContain('testuser')
  })

  it('respects module selection', () => {
    const svg = renderCard(mockData, { theme: 'light', modules: ['tools'] })
    expect(svg).toContain('Claude Code')
    expect(svg).not.toContain('AI Co-Authored')
    expect(svg).not.toContain('AI Readiness')
  })

  it('supports dark theme', () => {
    const svg = renderCard(mockData, { theme: 'dark', modules: ['tools'] })
    expect(svg).toContain('#0d1117')
  })

  it('renders all default modules when none specified', () => {
    const svg = renderCard(mockData, { theme: 'light', modules: [] })
    expect(svg).toContain('Claude Code')
    expect(svg).toContain('AI Co-Authored')
    expect(svg).toContain('AI Readiness')
  })
})
