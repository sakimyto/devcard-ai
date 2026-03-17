import { describe, expect, it } from 'vitest'
import { analyzePattern } from '~/analyzers/pattern'
import type { GitHubCommit } from '~/github/types'

let oidCounter = 0
const commit = (isAi: boolean, date: string): GitHubCommit => ({
  oid: `sha-${++oidCounter}`,
  message: isAi ? 'feat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>' : 'manual commit',
  committedDate: date,
  author: { user: { login: 'user' } },
})

describe('analyzePattern', () => {
  it('returns Selective User for 0 AI commits', () => {
    const commits = [commit(false, '2026-03-14T10:00:00Z')]
    const result = analyzePattern(commits, 0)
    expect(result.pattern).toBe('Selective User')
    expect(result.aiRate).toBe(0)
  })

  it('returns AI Native for >= 60% AI rate', () => {
    const commits = [
      commit(true, '2026-03-14T10:00:00Z'),
      commit(true, '2026-03-14T11:00:00Z'),
      commit(true, '2026-03-14T12:00:00Z'),
      commit(false, '2026-03-14T13:00:00Z'),
    ]
    const result = analyzePattern(commits, 3)
    expect(result.pattern).toBe('AI Native')
  })

  it('returns Pair Programmer for alternating AI/human commits', () => {
    const commits = [
      commit(true, '2026-03-14T10:00:00Z'),
      commit(false, '2026-03-14T10:05:00Z'),
      commit(true, '2026-03-14T10:10:00Z'),
      commit(false, '2026-03-14T10:15:00Z'),
      commit(true, '2026-03-14T10:20:00Z'),
      commit(false, '2026-03-14T10:25:00Z'),
    ]
    const result = analyzePattern(commits, 3)
    expect(result.pattern).toBe('Pair Programmer')
    expect(result.alternationScore).toBeGreaterThan(0.5)
  })

  it('returns Delegator for clustered AI commits', () => {
    const commits = [
      commit(true, '2026-03-14T10:00:00Z'),
      commit(true, '2026-03-14T10:01:00Z'),
      commit(true, '2026-03-14T10:02:00Z'),
      commit(false, '2026-03-14T11:00:00Z'),
      commit(false, '2026-03-14T11:01:00Z'),
      commit(false, '2026-03-14T11:02:00Z'),
    ]
    const result = analyzePattern(commits, 3)
    expect(result.pattern).toBe('Delegator')
    expect(result.alternationScore).toBeLessThanOrEqual(0.5)
  })

  it('returns Selective User for < 30% AI rate', () => {
    const commits = [
      commit(true, '2026-03-14T10:00:00Z'),
      commit(false, '2026-03-14T11:00:00Z'),
      commit(false, '2026-03-14T12:00:00Z'),
      commit(false, '2026-03-14T13:00:00Z'),
      commit(false, '2026-03-14T14:00:00Z'),
    ]
    const result = analyzePattern(commits, 1)
    expect(result.pattern).toBe('Selective User')
  })
})
