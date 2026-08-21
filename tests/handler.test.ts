import { describe, expect, it, vi } from 'vitest'
import { USER_PRIVATE_REPOS_QUERY } from '~/github/queries'
import type { GitHubQueryResponse } from '~/github/types'
import { CARD_DATA_REV, buildCardData, renderCardResult } from '~/handler'
import { makeCardData } from './fixtures/cardData'

const NOW = new Date('2026-07-08T12:00:00Z')
const recent = (daysAgo: number) =>
  new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString()

// The client now runs 3 parallel queries (public repos / private repos / contributions).
// By default the PRIVATE query resolves to an empty repo set so these fixtures stay
// public-only (includesPrivate=false); pass `privateResponse` to exercise private inclusion.
function graphqlWith(response: GitHubQueryResponse, privateResponse?: GitHubQueryResponse) {
  return async (query: string): Promise<GitHubQueryResponse> => {
    if (query === USER_PRIVATE_REPOS_QUERY) {
      return (
        privateResponse ?? {
          user: response.user ? { ...response.user, repositories: { nodes: [] } } : null,
        }
      )
    }
    return response
  }
}

const aiCommit = (daysAgo: number, oid: string) => ({
  oid,
  message: 'feat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>',
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

describe('カード合成（buildCardData → renderCardResult）', () => {
  it('renders v2 card for user with AI activity in window', async () => {
    const r = renderCardResult(await buildCardData('testuser', graphqlWith(fullUser), NOW), {
      theme: 'dark',
      glow: 'soft',
    })
    expect(r.kind).toBe('ok')
    expect(r.status).toBe(200)
    expect(r.svg).toContain('width="750"')
    expect(r.svg).toContain('public 12wk')
    expect(r.svg).toContain('testuser')
  })

  it('private リポが流入すると all repos · 12wk + verified+ を表示', async () => {
    const privateUser: GitHubQueryResponse = {
      user: {
        login: 'testuser',
        repositories: {
          nodes: [
            {
              name: 'secret',
              pushedAt: recent(1),
              defaultBranchRef: {
                target: { history: { nodes: [aiCommit(1, 'p1')], totalCount: 1 } },
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
    }
    const r = renderCardResult(
      await buildCardData('testuser', graphqlWith(fullUser, privateUser), NOW),
      { theme: 'dark', glow: 'soft' },
    )
    expect(r.kind).toBe('ok')
    expect(r.svg).toContain('all repos · 12wk')
    expect(r.svg).not.toContain('public 12wk')
    expect(r.svg).toContain('✓ verified+')
  })

  it('12wk 窓外のコミットは指標に入らない（old commit は無視される）', async () => {
    const r = renderCardResult(await buildCardData('testuser', graphqlWith(fullUser), NOW), {
      theme: 'dark',
      glow: 'soft',
    })
    // 窓内 AI コミットは2件 → activeWeeks 2 → カード上の一貫性は 17
    expect(r.svg).toContain('>17<')
  })

  it('not found user → kind not_found', async () => {
    const r = renderCardResult(await buildCardData('ghost', graphqlWith({ user: null }), NOW), {
      theme: 'light',
      glow: 'soft',
    })
    expect(r.kind).toBe('not_found')
    expect(r.status).toBe(200)
    expect(r.svg).toContain('User not found')
  })

  it('no repos → kind no_repos / no AI in window → kind no_ai', async () => {
    const noRepos = renderCardResult(
      await buildCardData(
        'u',
        graphqlWith({ user: { login: 'u', repositories: { nodes: [] } } }),
        NOW,
      ),
      { theme: 'light', glow: 'soft' },
    )
    expect(noRepos.kind).toBe('no_repos')

    const stale: GitHubQueryResponse = JSON.parse(JSON.stringify(fullUser))
    const staleRef = stale.user?.repositories.nodes[0]?.defaultBranchRef
    if (!staleRef) throw new Error('fixture shape changed')
    staleRef.target.history.nodes = [aiCommit(300, 'ancient')]
    const noAi = renderCardResult(await buildCardData('u', graphqlWith(stale), NOW), {
      theme: 'light',
      glow: 'soft',
    })
    expect(noAi.kind).toBe('no_ai')
    expect(noAi.svg).toContain('No public AI activity in the last 12 weeks')
  })

  it('graphql throw → kind error', async () => {
    const r = renderCardResult(
      await buildCardData(
        'u',
        async () => {
          throw new Error('API rate limit exceeded')
        },
        NOW,
      ),
      { theme: 'light', glow: 'soft' },
    )
    expect(r.kind).toBe('error')
  })

  it('assembles avatarDataUri from the injected fetcher (base64 → data URI)', async () => {
    const avatarUser: GitHubQueryResponse = JSON.parse(JSON.stringify(fullUser))
    if (avatarUser.user) avatarUser.user.avatarUrl = 'https://avatars.example/u/1?v=4'
    const fetcher = async (url: string) => {
      expect(url).toBe('https://avatars.example/u/1?v=4')
      return { base64: 'QUJD', mime: 'image/png' }
    }
    const r = await buildCardData('testuser', graphqlWith(avatarUser), NOW, fetcher)
    expect(r.kind).toBe('ok')
    expect(r.data?.avatarDataUri).toBe('data:image/png;base64,QUJD')
  })

  it('degrades to null avatar when the fetcher returns null (no crash, no http href)', async () => {
    const r = await buildCardData('testuser', graphqlWith(fullUser), NOW, async () => null)
    expect(r.kind).toBe('ok')
    expect(r.data?.avatarDataUri).toBeNull()
  })

  it('passes $since (= now - 84d) to GraphQL — 窓外データを取得しない', async () => {
    // repos/contributions の2クエリ分割後: 両呼び出しの変数を収集して検証する
    const calls: Record<string, unknown>[] = []
    const gql = async (_q: string, v: Record<string, unknown>) => {
      calls.push(v)
      return fullUser
    }
    renderCardResult(await buildCardData('testuser', gql, NOW), { theme: 'dark', glow: 'soft' })
    const reposVars = calls.find((v) => 'since' in v)
    const contribVars = calls.find((v) => 'contribSince' in v)
    expect(reposVars?.since).toBe('2026-04-15T12:00:00.000Z')
    expect(contribVars?.contribSince).toBe('2026-04-15T12:00:00.000Z')
  })
})

describe('キャッシュ世代の互換性', () => {
  // 解析結果そのものを KV に積むようになったので、CardDataV2 の形を変えたデプロイは
  // 「旧世代の JSON が新しい描画コードに流れ込む」という失敗様式を持つ。
  // 形を変えたらこのリストと CARD_DATA_REV を一緒に更新すること（更新自体は禁止していない）。
  const FIELDS_AT_REV_1 = [
    'avatarDataUri',
    'element',
    'epithet',
    'equipped',
    'flavor',
    'includesPrivate',
    'issuedYear',
    'languages',
    'pattern',
    'record',
    'seed',
    'serial',
    'stats',
    'toolAttribution',
    'traits',
    'usage',
    'username',
  ]

  it('CardDataV2 の形を変えたら CARD_DATA_REV を上げる', () => {
    expect(CARD_DATA_REV).toBe(1)
    expect(
      Object.keys(makeCardData()).sort(),
      'CardDataV2 の形が変わっている。CARD_DATA_REV を上げてこのリストも更新すること',
    ).toEqual(FIELDS_AT_REV_1)
  })
})

describe('アバター取得の閉じ方', () => {
  // worker が唯一「外から与えられた URL を fetch する」場所。GraphQL 応答が汚染された
  // 場合でも、GitHub 以外へは出て行かない
  it('GitHub 以外のホストのアバター URL は取りに行かない', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const evil = structuredClone(fullUser) as unknown as Record<string, unknown>
    ;(evil.user as { avatarUrl?: string }).avatarUrl = 'http://169.254.169.254/latest/meta-data/'
    const r = await buildCardData('testuser', graphqlWith(evil as never), NOW)
    expect(r.kind).toBe('ok')
    expect(r.data?.avatarDataUri).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
