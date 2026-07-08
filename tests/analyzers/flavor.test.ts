import { describe, expect, it } from 'vitest'
import { flavorText } from '~/analyzers/flavor'

describe('flavorText', () => {
  it('is deterministic per pattern + tool', () => {
    const a = flavorText({ pattern: 'AI Native', topToolName: 'Claude', consistency: 50 })
    expect(a).toBe(flavorText({ pattern: 'AI Native', topToolName: 'Claude', consistency: 50 }))
    expect(a).toContain('Claude')
  })

  it('covers all four patterns with distinct lines', () => {
    const lines = new Set(
      (['AI Native', 'Pair Programmer', 'Delegator', 'Selective User'] as const).map((p) =>
        flavorText({ pattern: p, topToolName: 'Claude', consistency: 0 }),
      ),
    )
    expect(lines.size).toBe(4)
  })

  it('falls back to "AI" when no tool', () => {
    expect(flavorText({ pattern: 'Delegator', topToolName: null, consistency: 0 })).toContain('AI')
  })

  it('adds streak prefix at consistency >= 75', () => {
    const line = flavorText({ pattern: 'AI Native', topToolName: 'Claude', consistency: 80 })
    expect(line.startsWith('Never misses a week.')).toBe(true)
  })
})
