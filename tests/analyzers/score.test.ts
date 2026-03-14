import { describe, it, expect } from 'vitest'
import { analyzeScore } from '~/analyzers/score'
import type { CoauthorAnalysis, ToolsAnalysis } from '~/analyzers/types'

describe('analyzeScore', () => {
  const makeCoauthor = (rate: number): CoauthorAnalysis => ({
    totalCommits: 100,
    aiCommits: Math.round(rate * 100),
    rate,
  })

  const makeTools = (count: number): ToolsAnalysis => ({
    tools: Array.from({ length: count }, (_, i) => ({
      id: `tool-${i}`,
      name: `Tool ${i}`,
      repoCount: 1,
    })),
  })

  it('gives S grade for high AI engagement', () => {
    const result = analyzeScore(makeCoauthor(0.6), makeTools(3), true)
    expect(result.grade).toBe('S')
    expect(result.points).toBeGreaterThanOrEqual(80)
  })

  it('gives D grade for no AI activity', () => {
    const result = analyzeScore(makeCoauthor(0), makeTools(0), false)
    expect(result.grade).toBe('D')
    expect(result.points).toBeLessThan(20)
  })

  it('gives middle grade for partial adoption', () => {
    const result = analyzeScore(makeCoauthor(0.2), makeTools(1), true)
    expect(['B', 'C']).toContain(result.grade)
  })

  it('includes breakdown details', () => {
    const result = analyzeScore(makeCoauthor(0.3), makeTools(2), true)
    expect(result.breakdown.hasAiConfig).toBe(true)
    expect(result.breakdown.multipleTools).toBe(true)
    expect(result.breakdown.activeAiCommits).toBe(true)
    expect(result.breakdown.recentActivity).toBe(true)
  })
})
