import { describe, expect, it } from 'vitest'
import { analyzeLanguages } from '~/analyzers/languages'
import type { GitHubRepo } from '~/github/types'

const repo = (
  lang: { name: string; color: string } | null,
  hasAiConfig: boolean,
): GitHubRepo => ({
  name: 'test',
  pushedAt: '2026-03-14T00:00:00Z',
  defaultBranchRef: null,
  claudeMd: hasAiConfig ? { id: 'x' } : null,
  agentsMd: null,
  cursorrules: null,
  cursorrulesDir: null,
  githubCopilot: null,
  claudeDir: null,
  primaryLanguage: lang,
})

describe('analyzeLanguages', () => {
  it('returns language from any repo', () => {
    const result = analyzeLanguages([repo({ name: 'TypeScript', color: '#3178c6' }, false)])
    expect(result.languages).toHaveLength(1)
    expect(result.languages[0].name).toBe('TypeScript')
  })

  it('skips repos with null primaryLanguage', () => {
    const result = analyzeLanguages([repo(null, true)])
    expect(result.languages).toEqual([])
  })

  it('returns top 3 sorted by repo count', () => {
    const repos = [
      repo({ name: 'TypeScript', color: '#3178c6' }, true),
      repo({ name: 'TypeScript', color: '#3178c6' }, true),
      repo({ name: 'Go', color: '#00add8' }, true),
      repo({ name: 'Go', color: '#00add8' }, true),
      repo({ name: 'Go', color: '#00add8' }, true),
      repo({ name: 'Python', color: '#3572a5' }, true),
      repo({ name: 'Rust', color: '#dea584' }, true),
    ]
    const result = analyzeLanguages(repos)
    expect(result.languages).toHaveLength(3)
    expect(result.languages[0].name).toBe('Go')
    expect(result.languages[1].name).toBe('TypeScript')
  })
})
