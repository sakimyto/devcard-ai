import { describe, expect, it, vi } from 'vitest'
import type { GitHubUser } from '~/github/types'
import { handleRequest } from '~/handler'

const mockUser: GitHubUser = {
  login: 'testuser',
  repositories: {
    nodes: [
      {
        name: 'my-repo',
        pushedAt: '2026-03-14T00:00:00Z',
        defaultBranchRef: {
          target: {
            history: {
              nodes: [
                {
                  message:
                    'feat: add\n\nCo-Authored-By: Claude <noreply@anthropic.com>',
                  committedDate: '2026-03-14T00:00:00Z',
                  author: { user: { login: 'testuser' } },
                },
                {
                  message: 'fix: bug',
                  committedDate: '2026-03-13T00:00:00Z',
                  author: { user: { login: 'testuser' } },
                },
              ],
              totalCount: 2,
            },
          },
        },
        claudeMd: { id: 'abc' },
        agentsMd: null,
        cursorrules: null,
        cursorrulesDir: null,
        githubCopilot: null,
        claudeDir: null,
        primaryLanguage: { name: 'TypeScript', color: '#3178c6' },
      },
    ],
  },
}

describe('handleRequest', () => {
  const mockGraphql = vi.fn()

  it('returns SVG for valid user', async () => {
    mockGraphql.mockResolvedValue({ user: mockUser })
    const result = await handleRequest(
      { user: 'testuser', modules: [], theme: 'light' },
      mockGraphql,
    )
    expect(result.svg).toContain('<svg')
    expect(result.svg).toContain('testuser')
    expect(result.status).toBe(200)
  })

  it('returns error SVG for missing user param', async () => {
    const result = await handleRequest(
      { user: '', modules: [], theme: 'light' },
      mockGraphql,
    )
    expect(result.svg).toContain('User parameter required')
    expect(result.status).toBe(200)
  })

  it('returns error SVG for non-existent user', async () => {
    mockGraphql.mockResolvedValue({ user: null })
    const result = await handleRequest(
      { user: 'ghost', modules: [], theme: 'light' },
      mockGraphql,
    )
    expect(result.svg).toContain('User not found')
    expect(result.status).toBe(200)
  })

  it('returns error SVG for user with no public repos', async () => {
    mockGraphql.mockResolvedValue({
      user: { login: 'emptyuser', repositories: { nodes: [] } },
    })
    const result = await handleRequest(
      { user: 'emptyuser', modules: [], theme: 'light' },
      mockGraphql,
    )
    expect(result.svg).toContain('No public repos')
    expect(result.status).toBe(200)
  })

  it('returns error SVG when no AI activity detected', async () => {
    const noAiUser = {
      ...mockUser,
      repositories: {
        nodes: [
          {
            ...mockUser.repositories.nodes[0],
            claudeMd: null,
            claudeDir: null,
            defaultBranchRef: {
              target: {
                history: {
                  nodes: [
                    {
                      message: 'fix: bug',
                      committedDate: '2026-03-14T00:00:00Z',
                      author: { user: { login: 'testuser' } },
                    },
                  ],
                  totalCount: 1,
                },
              },
            },
          },
        ],
      },
    }
    mockGraphql.mockResolvedValue({ user: noAiUser })
    const result = await handleRequest(
      { user: 'testuser', modules: [], theme: 'light' },
      mockGraphql,
    )
    expect(result.svg).toContain('No AI activity detected yet')
    expect(result.status).toBe(200)
  })

  it('handles repos with null defaultBranchRef', async () => {
    const emptyRepoUser = {
      ...mockUser,
      repositories: {
        nodes: [
          {
            ...mockUser.repositories.nodes[0],
            defaultBranchRef: null,
            claudeMd: null,
            claudeDir: null,
          },
        ],
      },
    }
    mockGraphql.mockResolvedValue({ user: emptyRepoUser })
    const result = await handleRequest(
      { user: 'testuser', modules: [], theme: 'light' },
      mockGraphql,
    )
    expect(result.svg).toContain('<svg')
    expect(result.svg).toContain('No AI activity detected yet')
    expect(result.status).toBe(200)
  })

  it('returns rate limit message on rate limit error', async () => {
    mockGraphql.mockRejectedValue(new Error('rate limit exceeded'))
    const result = await handleRequest(
      { user: 'testuser', modules: [], theme: 'light' },
      mockGraphql,
    )
    expect(result.svg).toContain('GitHub API rate limit exceeded')
    expect(result.status).toBe(200)
  })

  it('returns generic error on unknown failure', async () => {
    mockGraphql.mockRejectedValue(new Error('network error'))
    const result = await handleRequest(
      { user: 'testuser', modules: [], theme: 'light' },
      mockGraphql,
    )
    expect(result.svg).toContain('Temporarily unavailable')
    expect(result.status).toBe(200)
  })
})
