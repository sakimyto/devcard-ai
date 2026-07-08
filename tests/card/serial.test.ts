import { describe, expect, it } from 'vitest'
import { artSeed, cardSerial, fnv1a32 } from '~/card/serial'

describe('serial/seed', () => {
  it('fnv1a32 is deterministic and differs across inputs', () => {
    expect(fnv1a32('sakimyto')).toBe(fnv1a32('sakimyto'))
    expect(fnv1a32('sakimyto')).not.toBe(fnv1a32('octocat'))
  })

  it('fnv1a32 matches known FNV-1a vector', () => {
    // 標準 FNV-1a 32bit: fnv1a32('a') = 0xe40c292c
    expect(fnv1a32('a')).toBe(0xe40c292c)
  })

  it('cardSerial is #XXXX uppercase hex', () => {
    expect(cardSerial('sakimyto')).toMatch(/^#[0-9A-F]{4}$/)
    expect(cardSerial('sakimyto')).toBe(cardSerial('sakimyto'))
  })

  it('artSeed equals fnv1a32', () => {
    expect(artSeed('x')).toBe(fnv1a32('x'))
  })
})
