import { describe, expect, it, vi } from 'vitest'
import { fetchUserData } from '~/github/client'
import type { GitHubQueryResponse } from '~/github/types'

// Builds a repos-query response with a single named repo pushed at `pushedAt`.
function reposResponse(login: string, repoName: string, pushedAt: string): GitHubQueryResponse {
  return {
    user: {
      login,
      repositories: {
        nodes: [
          {
            name: repoName,
            pushedAt,
            defaultBranchRef: {
              target: {
                history: {
                  nodes: [
                    {
                      oid: `${repoName}-1`,
                      message: 'feat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>',
                      committedDate: pushedAt,
                      author: { user: { login } },
                    },
                  ],
                  totalCount: 1,
                },
              },
            },
            claudeMd: null,
            agentsMd: null,
            cursorrules: null,
            cursorrulesDir: null,
            githubCopilot: null,
            claudeDir: null,
            primaryLanguage: { name: 'TypeScript', color: '#3178c6' },
          },
        ],
      },
    },
  } as unknown as GitHubQueryResponse
}

// Dispatches the mock by which of the 3 parallel queries is being made: PUBLIC repos,
// PRIVATE repos, or contributions (identified by the contribSince variable).
function dispatch(opts: {
  pub?: GitHubQueryResponse
  priv?: GitHubQueryResponse | (() => Promise<never>)
  contrib?: GitHubQueryResponse
}) {
  return (_q: string, vars: Record<string, unknown>): Promise<GitHubQueryResponse> => {
    if ('contribSince' in vars)
      return Promise.resolve(opts.contrib ?? ({ user: null } as GitHubQueryResponse))
    if (vars.privacy === 'PRIVATE') {
      if (typeof opts.priv === 'function') return opts.priv()
      return Promise.resolve(
        opts.priv ??
          ({
            user: { login: String(vars.login), repositories: { nodes: [] } },
          } as GitHubQueryResponse),
      )
    }
    return Promise.resolve(opts.pub ?? ({ user: null } as GitHubQueryResponse))
  }
}

const SINCE = '2026-04-15T12:00:00.000Z'
const YEAR_AGO = '2025-04-16T12:00:00.000Z'

describe('fetchUserData', () => {
  it('runs 3 parallel queries (public repos, private repos, contributions)', async () => {
    const mockGraphql = vi.fn(
      dispatch({ pub: reposResponse('testuser', 'pub-repo', '2026-03-14T00:00:00Z') }),
    )
    const result = await fetchUserData('testuser', mockGraphql, SINCE, YEAR_AGO)
    expect(result?.login).toBe('testuser')
    expect(mockGraphql).toHaveBeenCalledTimes(3)
    expect(mockGraphql).toHaveBeenCalledWith(expect.any(String), {
      login: 'testuser',
      since: SINCE,
      privacy: 'PUBLIC',
    })
    expect(mockGraphql).toHaveBeenCalledWith(expect.any(String), {
      login: 'testuser',
      since: SINCE,
      privacy: 'PRIVATE',
    })
    expect(mockGraphql).toHaveBeenCalledWith(expect.any(String), {
      login: 'testuser',
      contribSince: SINCE,
      yearAgo: YEAR_AGO,
    })
  })

  it('merges public + private repos and re-sorts by pushedAt desc; sets includesPrivate', async () => {
    const mockGraphql = vi.fn(
      dispatch({
        pub: reposResponse('testuser', 'pub-old', '2026-01-01T00:00:00Z'),
        priv: reposResponse('testuser', 'priv-new', '2026-06-01T00:00:00Z'),
      }),
    )
    const result = await fetchUserData('testuser', mockGraphql, SINCE, YEAR_AGO)
    expect(result?.repositories.nodes.map((n) => n.name)).toEqual(['priv-new', 'pub-old'])
    expect(result?.includesPrivate).toBe(true)
  })

  it('includesPrivate is false when the private query returns no nodes', async () => {
    const mockGraphql = vi.fn(
      dispatch({ pub: reposResponse('testuser', 'pub-repo', '2026-03-14T00:00:00Z') }),
    )
    const result = await fetchUserData('testuser', mockGraphql, SINCE, YEAR_AGO)
    expect(result?.includesPrivate).toBe(false)
    expect(result?.repositories.nodes.map((n) => n.name)).toEqual(['pub-repo'])
  })

  it('degrades to public-only (no throw) when the private query fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const mockGraphql = vi.fn(
      dispatch({
        pub: reposResponse('testuser', 'pub-repo', '2026-03-14T00:00:00Z'),
        priv: () => Promise.reject(new Error('HTTP 502')),
      }),
    )
    const result = await fetchUserData('testuser', mockGraphql, SINCE, YEAR_AGO)
    expect(result?.repositories.nodes.map((n) => n.name)).toEqual(['pub-repo'])
    expect(result?.includesPrivate).toBe(false)
    spy.mockRestore()
  })

  it('sets includesPrivate when only the contributions query surfaces private repos (repo query degraded)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const contribWithPrivate = {
      user: {
        contributionsCollection: {
          commitContributionsByRepository: [
            {
              repository: { name: 'x', primaryLanguage: null, isPrivate: true },
              contributions: { totalCount: 5 },
            },
          ],
        },
      },
    } as unknown as GitHubQueryResponse
    const mockGraphql = vi.fn(
      dispatch({
        pub: reposResponse('testuser', 'pub-repo', '2026-03-14T00:00:00Z'),
        priv: () => Promise.reject(new Error('HTTP 502')),
        contrib: contribWithPrivate,
      }),
    )
    const result = await fetchUserData('testuser', mockGraphql, SINCE, YEAR_AGO)
    // Private repos query 502'd (no private nodes), but private contribution rows influenced
    // the card → the scope flag must still be true so the label stays honest.
    expect(result?.repositories.nodes.map((n) => n.name)).toEqual(['pub-repo'])
    expect(result?.includesPrivate).toBe(true)
    spy.mockRestore()
  })

  it('stays public-only when contribution rows are all public (isPrivate false)', async () => {
    const contribPublic = {
      user: {
        contributionsCollection: {
          commitContributionsByRepository: [
            {
              repository: { name: 'x', primaryLanguage: null, isPrivate: false },
              contributions: { totalCount: 5 },
            },
          ],
        },
      },
    } as unknown as GitHubQueryResponse
    const mockGraphql = vi.fn(
      dispatch({
        pub: reposResponse('testuser', 'pub-repo', '2026-03-14T00:00:00Z'),
        contrib: contribPublic,
      }),
    )
    const result = await fetchUserData('testuser', mockGraphql, SINCE, YEAR_AGO)
    expect(result?.includesPrivate).toBe(false)
  })

  it('returns null when the public (primary) query has no user', async () => {
    const mockGraphql = vi.fn(dispatch({ pub: { user: null } as GitHubQueryResponse }))
    const result = await fetchUserData('nonexistent', mockGraphql, SINCE, YEAR_AGO)
    expect(result).toBeNull()
  })

  it('returns null when the public query throws NOT_FOUND (real octokit behavior)', async () => {
    const notFoundError = Object.assign(
      new Error("Could not resolve to a User with the login of 'zzz'."),
      {
        name: 'GraphqlResponseError',
        errors: [{ type: 'NOT_FOUND', message: 'nope' }],
      },
    )
    const mockGraphql = vi.fn((_q: string, vars: Record<string, unknown>) => {
      if (vars.privacy === 'PUBLIC') return Promise.reject(notFoundError)
      return Promise.resolve({ user: null } as GitHubQueryResponse)
    })
    const result = await fetchUserData('zzz', mockGraphql, SINCE, YEAR_AGO)
    expect(result).toBeNull()
  })

  it('rethrows non-NOT_FOUND errors from the public query (rate limit etc.)', async () => {
    const rateLimitError = Object.assign(new Error('API rate limit exceeded'), {
      name: 'GraphqlResponseError',
      errors: [{ type: 'RATE_LIMITED', message: 'API rate limit exceeded' }],
    })
    const mockGraphql = vi.fn((_q: string, vars: Record<string, unknown>) => {
      if (vars.privacy === 'PUBLIC') return Promise.reject(rateLimitError)
      return Promise.resolve({ user: null } as GitHubQueryResponse)
    })
    await expect(fetchUserData('any', mockGraphql, SINCE, YEAR_AGO)).rejects.toThrow('rate limit')
  })
})
