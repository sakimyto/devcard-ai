import { describe, it, expect, vi } from 'vitest'
import { fetchUserData } from '~/github/client'

describe('fetchUserData', () => {
  it('returns parsed user data for valid username', async () => {
    const mockGraphql = vi.fn().mockResolvedValue({
      user: {
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
                        message: 'feat: add feature\n\nCo-Authored-By: Claude <noreply@anthropic.com>',
                        committedDate: '2026-03-14T00:00:00Z',
                        author: { user: { login: 'testuser' } },
                      },
                    ],
                    totalCount: 1,
                  },
                },
              },
              claudeMd: { id: 'abc' },
              agentsMd: null,
              cursorrules: null,
              cursorrulesDir: null,
              githubCopilot: null,
              claudeDir: { id: 'def' },
            },
          ],
        },
      },
    })

    const result = await fetchUserData('testuser', mockGraphql)

    expect(result).not.toBeNull()
    expect(result!.login).toBe('testuser')
    expect(result!.repositories.nodes).toHaveLength(1)
    expect(mockGraphql).toHaveBeenCalledOnce()
  })

  it('returns null for non-existent user', async () => {
    const mockGraphql = vi.fn().mockResolvedValue({ user: null })
    const result = await fetchUserData('nonexistent', mockGraphql)
    expect(result).toBeNull()
  })
})
