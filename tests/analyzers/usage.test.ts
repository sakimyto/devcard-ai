import { describe, expect, it } from 'vitest'
import { analyzeUsage } from '~/analyzers/usage'
import type { GitHubCommit } from '~/github/types'

const commit = (message: string): GitHubCommit => ({
  message,
  committedDate: '2026-03-14T10:00:00Z',
  author: { user: { login: 'user' } },
})

describe('analyzeUsage', () => {
  it('returns zero categories for empty commits', () => {
    const result = analyzeUsage([])
    expect(result.totalCommits).toBe(0)
    expect(result.categories.every((c) => c.count === 0)).toBe(true)
  })

  it('classifies feat: as feature', () => {
    const result = analyzeUsage([commit('feat: add login')])
    const feat = result.categories.find((c) => c.category === 'feature')
    expect(feat?.count).toBe(1)
    expect(feat?.percentage).toBe(100)
  })

  it('classifies fix: as bugfix', () => {
    const result = analyzeUsage([commit('fix: null check')])
    expect(result.categories.find((c) => c.category === 'bugfix')?.count).toBe(1)
  })

  it('classifies test: as test', () => {
    const result = analyzeUsage([commit('test: add unit tests')])
    expect(result.categories.find((c) => c.category === 'test')?.count).toBe(1)
  })

  it('classifies refactor/chore/docs into refactor', () => {
    const commits = [
      commit('refactor: extract fn'),
      commit('chore: update deps'),
      commit('docs: update readme'),
    ]
    const result = analyzeUsage(commits)
    expect(result.categories.find((c) => c.category === 'refactor')?.count).toBe(3)
  })

  it('defaults to feature for no prefix', () => {
    const result = analyzeUsage([commit('add new thing')])
    expect(result.categories.find((c) => c.category === 'feature')?.count).toBe(1)
  })

  it('sorts categories by count descending', () => {
    const commits = [
      commit('feat: a'), commit('feat: b'), commit('feat: c'),
      commit('fix: d'),
    ]
    const result = analyzeUsage(commits)
    expect(result.categories[0].category).toBe('feature')
    expect(result.categories[1].category).toBe('bugfix')
  })
})
