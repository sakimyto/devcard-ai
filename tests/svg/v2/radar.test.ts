import { describe, expect, it } from 'vitest'
import { getTheme } from '~/svg/themes'
import { renderRadar } from '~/svg/v2/radar'

const AXES = [
  { label: 'VELOCITY', value: 82 },
  { label: 'DIVERSITY', value: 60 },
  { label: 'SYNERGY', value: 65 },
  { label: 'CONSISTENCY', value: 74 },
  { label: 'RANGE', value: 50 },
  { label: 'FLOW', value: 40 },
]

describe('renderRadar', () => {
  it('is deterministic: same input → identical output', () => {
    const theme = getTheme('dark')
    expect(renderRadar(AXES, 200, 588, 82, theme)).toBe(renderRadar(AXES, 200, 588, 82, theme))
  })

  it('renders all six axis labels', () => {
    const svg = renderRadar(AXES, 200, 588, 82, getTheme('dark'))
    for (const a of AXES) {
      expect(svg).toContain(a.label)
    }
  })

  it('rounds coordinates to 2 decimals (golden-stable) and never emits NaN', () => {
    const svg = renderRadar(AXES, 200, 588, 82, getTheme('dark'))
    expect(svg).not.toContain('NaN')
    // Every polygon/line/circle coordinate has at most 2 decimal places.
    for (const m of svg.matchAll(/(\d+\.\d+)/g)) {
      const decimals = m[1].split('.')[1]
      expect(decimals.length).toBeLessThanOrEqual(2)
    }
  })

  it('clamps out-of-range values without throwing', () => {
    const svg = renderRadar(
      [
        { label: 'A', value: -20 },
        { label: 'B', value: 250 },
        { label: 'C', value: 0 },
        { label: 'D', value: 100 },
        { label: 'E', value: 50 },
        { label: 'F', value: 50 },
      ],
      100,
      100,
      50,
      getTheme('light'),
    )
    expect(svg).not.toContain('NaN')
    expect(svg).toContain('<polygon')
  })

  it('draws 4 grid rings + 1 value polygon (5 polygons) and 6 dots', () => {
    const svg = renderRadar(AXES, 200, 588, 82, getTheme('dark'))
    expect([...svg.matchAll(/<polygon/g)].length).toBe(5)
    expect([...svg.matchAll(/<circle/g)].length).toBe(6)
  })
})
