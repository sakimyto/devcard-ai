import { describe, expect, it } from 'vitest'
import { analyzeScore } from '~/analyzers/score'
import type { ToolAttributionAnalysis } from '~/analyzers/types'

describe('analyzeScore', () => {
  const makeToolAttribution = (toolCount: number, totalAiCommits: number): ToolAttributionAnalysis => ({
    tools: Array.from({ length: toolCount }, (_, i) => ({
      toolId: `tool-${i}`,
      toolName: `Tool ${i}`,
      commitCount: Math.floor(totalAiCommits / toolCount),
      percentage: 100 / toolCount,
    })),
    totalAiCommits,
    verified: toolCount > 0,
  })

  it('gives S grade for high AI engagement (60/100 AI, 3 tools, recent)', () => {
    const result = analyzeScore(makeToolAttribution(3, 60), 100, true)
    expect(result.grade).toBe('S')
    expect(result.points).toBeGreaterThanOrEqual(80)
  })

  it('gives D grade for no AI activity', () => {
    const result = analyzeScore(makeToolAttribution(0, 0), 100, false)
    expect(result.grade).toBe('D')
    expect(result.points).toBeLessThan(20)
  })

  it('gives middle grade for partial adoption (20/100 AI, 1 tool)', () => {
    const result = analyzeScore(makeToolAttribution(1, 20), 100, true)
    expect(['B', 'C']).toContain(result.grade)
  })

  it('includes breakdown details', () => {
    const result = analyzeScore(makeToolAttribution(2, 30), 100, true)
    expect(result.breakdown.hasTools).toBe(true)
    expect(result.breakdown.multipleTools).toBe(true)
    expect(result.breakdown.activeAiCommits).toBe(true)
    expect(result.breakdown.recentActivity).toBe(true)
  })

  it('handles zero total commits without division error', () => {
    const result = analyzeScore(makeToolAttribution(0, 0), 0, false)
    expect(result.grade).toBe('D')
    expect(result.points).toBe(0)
  })

  it('does not saturate aiRate when only AI commits were counted historically', () => {
    // Regression guard: previously the handler passed `usage.totalCommits`
    // (which equals AI-commit count after the usage-centric redesign),
    // which made aiRate always 1 and pushed everyone toward TIER S.
    // With the correct denominator (1 AI of 100 total = 1%), activeAiCommits
    // should be false and the rate-based bonus zero.
    const result = analyzeScore(makeToolAttribution(1, 1), 100, false)
    expect(result.breakdown.activeAiCommits).toBe(false)
    // Only hasTools (25) fires → below B threshold (40)
    expect(result.grade).toBe('C')
  })
})
