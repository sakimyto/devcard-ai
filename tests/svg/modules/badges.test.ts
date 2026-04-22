import { describe, expect, it } from 'vitest'
import type { BadgeAnalysis } from '~/analyzers/badges'
import { renderBadgesModule } from '~/svg/modules/badges'
import { getTheme } from '~/svg/themes'

const theme = getTheme('light')

function mkBadges(labels: string[]): BadgeAnalysis {
  return {
    badges: labels.map((label, i) => ({ id: `b${i}`, label, icon: '🛠' })),
    totalAiCommits: 100,
    aiStreakDays: 0,
    firstAiDate: '2025-06',
  }
}

describe('renderBadgesModule', () => {
  it('renders all badges when they fit within the card width', () => {
    const svg = renderBadgesModule(mkBadges(['Multi-Tool', 'Parallel']), theme, 0)
    expect(svg).toContain('Multi-Tool')
    expect(svg).toContain('Parallel')
    expect(svg).not.toMatch(/\+\d/)
  })

  it('collapses overflowing badges into a "+N" chip', () => {
    // 5 wide badges will definitely exceed the 352px row.
    const svg = renderBadgesModule(
      mkBadges(['Multi-Tool', 'Parallel', 'Centurion', 'TDD with AI', 'Shipper']),
      theme,
      0,
    )
    expect(svg).toMatch(/\+\d/)
  })

  it('renders no "+N" chip when a single wide badge is the only one', () => {
    const svg = renderBadgesModule(mkBadges(['Multi-Tool']), theme, 0)
    expect(svg).not.toMatch(/\+\d/)
    expect(svg).toContain('Multi-Tool')
  })

  it('renders stats line with AI commits count', () => {
    const svg = renderBadgesModule(mkBadges(['Multi-Tool']), theme, 0)
    expect(svg).toContain('100 AI commits')
  })
})
