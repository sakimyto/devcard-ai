import { describe, expect, it } from 'vitest'
import type { VelocityAnalysis } from '~/analyzers/types'
import { renderVelocityModule } from '~/svg/modules/velocity'
import { getTheme } from '~/svg/themes'

const theme = getTheme('dark')

function mkVelocity(overrides: Partial<VelocityAnalysis> = {}): VelocityAnalysis {
  return {
    weeksActive: 0,
    commitsPerWeek: 0,
    sparkline: new Array(12).fill(0),
    firstAiDate: null,
    daysSinceFirst: 0,
    ...overrides,
  }
}

describe('renderVelocityModule', () => {
  it('renders SHIP VELOCITY header and pill labels', () => {
    const svg = renderVelocityModule(
      mkVelocity({
        weeksActive: 9,
        commitsPerWeek: 4.2,
        sparkline: [1, 0, 2, 3, 1, 0, 4, 2, 3, 5, 4, 2],
        firstAiDate: '2025-06-15',
        daysSinceFirst: 300,
      }),
      theme,
      0,
    )
    expect(svg).toContain('SHIP VELOCITY')
    expect(svg).toContain('9/12 active weeks')
    expect(svg).toContain('4.2 AI cmts/wk')
    expect(svg).toContain('10mo active')
    expect(svg).toContain('since 2025-06-15')
    expect(svg).toContain('last 12 weeks')
  })

  it('renders zero-state labels when there is no AI activity', () => {
    const svg = renderVelocityModule(mkVelocity(), theme, 0)
    expect(svg).toContain('0/12 active weeks')
    expect(svg).toContain('— cmts/wk')
    expect(svg).toContain('no AI activity')
    expect(svg).not.toContain('since')
  })

  it('rounds cadence to one decimal without trailing zero', () => {
    const svg = renderVelocityModule(
      mkVelocity({ weeksActive: 4, commitsPerWeek: 3.0 }),
      theme,
      0,
    )
    expect(svg).toContain('3 AI cmts/wk')
    expect(svg).not.toContain('3.0 AI cmts/wk')
  })

  it('formats daysSinceFirst as "today" when 0 with a firstAiDate', () => {
    const svg = renderVelocityModule(
      mkVelocity({ firstAiDate: '2026-04-22', daysSinceFirst: 0 }),
      theme,
      0,
    )
    expect(svg).toContain('today')
  })

  it('renders sparkline bars for every slot', () => {
    const svg = renderVelocityModule(
      mkVelocity({ sparkline: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }),
      theme,
      0,
    )
    // 12 bars emitted
    expect((svg.match(/<rect /g) ?? []).length).toBeGreaterThanOrEqual(12)
  })
})
