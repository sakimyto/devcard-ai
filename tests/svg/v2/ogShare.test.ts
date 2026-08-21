import { describe, expect, it } from 'vitest'
import type { CardDataV2 } from '~/analyzers/types'
import { renderOgError, renderOgShare } from '~/svg/v2/ogShare'

const data: CardDataV2 = {
  username: 'testuser',
  stats: {
    velocity: 82,
    diversity: 60,
    consistency: 74,
    synergy: 65,
    range: 50,
    flow: 40,
    power: 6307,
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
  languages: {
    languages: [{ name: 'TypeScript', color: '#3178c6', percentage: 71 }],
    othersPercentage: 29,
  },
  pattern: { pattern: 'AI Native', aiRate: 0.7, alternationScore: 0.3 },
  record: {
    exp: 1240,
    commits: 210,
    prs: 18,
    reviews: 34,
    issues: 9,
    inclPrivate: false,
    currentStreak: 7,
    longestStreak: 15,
    yearTotal: 1240,
    weeklyContributions: new Array(52).fill(0),
  },
  element: { id: 'bolt', label: 'Bolt', color: '#f0b429' },
  epithet: 'The Ascendant',
  traits: [],
  flavor: 'Fully fused with Claude — ships at machine speed.',
  serial: '#7F3A',
  seed: 42,
  issuedYear: 2026,
  avatarDataUri: null,
  includesPrivate: false,
}

describe('renderOgShare', () => {
  it('renders 1200x630 with username, chosen glow, stats, no rank or SMIL animation', () => {
    const svg = renderOgShare(data, 'dark', 'holo')
    expect(svg).toContain('width="1200"')
    expect(svg).toContain('height="630"')
    expect(svg).toContain('testuser')
    expect(svg).toContain('VELOCITY')
    // PNG-rasterized: SMIL animation is inert and must not be emitted
    expect(svg).not.toContain('animate')
    expect(svg).not.toContain('rarity')
    expect(svg).toContain('HOLO GLOW')
    expect(svg).toContain('POWER')
    expect(svg).toContain('6,307')
    expect(svg).toMatchSnapshot()
  })

  it('renders the avatar only from a data: URI, never a remote http(s) href', () => {
    const png1px =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC'
    const withAvatar = renderOgShare({ ...data, avatarDataUri: png1px }, 'dark', 'soft')
    expect(withAvatar).toContain('<image')
    expect(withAvatar).toContain(png1px)
    expect(withAvatar).not.toMatch(/<image[^>]+href="http/)
    // null avatar → no <image>, and the name stays at its original x=72 position.
    expect(renderOgShare(data, 'dark', 'soft')).not.toContain('<image')
    expect(renderOgShare(data, 'dark', 'soft')).toContain('x="72" y="180"')
  })

  it('POWER turns gold past 9000 on the share image', () => {
    const over = renderOgShare({ ...data, stats: { ...data.stats, power: 9200 } }, 'dark', 'soft')
    expect(over).toContain('9,200')
    expect(over).toContain('#f0b429')
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
