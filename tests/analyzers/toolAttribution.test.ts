import { describe, expect, it } from 'vitest'
import { analyzeToolAttribution } from '~/analyzers/toolAttribution'
import type { GitHubCommit } from '~/github/types'

const commit = (message: string, login: string | null = 'user'): GitHubCommit => ({
  message,
  committedDate: '2026-03-14T10:00:00Z',
  author: { user: login ? { login } : null },
})

describe('analyzeToolAttribution', () => {
  it('returns empty tools for empty commits', () => {
    const result = analyzeToolAttribution([])
    expect(result.tools).toEqual([])
    expect(result.totalAiCommits).toBe(0)
  })

  it('attributes claude from @anthropic.com co-author', () => {
    const commits = [
      commit('feat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>'),
      commit('fix: y\n\nCo-Authored-By: Claude <noreply@anthropic.com>'),
    ]
    const result = analyzeToolAttribution(commits)
    expect(result.tools).toHaveLength(1)
    expect(result.tools[0].toolId).toBe('claude')
    expect(result.tools[0].commitCount).toBe(2)
    expect(result.tools[0].percentage).toBe(100)
  })

  it('attributes copilot from copilot keyword', () => {
    const commits = [commit('feat: x\n\nCo-Authored-By: copilot <copilot@github.com>')]
    const result = analyzeToolAttribution(commits)
    expect(result.tools[0].toolId).toBe('copilot')
  })

  it('splits attribution across multiple tools', () => {
    const commits = [
      commit('feat: a\n\nCo-Authored-By: Claude <noreply@anthropic.com>'),
      commit('feat: b\n\nCo-Authored-By: Claude <noreply@anthropic.com>'),
      commit('feat: c\n\nCo-Authored-By: copilot <copilot@github.com>'),
    ]
    const result = analyzeToolAttribution(commits)
    expect(result.tools).toHaveLength(2)
    expect(result.tools[0].toolId).toBe('claude')
    expect(result.tools[0].percentage).toBeCloseTo(66.7, 0)
    expect(result.tools[1].toolId).toBe('copilot')
  })

  it('handles bot login attribution', () => {
    const commits = [commit('fix: x', 'devin-ai[bot]')]
    const result = analyzeToolAttribution(commits)
    expect(result.tools[0].toolId).toBe('devin')
  })

  it('falls back to unknown for unrecognized patterns', () => {
    const commits = [commit('feat: mystery AI commit')]
    const result = analyzeToolAttribution(commits)
    expect(result.tools[0].toolId).toBe('unknown')
  })
})
