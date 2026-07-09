import { describe, expect, it } from 'vitest'
import type { CardDataV2 } from '~/analyzers/types'
import { renderOgError, renderOgShare } from '~/svg/v2/ogShare'

const data: CardDataV2 = {
  username: 'testuser',
  stats: {
    velocity: 82,
    diversity: 60,
    consistency: 74,
    points: 73,
    grade: 'S',
    aiCommitsInWindow: 120,
    activeWeeks: 9,
  },
  toolAttribution: {
    tools: [{ toolId: 'claude', toolName: 'Claude', commitCount: 84, percentage: 70 }],
    assisted: [],
    totalAiCommits: 120,
    verified: true,
  },
  equipped: { equipped: [] },
  usage: { categories: [], totalCommits: 120 },
  languages: { languages: [{ name: 'TypeScript', color: '#3178c6', repoCount: 5 }] },
  pattern: { pattern: 'AI Native', aiRate: 0.7, alternationScore: 0.3 },
  flavor: 'Fully fused with Claude — ships at machine speed.',
  serial: '#7F3A',
  seed: 42,
  issuedYear: 2026,
}

describe('renderOgShare', () => {
  it('renders 1200x630 with username, grade, stats, no SMIL animation', () => {
    const svg = renderOgShare(data, 'dark')
    expect(svg).toContain('width="1200"')
    expect(svg).toContain('height="630"')
    expect(svg).toContain('testuser')
    expect(svg).toContain('VELOCITY')
    // PNG-rasterized: SMIL animation is inert and must not be emitted
    expect(svg).not.toContain('animate')
    expect(svg).toMatchSnapshot()
  })
})

describe('renderOgError', () => {
  it('renders a 1200x630 landscape error canvas (matches OGP dimensions)', () => {
    const svg = renderOgError('User not found', 'dark')
    // svgToPng scales by width only; error states must be the same 1200x630 aspect
    // ratio the OGP meta advertises, not the vertical error card.
    expect(svg).toContain('width="1200"')
    expect(svg).toContain('height="630"')
    expect(svg).toContain('viewBox="0 0 1200 630"')
    expect(svg).toContain('User not found')
    expect(svg).not.toContain('animate')
  })
})
