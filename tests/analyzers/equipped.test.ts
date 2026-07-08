import { describe, expect, it } from 'vitest'
import { analyzeEquipped } from '~/analyzers/equipped'
import type { GitHubRepo } from '~/github/types'

const repo = (over: Partial<GitHubRepo>): GitHubRepo => ({
  name: 'r',
  pushedAt: '2026-07-01T00:00:00Z',
  defaultBranchRef: null,
  claudeMd: null,
  agentsMd: null,
  cursorrules: null,
  cursorrulesDir: null,
  githubCopilot: null,
  claudeDir: null,
  primaryLanguage: null,
  ...over,
})

describe('analyzeEquipped', () => {
  it('maps config files to tools with repo counts, sorted desc', () => {
    const repos = [
      repo({ claudeMd: { id: '1' } }),
      repo({ claudeDir: { id: '2' } }),
      repo({ cursorrules: { id: '3' } }),
      repo({ agentsMd: { id: '4' }, githubCopilot: { id: '5' } }),
    ]
    const result = analyzeEquipped(repos)
    expect(result.equipped).toEqual([
      { toolId: 'claude', toolName: 'Claude', repoCount: 2 },
      { toolId: 'codex', toolName: 'Codex', repoCount: 1 },
      { toolId: 'copilot', toolName: 'Copilot', repoCount: 1 },
      { toolId: 'cursor', toolName: 'Cursor', repoCount: 1 },
    ])
  })

  it('counts claude once per repo even with both CLAUDE.md and .claude/', () => {
    const result = analyzeEquipped([repo({ claudeMd: { id: '1' }, claudeDir: { id: '2' } })])
    expect(result.equipped).toEqual([{ toolId: 'claude', toolName: 'Claude', repoCount: 1 }])
  })

  it('returns empty for no config files / empty repos', () => {
    expect(analyzeEquipped([repo({})]).equipped).toEqual([])
    expect(analyzeEquipped([]).equipped).toEqual([])
  })
})
