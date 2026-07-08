import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { renderArt } from '~/svg/v2/art'

const opts = { seed: 12345, width: 686, height: 300, accent: '#a371f7', bg: '#161b22' }

const GOLDEN_PATH = fileURLToPath(new URL('./__fixtures__/art-golden.svg', import.meta.url))

describe('renderArt', () => {
  it('is deterministic: same seed → identical svg', () => {
    expect(renderArt(opts)).toBe(renderArt(opts))
  })

  it('different seeds → different svg', () => {
    expect(renderArt(opts)).not.toBe(renderArt({ ...opts, seed: 54321 }))
  })

  it('contains nodes and edges within bounds', () => {
    const svg = renderArt(opts)
    expect(svg).toContain('<g')
    expect(svg).toContain('<circle')
    expect(svg).toContain('<path')
    // 座標が width/height を超えない（数値抽出して検査）
    const nums = [...svg.matchAll(/c?x="([\d.]+)"/g)].map((m) => Number(m[1]))
    expect(nums.length).toBeGreaterThan(0)
    for (const n of nums) expect(n).toBeLessThanOrEqual(686)
  })

  it('escapes nothing user-controlled (no raw text nodes)', () => {
    expect(renderArt(opts)).not.toContain('<text')
  })

  it('matches golden fixture: fixed seed → pinned svg snapshot', () => {
    const golden = readFileSync(GOLDEN_PATH, 'utf8')
    expect(renderArt(opts)).toBe(golden)
  })
})
