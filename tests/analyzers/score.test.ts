import { describe, expect, it } from 'vitest'
import { analyzeScore } from '~/analyzers/score'
import type { ToolAttributionAnalysis, UsageAnalysis } from '~/analyzers/types'

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

  const makeUsage = (totalCommits: number): UsageAnalysis => ({
    categories: [
      { category: 'feature', count: totalCommits, percentage: 100 },
      { category: 'bugfix', count: 0, percentage: 0 },
      { category: 'test', count: 0, percentage: 0 },
      { category: 'refactor', count: 0, percentage: 0 },
    ],
    totalCommits,
  })

  it('gives S grade for high AI engagement', () => {
    const result = analyzeScore(makeToolAttribution(3, 60), makeUsage(100), true)
    expect(result.grade).toBe('S')
    expect(result.points).toBeGreaterThanOrEqual(80)
  })

  it('gives D grade for no AI activity', () => {
    const result = analyzeScore(makeToolAttribution(0, 0), makeUsage(100), false)
    expect(result.grade).toBe('D')
    expect(result.points).toBeLessThan(20)
  })

  it('gives middle grade for partial adoption', () => {
    const result = analyzeScore(makeToolAttribution(1, 20), makeUsage(100), true)
    expect(['B', 'C']).toContain(result.grade)
  })

  it('includes breakdown details', () => {
    const result = analyzeScore(makeToolAttribution(2, 30), makeUsage(100), true)
    expect(result.breakdown.hasTools).toBe(true)
    expect(result.breakdown.multipleTools).toBe(true)
    expect(result.breakdown.activeAiCommits).toBe(true)
    expect(result.breakdown.recentActivity).toBe(true)
  })

  it('handles zero total commits without division error', () => {
    const result = analyzeScore(makeToolAttribution(0, 0), makeUsage(0), false)
    expect(result.grade).toBe('D')
    expect(result.points).toBe(0)
  })
})
