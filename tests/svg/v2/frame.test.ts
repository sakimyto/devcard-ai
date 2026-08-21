import { describe, expect, it } from 'vitest'
import { GLOW_STYLES } from '~/card/customization'
import { renderFrame } from '~/svg/v2/frame'

describe('renderFrame', () => {
  it('holo is an explicitly selected animated gradient + shine sweep', () => {
    const { defs, frame } = renderFrame('holo', 750, 1050, '#a371f7')
    expect(defs).toContain('holoGrad')
    expect(defs).toContain('<animateTransform')
    expect(frame).toContain('<animate ')
  })

  it('none and soft are static, distinct finishes', () => {
    const clean = renderFrame('none', 750, 1050, '#a371f7')
    const soft = renderFrame('soft', 750, 1050, '#a371f7')
    expect(clean.defs).toBe('')
    expect(clean.frame).not.toContain('filter=')
    expect(soft.defs).toContain('frameSoftGlow')
    expect(soft.frame).toContain('filter="url(#frameSoftGlow)"')
  })

  it('neon animates on cards but has a deterministic static OGP mode', () => {
    const card = renderFrame('neon', 750, 1050, '#a371f7')
    const og = renderFrame('neon', 1200, 630, '#a371f7', { animated: false })
    expect(card.defs).toContain('frameNeonGlow')
    expect(card.frame).toContain('<animate ')
    expect(og.frame).not.toContain('animate')
  })

  it('holo can render without SMIL for PNG rasterization', () => {
    const { defs, frame } = renderFrame('holo', 1200, 630, '#a371f7', { animated: false })
    expect(defs).toContain('holoGrad')
    expect(defs).not.toContain('animate')
    expect(frame).not.toContain('animate')
  })

  // /og の PNG 化はリクエスト毎に走る。ぼかしフィルタと foil（feTurbulence）は resvg で
  // 最も高価なプリミティブで、アニメーションが落ちる経路に出しても見返りが無い
  it('animated:false では重いフィルタを一切出さない', () => {
    for (const glow of GLOW_STYLES) {
      const { defs, frame } = renderFrame(glow, 750, 1050, '#a371f7', { animated: false })
      const out = `${defs}\n${frame}`
      expect(out, `${glow}: ぼかし`).not.toContain('feGaussianBlur')
      expect(out, `${glow}: foil`).not.toContain('feTurbulence')
      expect(out, `${glow}: holoFoil 参照`).not.toContain('holoFoil')
      expect(out, `${glow}: SMIL`).not.toContain('<animate')
      // 参照だけ残って解決できない url(#...) が出ていないこと
      for (const ref of out.matchAll(/url\(#([\w-]+)\)/g)) {
        expect(defs, `${glow}: ${ref[1]} の定義が無い`).toContain(`id="${ref[1]}"`)
      }
    }
  })
})
