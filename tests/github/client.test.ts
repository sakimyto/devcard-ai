import { describe, expect, it, vi } from 'vitest'
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
                        oid: 'abc123',
                        message:
                          'feat: add feature\n\nCo-Authored-By: Claude <noreply@anthropic.com>',
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
              primaryLanguage: { name: 'TypeScript', color: '#3178c6' },
            },
          ],
        },
      },
    })

    const result = await fetchUserData(
      'testuser',
      mockGraphql,
      '2026-04-15T12:00:00.000Z',
      '2025-04-16T12:00:00.000Z',
    )

    expect(result).not.toBeNull()
    expect(result?.login).toBe('testuser')
    expect(result?.repositories.nodes).toHaveLength(1)
    // repos と contributions は2クエリ並列（合算クエリは GitHub の応答時間上限で 502 —
    // 2026-07-09 本番で実証）。contribSince は since と同値だが DateTime! 宣言が必要
    //（contributionsCollection.from は GitTimestamp! 変数を拒否する）。
    expect(mockGraphql).toHaveBeenCalledTimes(2)
    expect(mockGraphql).toHaveBeenCalledWith(expect.any(String), {
      login: 'testuser',
      since: '2026-04-15T12:00:00.000Z',
    })
    expect(mockGraphql).toHaveBeenCalledWith(expect.any(String), {
      login: 'testuser',
      contribSince: '2026-04-15T12:00:00.000Z',
      yearAgo: '2025-04-16T12:00:00.000Z',
    })
  })

  it('returns null for non-existent user', async () => {
    const mockGraphql = vi.fn().mockResolvedValue({ user: null })
    const result = await fetchUserData(
      'nonexistent',
      mockGraphql,
      '2026-04-15T12:00:00.000Z',
      '2025-04-16T12:00:00.000Z',
    )
    expect(result).toBeNull()
  })

  // 実運用では octokit.graphql は user:null を返さず GraphqlResponseError を投げる
  // （errors[].type === 'NOT_FOUND'）。これを null に正規化しないと 404 契約が破れ、
  // 存在しないユーザーの連打が毎回 GitHub クォータを消費する（本番スモークで実証済み）
  it('returns null when graphql throws NOT_FOUND error (real octokit behavior)', async () => {
    const notFoundError = Object.assign(
      new Error("Could not resolve to a User with the login of 'zzz'."),
      {
        name: 'GraphqlResponseError',
        errors: [
          { type: 'NOT_FOUND', message: "Could not resolve to a User with the login of 'zzz'." },
        ],
      },
    )
    const mockGraphql = vi.fn().mockRejectedValue(notFoundError)
    const result = await fetchUserData(
      'zzz',
      mockGraphql,
      '2026-04-15T12:00:00.000Z',
      '2025-04-16T12:00:00.000Z',
    )
    expect(result).toBeNull()
  })

  it('rethrows non-NOT_FOUND graphql errors (rate limit etc.)', async () => {
    const rateLimitError = Object.assign(new Error('API rate limit exceeded'), {
      name: 'GraphqlResponseError',
      errors: [{ type: 'RATE_LIMITED', message: 'API rate limit exceeded' }],
    })
    const mockGraphql = vi.fn().mockRejectedValue(rateLimitError)
    await expect(
      fetchUserData('any', mockGraphql, '2026-04-15T12:00:00.000Z', '2025-04-16T12:00:00.000Z'),
    ).rejects.toThrow('rate limit')
  })
})
