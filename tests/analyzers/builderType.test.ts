import { describe, expect, it } from 'vitest'
import { analyzeBuilderType } from '~/analyzers/builderType'
import type { StatsAnalysis } from '~/analyzers/types'

// Axis thresholds: synergy>=50 (A/H), flow>=40 (F/D), consistency>=50 (S/R), range>=50 (W/N).
// Below-threshold on every axis and low velocity so the Ascendant override never fires.
function stats(over: Partial<StatsAnalysis> = {}): StatsAnalysis {
  return {
    velocity: 0,
    diversity: 0,
    consistency: 0,
    synergy: 0,
    range: 0,
    flow: 0,
    points: 0,
    grade: 'D',
    power: 0,
    aiCommitsInWindow: 0,
    activeWeeks: 0,
    ...over,
  }
}

// Build stats that resolve to a given 4-letter code (velocity kept low to avoid Ascendant).
function coded(code: string): StatsAnalysis {
  return stats({
    synergy: code[0] === 'A' ? 50 : 49,
    flow: code[1] === 'F' ? 40 : 39,
    consistency: code[2] === 'S' ? 50 : 49,
    range: code[3] === 'W' ? 50 : 49,
    velocity: 0,
  })
}

const TABLE: Record<string, string> = {
  AFSW: 'The Symbiont',
  AFSN: 'The Duet',
  AFRW: 'The Stormrider',
  AFRN: 'The Spark',
  ADSW: 'The Overseer',
  ADSN: 'The Architect',
  ADRW: 'The Summoner',
  ADRN: 'The Catalyst',
  HFSW: 'The Artisan',
  HFSN: 'The Craftsman',
  HFRW: 'The Wanderer',
  HFRN: 'The Tinkerer',
  HDSW: 'The Strategist',
  HDSN: 'The Specialist',
  HDRW: 'The Maverick',
  HDRN: 'The Lone Wolf',
}

describe('analyzeBuilderType', () => {
  it('covers all 16 codes with the exact epithet names', () => {
    for (const [code, name] of Object.entries(TABLE)) {
      expect(analyzeBuilderType(coded(code))).toBe(name)
    }
  })

  it('never emits duplicate names across the 16 codes', () => {
    const names = new Set(Object.keys(TABLE).map((c) => analyzeBuilderType(coded(c))))
    expect(names.size).toBe(16)
  })

  it('applies each axis threshold at the boundary', () => {
    // synergy: 49 → H, 50 → A (flip AFSW→HFSW baseline via synergy only)
    expect(analyzeBuilderType(coded('HFSW'))).toBe('The Artisan')
    expect(analyzeBuilderType(coded('AFSW'))).toBe('The Symbiont')
    // flow: 39 → D, 40 → F
    expect(analyzeBuilderType(coded('ADSW'))).toBe('The Overseer')
    expect(analyzeBuilderType(coded('AFSW'))).toBe('The Symbiont')
    // consistency: 49 → R, 50 → S
    expect(analyzeBuilderType(coded('AFRW'))).toBe('The Stormrider')
    // range: 49 → N, 50 → W
    expect(analyzeBuilderType(coded('AFSN'))).toBe('The Duet')
  })

  it('promotes to The Ascendant only when synergy>=75 AND velocity>=60', () => {
    expect(analyzeBuilderType(stats({ synergy: 75, velocity: 60 }))).toBe('The Ascendant')
    // synergy boundary: 74 does not promote
    expect(analyzeBuilderType(stats({ synergy: 74, velocity: 60 }))).not.toBe('The Ascendant')
    // velocity boundary: 59 does not promote
    expect(analyzeBuilderType(stats({ synergy: 75, velocity: 59 }))).not.toBe('The Ascendant')
  })

  it('Ascendant overrides an otherwise-normal code', () => {
    // These stats would map to AFSW, but the override wins.
    const s = stats({ synergy: 80, flow: 40, consistency: 50, range: 50, velocity: 70 })
    expect(analyzeBuilderType(s)).toBe('The Ascendant')
  })
})
