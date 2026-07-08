import { describe, expect, it } from 'vitest'
import type { GitHubQueryResponse } from '~/github/types'
import { handleRequest } from '~/handler'

const NOW = new Date('2026-07-08T12:00:00Z')
const recent = (daysAgo: number) =>
  new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString()

function graphqlWith(response: GitHubQueryResponse) {
  return async () => response
}

const aiCommit = (daysAgo: number, oid: string) => ({
  oid,
  message: `feat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>`,
  committedDate: recent(daysAgo),
  author: { user: { login: 'someone' } },
})

const fullUser: GitHubQueryResponse = {
  user: {
    login: 'testuser',
    repositories: {
      nodes: [
        {
          name: 'repo1',
          pushedAt: recent(2),
          defaultBranchRef: {
            target: {
              history: {
                nodes: [aiCommit(1, 'a'), aiCommit(8, 'b'), aiCommit(200, 'old')],
                totalCount: 3,
              },
            },
          },
          claudeMd: { id: '1' },
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
}

describe('handleRequest v2', () => {
  it('renders v2 card for user with AI activity in window', async () => {
    const r = await handleRequest({ user: 'testuser', theme: 'dark' }, graphqlWith(fullUser), NOW)
    expect(r.kind).toBe('ok')
    expect(r.status).toBe(200)
    expect(r.svg).toContain('width="750"')
    expect(r.svg).toContain('public · 12wk')
    expect(r.svg).toContain('testuser')
  })

  it('12wk 窓外のコミットは指標に入らない（old commit は無視される）', async () => {
    const r = await handleRequest({ user: 'testuser', theme: 'dark' }, graphqlWith(fullUser), NOW)
    // 窓内 AI コミットは2件 → activeWeeks 2 → カード上の一貫性は 17
    expect(r.svg).toContain('>17<')
  })

  it('not found user → kind not_found', async () => {
    const r = await handleRequest(
      { user: 'ghost', theme: 'light' },
      graphqlWith({ user: null }),
      NOW,
    )
    expect(r.kind).toBe('not_found')
    expect(r.status).toBe(200)
    expect(r.svg).toContain('User not found')
  })

  it('no repos → kind no_repos / no AI in window → kind no_ai', async () => {
    const noRepos = await handleRequest(
      { user: 'u', theme: 'light' },
      graphqlWith({ user: { login: 'u', repositories: { nodes: [] } } }),
      NOW,
    )
    expect(noRepos.kind).toBe('no_repos')

    const stale: GitHubQueryResponse = JSON.parse(JSON.stringify(fullUser))
    stale.user!.repositories.nodes[0].defaultBranchRef!.target.history.nodes = [
      aiCommit(300, 'ancient'),
    ]
    const noAi = await handleRequest({ user: 'u', theme: 'light' }, graphqlWith(stale), NOW)
    expect(noAi.kind).toBe('no_ai')
    expect(noAi.svg).toContain('No public AI activity in the last 12 weeks')
  })

  it('graphql throw → kind error', async () => {
    const r = await handleRequest(
      { user: 'u', theme: 'light' },
      async () => {
        throw new Error('API rate limit exceeded')
      },
      NOW,
    )
    expect(r.kind).toBe('error')
  })

  it('passes $since (= now - 84d) to GraphQL — 窓外データを取得しない', async () => {
    let vars: Record<string, unknown> = {}
    const gql = async (_q: string, v: Record<string, unknown>) => {
      vars = v
      return fullUser
    }
    await handleRequest({ user: 'testuser', theme: 'dark' }, gql, NOW)
    expect(vars.since).toBe('2026-04-15T12:00:00.000Z')
  })
})
