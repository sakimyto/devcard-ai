import { describe, it, expect } from 'vitest'
import { analyzeTools } from '~/analyzers/tools'
import type { GitHubRepo } from '~/github/types'

const makeRepo = (overrides: Partial<GitHubRepo> = {}): GitHubRepo => ({
  name: 'test-repo',
  pushedAt: '2026-03-14T00:00:00Z',
  defaultBranchRef: null,
  claudeMd: null,
  agentsMd: null,
  cursorrules: null,
  cursorrulesDir: null,
  githubCopilot: null,
  claudeDir: null,
  ...overrides,
})

describe('analyzeTools', () => {
  it('detects Claude Code from CLAUDE.md', () => {
    const repos = [makeRepo({ claudeMd: { id: 'x' } })]
    const result = analyzeTools(repos)
    expect(result.tools).toContainEqual(
      expect.objectContaining({ id: 'claude', name: 'Claude Code' })
    )
  })

  it('detects Cursor from .cursorrules', () => {
    const repos = [makeRepo({ cursorrules: { id: 'x' } })]
    const result = analyzeTools(repos)
    expect(result.tools).toContainEqual(
      expect.objectContaining({ id: 'cursor', name: 'Cursor' })
    )
  })

  it('detects Cursor from .cursor/rules', () => {
    const repos = [makeRepo({ cursorrulesDir: { id: 'x' } })]
    const result = analyzeTools(repos)
    expect(result.tools).toContainEqual(
      expect.objectContaining({ id: 'cursor', name: 'Cursor' })
    )
  })

  it('detects Copilot from .github/copilot-instructions.md', () => {
    const repos = [makeRepo({ githubCopilot: { id: 'x' } })]
    const result = analyzeTools(repos)
    expect(result.tools).toContainEqual(
      expect.objectContaining({ id: 'copilot', name: 'GitHub Copilot' })
    )
  })

  it('counts repos per tool', () => {
    const repos = [
      makeRepo({ claudeMd: { id: 'a' } }),
      makeRepo({ claudeMd: { id: 'b' } }),
      makeRepo({ cursorrules: { id: 'c' } }),
    ]
    const result = analyzeTools(repos)
    const claude = result.tools.find((t) => t.id === 'claude')
    expect(claude?.repoCount).toBe(2)
  })

  it('returns empty for repos with no AI config', () => {
    const repos = [makeRepo()]
    const result = analyzeTools(repos)
    expect(result.tools).toHaveLength(0)
  })
})
