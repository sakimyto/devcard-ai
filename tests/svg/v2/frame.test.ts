import { describe, expect, it } from 'vitest'
import { renderFrame } from '~/svg/v2/frame'

describe('renderFrame', () => {
  it('S tier has animated holo gradient + shine sweep', () => {
    const { defs, frame } = renderFrame('S', 750, 1050)
    expect(defs).toContain('holoGrad')
    expect(defs).toContain('<animateTransform')
    expect(frame).toContain('<animate ')
  })

  it('A/B/C are static metallic frames without animation', () => {
    for (const g of ['A', 'B', 'C'] as const) {
      const { defs, frame } = renderFrame(g, 750, 1050)
      expect(defs).not.toContain('animate')
      expect(frame).not.toContain('animate')
      expect(defs).toContain(`metal${g}`)
    }
  })

  it('D is a plain single-color frame with empty defs', () => {
    const { defs, frame } = renderFrame('D', 750, 1050)
    expect(defs).toBe('')
    expect(frame).toContain('stroke')
  })
})
