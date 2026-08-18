import { describe, expect, it } from 'vitest'
import { analyzeElement } from '~/analyzers/element'
import type { StatsAnalysis } from '~/analyzers/types'

function stats(over: Partial<StatsAnalysis> = {}): StatsAnalysis {
  return {
    velocity: 0,
    diversity: 0,
    consistency: 0,
    synergy: 0,
    range: 0,
    flow: 0,
    power: 0,
    aiCommitsInWindow: 0,
    activeWeeks: 0,
    ...over,
  }
}

describe('analyzeElement', () => {
  it('maps each axis-max to its element', () => {
    expect(analyzeElement(stats({ velocity: 90 })).id).toBe('bolt')
    expect(analyzeElement(stats({ synergy: 90 })).id).toBe('lumen')
    expect(analyzeElement(stats({ consistency: 90 })).id).toBe('tide')
    expect(analyzeElement(stats({ flow: 90 })).id).toBe('gale')
    expect(analyzeElement(stats({ range: 90 })).id).toBe('terra')
    expect(analyzeElement(stats({ diversity: 90 })).id).toBe('blaze')
  })

  it('carries label + color for the winning element', () => {
    const r = analyzeElement(stats({ synergy: 90 }))
    expect(r).toEqual({ id: 'lumen', label: 'Lumen', color: '#a371f7' })
  })

  it('breaks ties by table order (velocity > synergy > consistency > flow > range > diversity)', () => {
    // All equal → velocity wins (first in table).
    expect(analyzeElement(stats({ velocity: 50, synergy: 50, consistency: 50 })).id).toBe('bolt')
    // velocity below the tied pair → synergy wins over consistency.
    expect(analyzeElement(stats({ synergy: 50, consistency: 50 })).id).toBe('lumen')
    // range vs diversity tie → range wins.
    expect(analyzeElement(stats({ range: 40, diversity: 40 })).id).toBe('terra')
  })

  it('all-zero stats falls back to the first element (bolt)', () => {
    expect(analyzeElement(stats()).id).toBe('bolt')
  })
})
