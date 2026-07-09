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

  it('treats a slim private node (config fields entirely absent) as not equipped', () => {
    // The slim PRIVATE repos query omits the config-file object() lookups, so those keys are
    // undefined (not null) on private nodes. analyzeEquipped must read that as "no signal".
    const privateNode = {
      name: 'secret',
      pushedAt: '2026-07-01T00:00:00Z',
      defaultBranchRef: null,
      primaryLanguage: null,
    } as GitHubRepo
    expect(privateNode.claudeMd).toBeUndefined()
    // A public node with a config file still contributes; the private node adds nothing.
    const result = analyzeEquipped([privateNode, repo({ claudeMd: { id: '1' } })])
    expect(result.equipped).toEqual([{ toolId: 'claude', toolName: 'Claude', repoCount: 1 }])
  })
})
