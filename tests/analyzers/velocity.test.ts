import { describe, expect, it } from 'vitest'
import { analyzeVelocity } from '~/analyzers/velocity'
import type { GitHubCommit } from '~/github/types'

function commit(date: string, message = 'feat: x'): GitHubCommit {
  return {
    oid: `sha-${date}`,
    message,
    committedDate: `${date}T12:00:00Z`,
    author: { user: { login: 'u' } },
  }
}

// Fixed reference: Wednesday 2026-04-22 UTC.
// 12-week window spans 2026-01-28 → 2026-04-22.
const NOW = new Date('2026-04-22T00:00:00Z')

describe('analyzeVelocity', () => {
  it('returns zeros for empty commits', () => {
    const r = analyzeVelocity([], NOW)
    expect(r.weeksActive).toBe(0)
    expect(r.commitsPerWeek).toBe(0)
    expect(r.sparkline).toHaveLength(12)
    expect(r.sparkline.every((n) => n === 0)).toBe(true)
    expect(r.firstAiDate).toBeNull()
    expect(r.daysSinceFirst).toBe(0)
  })

  it('counts a single commit as one active week', () => {
    const r = analyzeVelocity([commit('2026-04-20')], NOW)
    expect(r.weeksActive).toBe(1)
    expect(r.commitsPerWeek).toBe(1)
    expect(r.sparkline[11]).toBe(1)
    expect(r.sparkline.slice(0, 11).every((n) => n === 0)).toBe(true)
  })

  it('bins commits into the correct week of the 12-week sparkline', () => {
    // 2026-04-20 is the current week (bin index 11).
    // 2026-04-13 is one week ago (bin index 10).
    // 2026-02-02 is 11 weeks ago (bin index 0) — inside window edge.
    const commits = [
      commit('2026-04-20'),
      commit('2026-04-20'),
      commit('2026-04-13'),
      commit('2026-02-02'),
    ]
    const r = analyzeVelocity(commits, NOW)
    expect(r.sparkline[11]).toBe(2)
    expect(r.sparkline[10]).toBe(1)
    expect(r.sparkline[0]).toBe(1)
    expect(r.weeksActive).toBe(3)
    // commitsPerWeek = 4 / 3 ≈ 1.33, rounded to 1 decimal
    expect(r.commitsPerWeek).toBeCloseTo(1.3, 1)
  })

  it('ignores commits older than the 12-week window for sparkline & weeksActive', () => {
    // 2025-06-01 is well outside 12-week window but should still set firstAiDate
    const commits = [
      commit('2025-06-01'),
      commit('2026-04-20'),
    ]
    const r = analyzeVelocity(commits, NOW)
    expect(r.weeksActive).toBe(1)
    expect(r.sparkline.reduce((a, b) => a + b, 0)).toBe(1)
    expect(r.firstAiDate).toBe('2025-06-01')
    expect(r.daysSinceFirst).toBeGreaterThan(300)
  })

  it('is idempotent: same input → same output', () => {
    const commits = [
      commit('2026-04-01'),
      commit('2026-03-15'),
      commit('2026-02-10'),
    ]
    const a = analyzeVelocity(commits, NOW)
    const b = analyzeVelocity(commits, NOW)
    expect(a).toEqual(b)
  })

  it('does not mutate the input array', () => {
    const commits = [commit('2026-04-01'), commit('2026-03-15')]
    const snapshot = [...commits]
    analyzeVelocity(commits, NOW)
    expect(commits).toEqual(snapshot)
  })

  it('handles commits on the same day as multiple events in one bin', () => {
    const commits = [
      commit('2026-04-20'),
      commit('2026-04-20'),
      commit('2026-04-20'),
    ]
    const r = analyzeVelocity(commits, NOW)
    expect(r.sparkline[11]).toBe(3)
    expect(r.weeksActive).toBe(1)
    expect(r.commitsPerWeek).toBe(3)
  })

  it('sets daysSinceFirst to 0 when first commit is today', () => {
    const r = analyzeVelocity([commit('2026-04-22')], NOW)
    expect(r.daysSinceFirst).toBe(0)
  })

  it('skips commits with unparseable dates without throwing', () => {
    const bad: GitHubCommit = {
      oid: 'sha-bad',
      message: 'feat: x',
      committedDate: 'not-a-date',
      author: { user: { login: 'u' } },
    }
    const r = analyzeVelocity([bad, commit('2026-04-20')], NOW)
    expect(r.sparkline[11]).toBe(1)
    expect(r.weeksActive).toBe(1)
    expect(r.firstAiDate).toBe('2026-04-20')
  })

  it('bins a commit exactly 6 days ago into bin 11 (same week)', () => {
    // NOW = 2026-04-22 UTC. 6 days ago = 2026-04-16.
    const r = analyzeVelocity([commit('2026-04-16')], NOW)
    expect(r.sparkline[11]).toBe(1)
    expect(r.sparkline[10]).toBe(0)
  })

  it('bins a commit exactly 7 days ago into bin 10 (previous week)', () => {
    // NOW = 2026-04-22 UTC. 7 days ago = 2026-04-15.
    const r = analyzeVelocity([commit('2026-04-15')], NOW)
    expect(r.sparkline[10]).toBe(1)
    expect(r.sparkline[11]).toBe(0)
  })

  it('excludes a commit exactly 84 days (12 weeks) ago (out of window)', () => {
    // NOW = 2026-04-22 UTC. 84 days ago = 2026-01-28.
    const r = analyzeVelocity([commit('2026-01-28')], NOW)
    expect(r.sparkline.every((n) => n === 0)).toBe(true)
  })

  it('ignores future-dated commits entirely (no sparkline bin, no firstAiDate)', () => {
    const r = analyzeVelocity([commit('2030-01-01')], NOW)
    expect(r.sparkline.every((n) => n === 0)).toBe(true)
    expect(r.weeksActive).toBe(0)
    expect(r.firstAiDate).toBeNull()
    expect(r.daysSinceFirst).toBe(0)
  })

  it('picks a past commit over a future one for firstAiDate', () => {
    const commits = [commit('2030-01-01'), commit('2026-03-15')]
    const r = analyzeVelocity(commits, NOW)
    expect(r.firstAiDate).toBe('2026-03-15')
  })
})
