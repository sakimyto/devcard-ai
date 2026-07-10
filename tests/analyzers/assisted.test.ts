import { describe, expect, it } from 'vitest'
import { detectAssistedSignal } from '~/analyzers/aiPatterns'
import { analyzeToolAttributionV2 } from '~/analyzers/toolAttribution'
import type { GitHubCommit } from '~/github/types'
import corpus from './__fixtures__/commit-corpus.json'
import ownerCorpus from './__fixtures__/owner-codex-corpus.json'

interface CorpusEntry {
  message: string
  authorLogin: string | null
  expected: boolean
  expectedTool?: string
  expectedAssisted: string | null
  note: string
}

let oidCounter = 0
const commit = (message: string, login: string | null = null): GitHubCommit => ({
  oid: `sha-${++oidCounter}`,
  message,
  committedDate: '2026-07-01T00:00:00Z',
  author: { user: login ? { login } : null },
})

describe('detectAssistedSignal corpus (reviewer-context oracle)', () => {
  for (const c of corpus as CorpusEntry[]) {
    it(`${c.note} → assisted=${c.expectedAssisted}`, () => {
      expect(detectAssistedSignal(c.message)).toBe(c.expectedAssisted)
    })
  }
})

// 所有者コーパスの実測アンカー: 直近12週の codex 言及 17 件のうち、旧 ASSISTED_SIGNALS が
// 拾えていたのは 11 件（6 件取りこぼし）。Task 23 のパターン精緻化で全 17 件を拾えることを固定する。
describe('owner codex-assisted corpus (11→17 anchor)', () => {
  interface OwnerEntry {
    message: string
    previouslyCaught: boolean
    note: string
  }
  const entries = ownerCorpus as OwnerEntry[]

  it('has 17 owner codex commits: 11 previously caught + 6 previously missed', () => {
    expect(entries).toHaveLength(17)
    expect(entries.filter((e) => e.previouslyCaught)).toHaveLength(11)
    expect(entries.filter((e) => !e.previouslyCaught)).toHaveLength(6)
  })

  it('now detects codex on all 17 (11→17)', () => {
    const hits = entries.filter((e) => detectAssistedSignal(e.message) === 'codex')
    expect(hits).toHaveLength(17)
  })

  for (const e of entries) {
    it(`${e.note} → codex`, () => {
      expect(detectAssistedSignal(e.message)).toBe('codex')
    })
  }
})

describe('detectAssistedSignal — tool-name-alone must NOT match', () => {
  it('bare mention without a usage verb is null', () => {
    expect(detectAssistedSignal('feat: integrate codex api')).toBeNull()
    expect(detectAssistedSignal('docs: claude を紹介')).toBeNull()
    expect(detectAssistedSignal('chore: bump copilot dep')).toBeNull()
  })
  it('gpt-4/gpt-5 review context attributes to codex, not a chatgpt toolId', () => {
    expect(detectAssistedSignal('fix: gpt-5 review で指摘された NPE')).toBe('codex')
    expect(detectAssistedSignal('perf: gpt-4o flagged a hot loop')).toBe('codex')
  })
})

describe('analyzeToolAttributionV2', () => {
  it('empty commits → empty tools + empty assisted', () => {
    const r = analyzeToolAttributionV2([])
    expect(r.tools).toEqual([])
    expect(r.assisted).toEqual([])
    expect(r.totalAiCommits).toBe(0)
    expect(r.verified).toBe(false)
  })

  it('committed and assisted coexist on the same commit (Claude committed + Codex assisted)', () => {
    const r = analyzeToolAttributionV2([
      commit(
        'fix: x\n\ncodexレビュー(#4)で3点修正\n\nCo-Authored-By: Claude <noreply@anthropic.com>',
      ),
    ])
    expect(r.tools).toHaveLength(1)
    expect(r.tools[0].toolId).toBe('claude')
    expect(r.assisted).toHaveLength(1)
    expect(r.assisted[0].toolId).toBe('codex')
    expect(r.assisted[0].count).toBe(1)
  })

  it('does NOT list a tool in assisted when it already appears in committed', () => {
    // codex is both committed (trailer) and assisted (body) → only committed keeps it
    const r = analyzeToolAttributionV2([
      commit('feat: y\n\ncodexレビュー反映\n\nCo-authored-by: Codex <codex@openai.com>'),
    ])
    expect(r.tools[0].toolId).toBe('codex')
    expect(r.assisted).toEqual([])
  })

  it('%-share denominator is committed commits only (assisted-only commits excluded)', () => {
    const r = analyzeToolAttributionV2([
      commit('feat: a\n\nCo-Authored-By: Claude <noreply@anthropic.com>'),
      commit('feat: b\n\nCo-Authored-By: Claude <noreply@anthropic.com>'),
      commit('fix: c codexレビュー反映'), // assisted-only, not committed
    ])
    expect(r.tools).toHaveLength(1)
    expect(r.tools[0].toolId).toBe('claude')
    expect(r.tools[0].percentage).toBe(100)
    expect(r.assisted[0].toolId).toBe('codex')
    // totalAiCommits counts all involved commits (committed + assisted-only), not just committed
    expect(r.totalAiCommits).toBe(3)
  })

  it('totalAiCommits reflects assisted-only commits (committed OR assisted definition)', () => {
    const r = analyzeToolAttributionV2([
      commit('fix: a codexレビュー反映'),
      commit('fix: b claudeレビュー指摘'),
    ])
    // no committed trailers → tools empty, but both commits are AI-involved
    expect(r.tools).toEqual([])
    expect(r.totalAiCommits).toBe(2)
    expect(r.assisted.map((a) => a.toolId).sort()).toEqual(['claude', 'codex'])
    // assisted evidence is specific & public → the card still earns ✓ verified
    expect(r.verified).toBe(true)
  })

  it('assisted sorts by count desc then toolId asc', () => {
    const r = analyzeToolAttributionV2([
      commit('fix: a claudeレビュー反映'),
      commit('fix: b codexレビュー反映'),
      commit('fix: c codexレビュー反映'),
    ])
    // codex=2, claude=1 → codex first
    expect(r.assisted.map((a) => a.toolId)).toEqual(['codex', 'claude'])
    expect(r.assisted[0].count).toBe(2)
  })
})
