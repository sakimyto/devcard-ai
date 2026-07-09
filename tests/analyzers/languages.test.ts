import { describe, expect, it } from 'vitest'
import { analyzeLanguagesV2 } from '~/analyzers/languages'
import type { GitHubRepo, RepoLanguages } from '~/github/types'

// Minimal repo carrying only a languages breakdown; all other fields are irrelevant to
// analyzeLanguagesV2 and default to the "no signal" shape.
const repo = (languages: RepoLanguages | null): GitHubRepo => ({
  name: 'test',
  pushedAt: '2026-03-14T00:00:00Z',
  defaultBranchRef: null,
  claudeMd: null,
  agentsMd: null,
  cursorrules: null,
  cursorrulesDir: null,
  githubCopilot: null,
  claudeDir: null,
  primaryLanguage: null,
  languages,
})

const langs = (edges: { name: string; color: string | null; size: number }[]): RepoLanguages => ({
  totalSize: edges.reduce((a, e) => a + e.size, 0),
  edges: edges.map((e) => ({ size: e.size, node: { name: e.name, color: e.color } })),
})

describe('analyzeLanguagesV2', () => {
  it('aggregates bytes across repos and returns byte-share percentages, desc', () => {
    const result = analyzeLanguagesV2([
      repo(langs([{ name: 'TypeScript', color: '#3178c6', size: 600 }])),
      repo(
        langs([
          { name: 'TypeScript', color: '#3178c6', size: 200 },
          { name: 'Python', color: '#3572A5', size: 200 },
        ]),
      ),
    ])
    // TS 800 / 1000 = 80, Python 200 / 1000 = 20
    expect(result.languages).toEqual([
      { name: 'TypeScript', color: '#3178c6', percentage: 80 },
      { name: 'Python', color: '#3572A5', percentage: 20 },
    ])
    expect(result.othersPercentage).toBe(0)
  })

  it('keeps the top 4 languages and folds the rest into others', () => {
    const result = analyzeLanguagesV2([
      repo(
        langs([
          { name: 'A', color: '#111111', size: 50 },
          { name: 'B', color: '#222222', size: 25 },
          { name: 'C', color: '#333333', size: 13 },
          { name: 'D', color: '#444444', size: 7 },
          { name: 'E', color: '#555555', size: 3 },
          { name: 'F', color: '#666666', size: 2 },
        ]),
      ),
    ])
    expect(result.languages.map((l) => l.name)).toEqual(['A', 'B', 'C', 'D'])
    // A50 B25 C13 D7 = 95, others (E3+F2=5) → 100-95 = 5
    expect(result.othersPercentage).toBe(5)
    expect(result.languages.reduce((a, l) => a + l.percentage, 0) + result.othersPercentage).toBe(
      100,
    )
  })

  it('absorbs the rounding residual into others so the bar always sums to 100 (33.4/33.3/33.3)', () => {
    const result = analyzeLanguagesV2([
      repo(
        langs([
          { name: 'A', color: '#111111', size: 334 },
          { name: 'B', color: '#222222', size: 333 },
          { name: 'C', color: '#333333', size: 333 },
        ]),
      ),
    ])
    // round(33.4)=33, round(33.3)=33, round(33.3)=33 → 99; residual 1 → others
    expect(result.languages.map((l) => l.percentage)).toEqual([33, 33, 33])
    expect(result.othersPercentage).toBe(1)
    expect(result.languages.reduce((a, l) => a + l.percentage, 0) + result.othersPercentage).toBe(
      100,
    )
  })

  it('does not filter noise languages (Markdown/HTML/CSS counted honestly)', () => {
    const result = analyzeLanguagesV2([
      repo(
        langs([
          { name: 'TypeScript', color: '#3178c6', size: 500 },
          { name: 'CSS', color: '#563d7c', size: 300 },
          { name: 'HTML', color: '#e34c26', size: 200 },
        ]),
      ),
    ])
    expect(result.languages.map((l) => l.name)).toEqual(['TypeScript', 'CSS', 'HTML'])
  })

  it('empty repos → empty analysis (no NaN)', () => {
    const result = analyzeLanguagesV2([repo(null), repo(langs([]))])
    expect(result.languages).toEqual([])
    expect(result.othersPercentage).toBe(0)
  })

  it('missing languages field falls back to empty (all repos degrade)', () => {
    const noLang: GitHubRepo = { ...repo(null) }
    // biome-ignore lint/performance/noDelete: exercise the truly-absent (undefined) field
    delete (noLang as { languages?: unknown }).languages
    const result = analyzeLanguagesV2([noLang])
    expect(result.languages).toEqual([])
    expect(result.othersPercentage).toBe(0)
  })

  it('substitutes a neutral gray for a null language color', () => {
    const result = analyzeLanguagesV2([
      repo(langs([{ name: 'Dockerfile', color: null, size: 100 }])),
    ])
    expect(result.languages[0].color).toBe('#858585')
  })

  it('breaks byte ties deterministically by name (asc)', () => {
    const result = analyzeLanguagesV2([
      repo(
        langs([
          { name: 'Zig', color: '#111111', size: 100 },
          { name: 'Ada', color: '#222222', size: 100 },
        ]),
      ),
    ])
    expect(result.languages.map((l) => l.name)).toEqual(['Ada', 'Zig'])
  })
})
