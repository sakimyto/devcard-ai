import { describe, expect, it } from 'vitest'
import type { RecordAnalysis } from '~/analyzers/record'
import { analyzeTraits } from '~/analyzers/traits'
import type { TraitsInput } from '~/analyzers/traits'
import type { StatsAnalysis } from '~/analyzers/types'
import type { GitHubCommit } from '~/github/types'

const NOW = new Date('2026-07-09T12:00:00Z') // Thursday

let oidSeq = 0
function commit(date: string, repoFullName = 'user/a'): GitHubCommit {
  oidSeq += 1
  return {
    oid: `oid-${oidSeq}`,
    message: 'x',
    committedDate: date,
    author: { user: { login: 'user' } },
    repoFullName,
  }
}

// N commits on the same UTC day/repo.
function commitsOnDay(date: string, n: number, repo = 'user/a'): GitHubCommit[] {
  return Array.from({ length: n }, () => commit(date, repo))
}

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

type InputOverride = Partial<Omit<TraitsInput, 'record'>> & { record?: Partial<RecordAnalysis> }

// Base input where NOTHING fires (empty arrays, zero stats/record).
function input(over: InputOverride = {}): TraitsInput {
  return {
    stats: stats(over.stats),
    record: {
      exp: 0,
      commits: 0,
      prs: 0,
      reviews: 0,
      issues: 0,
      inclPrivate: false,
      currentStreak: 0,
      longestStreak: 0,
      yearTotal: 0,
      weeklyContributions: [],
      ...over.record,
    },
    toolAttribution: over.toolAttribution ?? {
      tools: [],
      assisted: [],
      totalAiCommits: 0,
      verified: false,
    },
    equipped: over.equipped ?? { equipped: [] },
    languages: over.languages ?? { languages: [], othersPercentage: 0 },
    involvedCommits: over.involvedCommits ?? [],
    windowCommits: over.windowCommits ?? [],
    now: over.now ?? NOW,
  }
}

function ids(r: { id: string }[]): string[] {
  return r.map((t) => t.id)
}

describe('analyzeTraits — 0-trait fallback', () => {
  it('returns [] when no condition holds', () => {
    expect(analyzeTraits(input())).toEqual([])
  })
})

describe('analyzeTraits — stat/record driven traits (fire + boundary + proof)', () => {
  it('ascension: power >= 9000', () => {
    expect(ids(analyzeTraits(input({ stats: stats({ power: 9000 }) })))).toContain('ascension')
    expect(ids(analyzeTraits(input({ stats: stats({ power: 8999 }) })))).not.toContain('ascension')
  })

  it('unbroken: currentStreak >= 21 with the streak length in the proof', () => {
    const r = analyzeTraits(input({ record: { currentStreak: 30 } }))
    expect(r[0]).toMatchObject({ id: 'unbroken', proof: '30-day commit streak, still alive' })
    expect(ids(analyzeTraits(input({ record: { currentStreak: 20 } })))).not.toContain('unbroken')
  })

  it('centurion: aiCommitsInWindow >= 100 with the count embedded', () => {
    const r = analyzeTraits(input({ stats: stats({ aiCommitsInWindow: 137 }) }))
    expect(r[0]).toMatchObject({ id: 'centurion', proof: '137 AI-assisted commits in 12 weeks' })
    expect(ids(analyzeTraits(input({ stats: stats({ aiCommitsInWindow: 99 }) })))).not.toContain(
      'centurion',
    )
  })

  it('perfect-attendance: activeWeeks == 12 exactly', () => {
    expect(ids(analyzeTraits(input({ stats: stats({ activeWeeks: 12 }) })))).toContain(
      'perfect-attendance',
    )
    expect(ids(analyzeTraits(input({ stats: stats({ activeWeeks: 11 }) })))).not.toContain(
      'perfect-attendance',
    )
  })

  it('ghostwriter: synergy >= 80 with the percent embedded', () => {
    const r = analyzeTraits(input({ stats: stats({ synergy: 84 }) }))
    expect(r.find((t) => t.id === 'ghostwriter')?.proof).toBe('84% of commits ship with AI')
    expect(ids(analyzeTraits(input({ stats: stats({ synergy: 79 }) })))).not.toContain(
      'ghostwriter',
    )
  })

  it('iron-hand: synergy <= 20 AND >= 30 window commits', () => {
    const many = commitsOnDay('2026-05-01T00:00:00Z', 30, 'user/legacy')
    expect(
      ids(analyzeTraits(input({ stats: stats({ synergy: 20 }), windowCommits: many }))),
    ).toContain('iron-hand')
    // synergy 21 → not bare-handed enough
    expect(
      ids(analyzeTraits(input({ stats: stats({ synergy: 21 }), windowCommits: many }))),
    ).not.toContain('iron-hand')
    // only 29 commits → below threshold
    expect(
      ids(
        analyzeTraits(
          input({
            stats: stats({ synergy: 20 }),
            windowCommits: commitsOnDay('2026-05-01T00:00:00Z', 29, 'user/legacy'),
          }),
        ),
      ),
    ).not.toContain('iron-hand')
  })

  it('duelist: at least one non-unknown assisted tool', () => {
    expect(
      ids(
        analyzeTraits(
          input({
            toolAttribution: {
              tools: [],
              assisted: [{ toolId: 'codex', toolName: 'Codex', count: 4 }],
              totalAiCommits: 4,
              verified: true,
            },
          }),
        ),
      ),
    ).toContain('duelist')
    // an unknown assisted tool does not count
    expect(
      ids(
        analyzeTraits(
          input({
            toolAttribution: {
              tools: [],
              assisted: [{ toolId: 'unknown', toolName: 'Other', count: 4 }],
              totalAiCommits: 4,
              verified: false,
            },
          }),
        ),
      ),
    ).not.toContain('duelist')
  })

  it('one-true-blade: top tool >= 90% with tool name + percent in proof', () => {
    const r = analyzeTraits(
      input({
        toolAttribution: {
          tools: [{ toolId: 'claude', toolName: 'Claude', commitCount: 95, percentage: 95 }],
          assisted: [],
          totalAiCommits: 95,
          verified: true,
        },
      }),
    )
    expect(r.find((t) => t.id === 'one-true-blade')?.proof).toBe('Claude loyalty: 95%')
    // 89% does not qualify
    expect(
      ids(
        analyzeTraits(
          input({
            toolAttribution: {
              tools: [{ toolId: 'claude', toolName: 'Claude', commitCount: 89, percentage: 89 }],
              assisted: [],
              totalAiCommits: 89,
              verified: true,
            },
          }),
        ),
      ),
    ).not.toContain('one-true-blade')
  })

  it('multi-wielder: >= 3 non-unknown committed tools', () => {
    const three = {
      tools: [
        { toolId: 'claude', toolName: 'Claude', commitCount: 10, percentage: 40 },
        { toolId: 'codex', toolName: 'Codex', commitCount: 8, percentage: 32 },
        { toolId: 'cursor', toolName: 'Cursor', commitCount: 7, percentage: 28 },
      ],
      assisted: [],
      totalAiCommits: 25,
      verified: true,
    }
    const r = analyzeTraits(input({ toolAttribution: three }))
    expect(r.find((t) => t.id === 'multi-wielder')?.proof).toBe('3 blades drawn this season')
  })

  it('armory: >= 3 equipped tools with the count embedded', () => {
    const r = analyzeTraits(
      input({
        equipped: {
          equipped: [
            { toolId: 'claude', toolName: 'Claude', repoCount: 3 },
            { toolId: 'codex', toolName: 'Codex', repoCount: 2 },
            { toolId: 'cursor', toolName: 'Cursor', repoCount: 1 },
          ],
        },
      }),
    )
    expect(r.find((t) => t.id === 'armory')?.proof).toBe('3 tools equipped and ready')
  })

  it("reviewer's eye: reviews >= 15 AND reviews/(commits+1) >= 0.2", () => {
    expect(ids(analyzeTraits(input({ record: { reviews: 20, commits: 40 } })))).toContain(
      'reviewers-eye',
    )
    // ratio too low (20 / 200 = 0.1)
    expect(ids(analyzeTraits(input({ record: { reviews: 20, commits: 199 } })))).not.toContain(
      'reviewers-eye',
    )
    // below 15
    expect(ids(analyzeTraits(input({ record: { reviews: 14, commits: 10 } })))).not.toContain(
      'reviewers-eye',
    )
  })

  it('pr-cannon: prs >= 25 with the count embedded', () => {
    const r = analyzeTraits(input({ record: { prs: 42 } }))
    expect(r.find((t) => t.id === 'pr-cannon')?.proof).toBe('42 pull requests fired')
    expect(ids(analyzeTraits(input({ record: { prs: 24 } })))).not.toContain('pr-cannon')
  })

  it('polyglot: >= 3 languages, names listed in the proof', () => {
    const r = analyzeTraits(
      input({
        languages: {
          languages: [
            { name: 'TypeScript', color: '#1', percentage: 50 },
            { name: 'Go', color: '#2', percentage: 30 },
            { name: 'Rust', color: '#3', percentage: 20 },
          ],
          othersPercentage: 0,
        },
      }),
    )
    expect(r.find((t) => t.id === 'polyglot')?.proof).toBe('Fluent in TypeScript, Go, Rust')
  })
})

describe('analyzeTraits — commit-derived traits', () => {
  it('chain-strike: >= 3 days with 8+ commits', () => {
    const involved = [
      ...commitsOnDay('2026-07-06T00:00:00Z', 8),
      ...commitsOnDay('2026-07-07T00:00:00Z', 8),
      ...commitsOnDay('2026-07-08T00:00:00Z', 8),
    ]
    const r = analyzeTraits(input({ involvedCommits: involved }))
    expect(r.find((t) => t.id === 'chain-strike')?.proof).toBe('3 days of 8+ commits')
  })

  it('burst-caster: a single day with 20+ commits', () => {
    const r = analyzeTraits(input({ involvedCommits: commitsOnDay('2026-07-08T00:00:00Z', 20) }))
    expect(r.find((t) => t.id === 'burst-caster')?.proof).toBe('20 commits in a single day')
    // 19 does not qualify
    expect(
      ids(analyzeTraits(input({ involvedCommits: commitsOnDay('2026-07-08T00:00:00Z', 19) }))),
    ).not.toContain('burst-caster')
  })

  it('monastic: >= 70% of window commits in one repo', () => {
    const win = [
      ...commitsOnDay('2026-06-01T00:00:00Z', 7, 'user/main'),
      ...commitsOnDay('2026-06-01T00:00:00Z', 3, 'user/side'),
    ]
    const r = analyzeTraits(input({ windowCommits: win }))
    expect(r.find((t) => t.id === 'monastic')?.proof).toBe('70% devoted to one repo')
  })

  it('nomad: >= 8 active repositories', () => {
    const win = Array.from({ length: 8 }, (_, i) => commit('2026-06-01T00:00:00Z', `user/r${i}`))
    const r = analyzeTraits(input({ windowCommits: win }))
    expect(r.find((t) => t.id === 'nomad')?.proof).toBe('Roaming 8 repositories')
  })

  it('weekend-warrior: >= 35% of involved commits on UTC Sat/Sun', () => {
    // 2026-07-11 Sat, 2026-07-12 Sun; weekdays otherwise.
    const involved = [
      commit('2026-07-11T00:00:00Z'), // Sat
      commit('2026-07-12T00:00:00Z'), // Sun
      commit('2026-06-30T00:00:00Z'), // Tue
      commit('2026-07-01T00:00:00Z'), // Wed
      commit('2026-07-02T00:00:00Z'), // Thu
    ]
    const r = analyzeTraits(input({ involvedCommits: involved }))
    expect(r.find((t) => t.id === 'weekend-warrior')?.proof).toBe('40% shipped on weekends')
  })

  it('comeback: 3 idle weeks then 3 active weeks', () => {
    // Active in the 3 most-recent weeks only; weeks 3-11 idle → run at newest indices.
    const involved = [
      commit('2026-07-08T00:00:00Z'), // ~1d ago (week 0)
      commit('2026-07-01T00:00:00Z'), // ~8d ago (week 1)
      commit('2026-06-24T00:00:00Z'), // ~15d ago (week 2)
    ]
    expect(ids(analyzeTraits(input({ involvedCommits: involved })))).toContain('comeback')
  })

  it('fresh-summoner: earliest involved commit within 4 weeks; else nothing', () => {
    expect(
      ids(analyzeTraits(input({ involvedCommits: [commit('2026-07-08T00:00:00Z')] }))),
    ).toEqual(['fresh-summoner'])
    // 50 days ago → not fresh, and nothing else fires
    expect(analyzeTraits(input({ involvedCommits: [commit('2026-05-20T00:00:00Z')] }))).toEqual([])
  })
})

describe('analyzeTraits — priority and cap', () => {
  it('returns at most the top two by priority order', () => {
    const r = analyzeTraits(
      input({
        stats: stats({ power: 9000, synergy: 84, activeWeeks: 12 }),
        record: { currentStreak: 30 },
      }),
    )
    // ascension(#1), unbroken(#2), perfect-attendance(#6), ghostwriter(#7) all hold →
    // only the two highest-priority survive.
    expect(ids(r)).toEqual(['ascension', 'unbroken'])
  })
})
