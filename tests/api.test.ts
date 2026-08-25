import { beforeEach, describe, expect, it, vi } from 'vitest'
import worker from '../api/index'
import { CARD_THEMES, DEFAULT_GLOW, DEFAULT_THEME, GLOW_STYLES } from '../src/card/customization'
import { USER_PRIVATE_REPOS_QUERY } from '../src/github/queries'
import type { GitHubQueryResponse } from '../src/github/types'
import { themes } from '../src/svg/themes'
import { makeCardData } from './fixtures/cardData'
import { fakeKv, installFakeEdgeCache } from './fixtures/fakeKv'

// KV に入っている「解析済みデータ」1 世代ぶん。見た目の選択を含まないので、
// theme / glow のどの組み合わせでもこの 1 エントリから描画できる。
function cachedData(username = 'cacheduser'): string {
  return JSON.stringify({
    v: { kind: 'ok', data: makeCardData({ username }) },
    at: Date.now() - 60_000,
  })
}

// GitHub App / Octokit は外部境界なのでここだけモックする。graphql の応答は
// 各テストが fixture を差し込み、handler〜レンダラは本物を通す
const { graphqlMock } = vi.hoisted(() => ({ graphqlMock: vi.fn() }))

// App 認証のスタブ。`GET /users/{username}/installation` は「その人自身が App を
// 入れているか」の解決に使われ、成否がそのままギャラリー掲載の可否になる。
// 既定は未インストール（404 相当）で、optedIn にしたいテストだけ installedUsers に足す。
const installedUsers = new Set<string>()

vi.mock('@octokit/app', () => ({
  App: class {
    octokit = {
      request: async (_route: string, params: { username: string }) => {
        if (!installedUsers.has(params.username.toLowerCase())) {
          throw new Error('Not Found')
        }
        return { data: { id: 999 } }
      },
    }
    async getInstallationOctokit() {
      return { graphql: graphqlMock }
    }
  },
}))

// ExecutionContext スタブ。waitUntil で渡された promise を集め、flush() で待てる。
function fakeCtx() {
  const waited: Promise<unknown>[] = []
  const ctx = {
    waitUntil: (p: Promise<unknown>) => {
      waited.push(p)
    },
    passThroughOnException: () => {},
  } as unknown as ExecutionContext
  return { ctx, flush: () => Promise.all(waited) }
}

const recent = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString()
const aiCommit = (daysAgo: number, oid: string) => ({
  oid,
  message: 'feat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>',
  committedDate: recent(daysAgo),
  author: { user: { login: 'someone' } },
})

// 実時刻基準（api の handleRequest は now を注入しないため）の ok 応答 fixture。
function okResponse(login = 'octocat'): GitHubQueryResponse {
  return {
    user: {
      login,
      repositories: {
        nodes: [
          {
            name: 'repo1',
            pushedAt: recent(2),
            defaultBranchRef: {
              target: { history: { nodes: [aiCommit(1, 'a'), aiCommit(8, 'b')], totalCount: 2 } },
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
  } as unknown as GitHubQueryResponse
}

function makeEnv(kv = fakeKv()) {
  return {
    GITHUB_APP_ID: '123',
    GITHUB_APP_PRIVATE_KEY: 'test-key',
    GITHUB_APP_INSTALLATION_ID: '1',
    DEVCARD_KV: kv,
  }
}

const NOT_FOUND_RESPONSE = { user: null }
const NO_REPOS_RESPONSE = {
  user: { login: 'someuser', repositories: { nodes: [] } },
}

// The client fires 3 parallel queries (public/private repos + contributions). Route the
// okResponse to the PUBLIC call and return an empty repo set for PRIVATE so the fixture
// stays public-only (no duplicated repos, includesPrivate=false).
// 本人が自分のアカウントに GitHub App を入れている状態。private リポの節点が返るので
// includesPrivate=true になり、ギャラリー掲載の条件を満たす
function mockOkOptedIn(login = 'octocat') {
  installedUsers.add(login.toLowerCase())
  const ok = okResponse(login)
  graphqlMock.mockImplementation((query: string) => {
    if (query === USER_PRIVATE_REPOS_QUERY) {
      return Promise.resolve({
        user: {
          login,
          repositories: {
            nodes: [
              {
                name: 'secret',
                pushedAt: recent(1),
                defaultBranchRef: {
                  target: { history: { nodes: [aiCommit(2, 'p')], totalCount: 1 } },
                },
                claudeMd: null,
                agentsMd: null,
                cursorrules: null,
                cursorrulesDir: null,
                githubCopilot: null,
                claudeDir: null,
                primaryLanguage: { name: 'Go', color: '#00ADD8' },
              },
            ],
          },
        },
      })
    }
    return Promise.resolve(ok)
  })
}

function mockOkPublicOnly(login = 'octocat') {
  const ok = okResponse(login)
  graphqlMock.mockImplementation((query: string) => {
    if (query === USER_PRIVATE_REPOS_QUERY) {
      return Promise.resolve({ user: { login, repositories: { nodes: [] } } })
    }
    return Promise.resolve(ok)
  })
}

function req(path: string, headers: Record<string, string> = {}) {
  return new Request(`https://pullcard.example${path}`, { headers })
}

const edge = installFakeEdgeCache()

beforeEach(() => {
  edge.reset()
  installedUsers.clear()
  graphqlMock.mockReset()
})

describe('worker fetch routing', () => {
  it.each(['devcard-ai.sakimyto.workers.dev', 'devcard.sakimyto.com'])(
    'legacy host %s → 301 to pullcard.sakimyto.com preserving path+query',
    async (host) => {
      const res = await worker.fetch(
        new Request(`https://${host}/api/gallery?user=octocat&theme=dark`),
        makeEnv(),
        fakeCtx().ctx,
      )
      expect(res.status).toBe(301)
      expect(res.headers.get('location')).toBe(
        'https://pullcard.sakimyto.com/api/gallery?user=octocat&theme=dark',
      )
      expect(graphqlMock).not.toHaveBeenCalled()
    },
  )

  it('invalid user → 400, GitHub not called', async () => {
    const res = await worker.fetch(req('/?user=-bad--name-'), makeEnv(), fakeCtx().ctx)
    expect(res.status).toBe(400)
    expect(res.headers.get('cache-control')).toContain('max-age=3600')
    expect(graphqlMock).not.toHaveBeenCalled()
  })

  it('empty user outside landing path → 400, GitHub not called', async () => {
    const res = await worker.fetch(req('/card?user='), makeEnv(), fakeCtx().ctx)
    expect(res.status).toBe(400)
    expect(graphqlMock).not.toHaveBeenCalled()
  })

  it('root without user → landing page HTML', async () => {
    const res = await worker.fetch(req('/'), makeEnv(), fakeCtx().ctx)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(graphqlMock).not.toHaveBeenCalled()
  })

  it('unknown user + Accept text/html → 404 with cache', async () => {
    graphqlMock.mockResolvedValue(NOT_FOUND_RESPONSE)
    const res = await worker.fetch(
      req('/?user=ghost', { accept: 'text/html' }),
      makeEnv(),
      fakeCtx().ctx,
    )
    expect(res.status).toBe(404)
    expect(res.headers.get('cache-control')).toContain('max-age=3600')
  })

  it('unknown user in image context → 200 error-card SVG (no broken image in README)', async () => {
    graphqlMock.mockResolvedValue(NOT_FOUND_RESPONSE)
    const res = await worker.fetch(req('/?user=ghost'), makeEnv(), fakeCtx().ctx)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/svg+xml')
    expect(res.headers.get('x-cache-state')).toBe('miss')
  })

  // placeholder は障害の産物なので長くは持たせない。ただし no-store にすると復旧待ちの
  // クライアント（README camo・ブラウザ）が即座に叩き直し、枯渇した上流をさらに押す
  it('GitHub failure with no stale → 200 placeholder, 短命キャッシュ', async () => {
    graphqlMock.mockRejectedValue(new Error('github down'))
    const res = await worker.fetch(req('/?user=someuser'), makeEnv(), fakeCtx().ctx)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/svg+xml')
    expect(res.headers.get('cache-control')).toBe('public, max-age=60')
    expect(await res.text()).toContain('someuser')
  })

  it('fresh KV hit → served without touching GitHub', async () => {
    const kv = fakeKv()
    kv.store.set('data:v1:cacheduser', cachedData())
    const res = await worker.fetch(req('/?user=cacheduser'), makeEnv(kv), fakeCtx().ctx)
    expect(res.status).toBe(200)
    expect(res.headers.get('x-cache-state')).toBe('fresh')
    expect(await res.text()).toContain('cacheduser')
    expect(graphqlMock).not.toHaveBeenCalled()
  })

  // キャッシュキーが user だけである（= 見た目の選択が上流コストを増幅しない）ことの証明。
  // theme/glow をキーに含めると、この一覧のどれか一つを引くたびに GraphQL が走る。
  it('1つのキャッシュエントリが全ての見た目の組み合わせを GitHub 無しで賄う', async () => {
    const kv = fakeKv()
    kv.store.set('data:v1:cacheduser', cachedData())
    const seen = new Set<string>()
    for (const theme of CARD_THEMES) {
      for (const glow of GLOW_STYLES) {
        const res = await worker.fetch(
          req(`/?user=cacheduser&theme=${theme}&glow=${glow}`),
          makeEnv(kv),
          fakeCtx().ctx,
        )
        expect(res.headers.get('x-cache-state')).toBe('fresh')
        seen.add(await res.text())
      }
    }
    expect(graphqlMock).not.toHaveBeenCalled()
    // 同じデータから、組み合わせの数だけ異なる SVG が描き分けられている
    expect(seen.size).toBe(CARD_THEMES.length * GLOW_STYLES.length)
    expect(kv.store.size).toBe(1)
  })

  // 共有画像（/og）もカードと同じ解析結果を使う。別キーを持つと同じユーザーに対して
  // GraphQL が二重に走る。
  it('/og はカードと同じキャッシュエントリを共有する', async () => {
    const kv = fakeKv()
    kv.store.set('data:v1:cacheduser', cachedData())
    const res = await worker.fetch(req('/og?user=cacheduser'), makeEnv(kv), fakeCtx().ctx)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(graphqlMock).not.toHaveBeenCalled()
    expect(kv.store.size).toBe(1)
  })

  it('不正な theme / glow は安全な既定の見た目に落ちる', async () => {
    const kv = fakeKv()
    kv.store.set('data:v1:cacheduser', cachedData())
    const res = await worker.fetch(
      req('/?user=cacheduser&theme=%3Cscript%3E&glow=holo%22%20onload%3Dalert(1)'),
      makeEnv(kv),
      fakeCtx().ctx,
    )
    expect(res.headers.get('x-cache-state')).toBe('fresh')
    const svg = await res.text()
    // 属性値として注入されない
    expect(svg).not.toContain('onload=alert(1)')
    expect(svg).not.toContain('<script>')
    // かつ、既定（light / soft）で実際に描かれている（「落ちた先」まで見る）
    expect(svg).toContain(themes.light.bg)
    expect(svg).toContain('SOFT GLOW')
    expect(graphqlMock).not.toHaveBeenCalled()
  })

  it('bot UA + unknown user → 404 (no 200 OGP for nonexistent users)', async () => {
    graphqlMock.mockResolvedValue(NOT_FOUND_RESPONSE)
    const res = await worker.fetch(
      req('/?user=ghost', { 'user-agent': 'Twitterbot/1.0' }),
      makeEnv(),
      fakeCtx().ctx,
    )
    expect(res.status).toBe(404)
  })

  it('bot UA + existing user → 200 OGP HTML', async () => {
    graphqlMock.mockResolvedValue(NO_REPOS_RESPONSE)
    const res = await worker.fetch(
      req('/?user=someuser', { 'user-agent': 'Slackbot-LinkExpanding 1.0' }),
      makeEnv(),
      fakeCtx().ctx,
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(await res.text()).toContain('og:image')
  })
})

describe('/og GitHub クォータ保護（KV SWR キャッシュ）', () => {
  it('同一 user への 2 回目の /og は KV fresh hit で GitHub を叩かない', async () => {
    mockOkPublicOnly('octocat')
    const kv = fakeKv()
    const first = await worker.fetch(req('/og?user=octocat&theme=dark'), makeEnv(kv), fakeCtx().ctx)
    expect(first.status).toBe(200)
    expect(first.headers.get('content-type')).toContain('image/png')
    // buildCardData は 3 本の並列 GraphQL を撃つ（public/private/contributions）
    const callsAfterFirst = graphqlMock.mock.calls.length
    expect(callsAfterFirst).toBe(3)

    const second = await worker.fetch(
      req('/og?user=octocat&theme=dark'),
      makeEnv(kv),
      fakeCtx().ctx,
    )
    expect(second.status).toBe(200)
    // 2 回目は KV fresh hit。GraphQL 追加消費ゼロ = クォータ枯渇攻撃を吸収
    expect(graphqlMock.mock.calls.length).toBe(callsAfterFirst)
  })

  it('存在しない user の /og も not_found をキャッシュし、2 回目は GitHub を叩かない', async () => {
    graphqlMock.mockResolvedValue(NOT_FOUND_RESPONSE)
    const kv = fakeKv()
    const first = await worker.fetch(req('/og?user=ghost&theme=dark'), makeEnv(kv), fakeCtx().ctx)
    expect(first.status).toBe(200)
    const callsAfterFirst = graphqlMock.mock.calls.length
    expect(callsAfterFirst).toBe(3)

    const second = await worker.fetch(req('/og?user=ghost&theme=dark'), makeEnv(kv), fakeCtx().ctx)
    expect(second.status).toBe(200)
    // ゴミ username の連打でも GraphQL 消費は user あたり 1 世代に上限される
    expect(graphqlMock.mock.calls.length).toBe(callsAfterFirst)
  })
})

describe('召喚ギャラリー', () => {
  it('GET /api/gallery → at 降順 top24 JSON, Cache-Control 60s', async () => {
    const kv = fakeKv()
    for (let i = 0; i < 30; i++) {
      kv.store.set(`gallery:u:user${i}`, '1')
      kv.meta.set(`gallery:u:user${i}`, {
        at: 1000 + i,
        theme: 'dark',
        glow: 'holo',
        power: 5000 + i,
        element: 'bolt',
        epithet: 'X',
      })
    }
    const res = await worker.fetch(req('/api/gallery'), makeEnv(kv), fakeCtx().ctx)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(res.headers.get('cache-control')).toContain('max-age=60')
    const body = (await res.json()) as { user: string; at: number }[]
    expect(body).toHaveLength(24)
    expect(body[0].user).toBe('user29')
    expect(body[0].at).toBeGreaterThan(body[1].at)
    expect(graphqlMock).not.toHaveBeenCalled()
  })

  it('empty gallery → 200 empty array', async () => {
    const res = await worker.fetch(req('/api/gallery'), makeEnv(), fakeCtx().ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('本人がオプトインした召喚（GitHub App 導入済み）はギャラリーへ記録される', async () => {
    mockOkOptedIn('octocat')
    const kv = fakeKv()
    const { ctx, flush } = fakeCtx()
    const res = await worker.fetch(req('/?user=octocat'), makeEnv(kv), ctx)
    expect(res.status).toBe(200)
    expect(res.headers.get('x-cache-state')).toBe('miss')
    await flush()
    expect(kv.store.has('gallery:u:octocat')).toBe(true)
    const meta = kv.meta.get('gallery:u:octocat') as {
      at: number
      theme: string
      glow: string
      power: number
    }
    expect(meta.at).toBeGreaterThan(0)
    expect(meta.theme).toBe(DEFAULT_THEME)
    expect(meta.glow).toBe(DEFAULT_GLOW)
    expect(typeof meta.power).toBe('number')
  })

  // LP のヒーローは訪問者が外観を切り替えるたびにこの URL を叩く。これを召喚として
  // 数えると、誰でも見本ユーザーのギャラリー行の外観と「Recently summoned」の並び順を
  // 書き換えられてしまう
  it('preview=1 の取得は召喚ではないのでギャラリーへ書かない', async () => {
    mockOkOptedIn('octocat')
    const kv = fakeKv()
    const { ctx, flush } = fakeCtx()
    const res = await worker.fetch(req('/?user=octocat&preview=1'), makeEnv(kv), ctx)
    expect(res.status).toBe(200)
    expect(res.headers.get('x-cache-state')).toBe('miss')
    await flush()
    expect(kv.store.has('gallery:u:octocat')).toBe(false)
  })

  // '1' 以外を truthy 扱いにすると、印の意図しない綴りで記録が黙って止まる
  it.each(['0', 'true', '', 'yes'])('preview=%s は記録を止めない', async (value) => {
    mockOkOptedIn('octocat')
    const kv = fakeKv()
    const { ctx, flush } = fakeCtx()
    const res = await worker.fetch(req(`/?user=octocat&preview=${value}`), makeEnv(kv), ctx)
    expect(res.status).toBe(200)
    await flush()
    expect(kv.store.has('gallery:u:octocat')).toBe(true)
  })

  it('fresh hit ではギャラリーへ書かない', async () => {
    const kv = fakeKv()
    kv.store.set('data:v1:cacheduser', cachedData())
    const { ctx, flush } = fakeCtx()
    const res = await worker.fetch(req('/?user=cacheduser'), makeEnv(kv), ctx)
    expect(res.headers.get('x-cache-state')).toBe('fresh')
    await flush()
    expect(kv.store.has('gallery:u:cacheduser')).toBe(false)
    expect(graphqlMock).not.toHaveBeenCalled()
  })

  it('ギャラリー記録失敗はレスポンスに影響しない', async () => {
    mockOkPublicOnly('octocat')
    const kv = fakeKv()
    const origPut = kv.put.bind(kv)
    // gallery キーの put だけ失敗させる（card キャッシュ書き込みは通す）
    kv.put = async (key: string, value: string, opts?: { metadata?: unknown }) => {
      if (key.startsWith('gallery:u:')) throw new Error('kv write down')
      return origPut(key, value, opts)
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { ctx, flush } = fakeCtx()
    const res = await worker.fetch(req('/?user=octocat'), makeEnv(kv), ctx)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/svg+xml')
    await expect(flush()).resolves.toBeDefined()
    spy.mockRestore()
  })

  // 誰でも他人を召喚できる以上、「描画されたから載せる」では本人の同意なくログイン名と
  // 数値が公開ページに90日並ぶ。GitHub App を自分のアカウントに入れた人だけを載せる
  it('本人確認できない召喚（公開リポのみ）はギャラリーへ載せない', async () => {
    mockOkPublicOnly('octocat')
    const kv = fakeKv()
    const { ctx, flush } = fakeCtx()
    const res = await worker.fetch(req('/?user=octocat'), makeEnv(kv), ctx)
    expect(res.status).toBe(200)
    await flush()
    expect(kv.store.has('gallery:u:octocat')).toBe(false)
  })

  // App を外した人は削除依頼を出さなくてもギャラリーから降りられる
  it('オプトアウト（App を外した）ユーザーは次のキャッシュミスでギャラリーから消える', async () => {
    mockOkPublicOnly('octocat')
    const kv = fakeKv()
    await kv.put('gallery:u:octocat', '1', { metadata: { at: Date.now() - 1000 } })
    const { ctx, flush } = fakeCtx()
    await worker.fetch(req('/?user=octocat'), makeEnv(kv), ctx)
    await flush()
    expect(kv.store.has('gallery:u:octocat')).toBe(false)
  })

  // 削除は同意撤回の実装。preview=1 は記録を止めるための印であって、
  // 同意を撤回した人を残すための抜け穴にしてはいけない
  it('preview=1 でもオプトアウト済みユーザーの削除は走る', async () => {
    mockOkPublicOnly('octocat')
    const kv = fakeKv()
    await kv.put('gallery:u:octocat', '1', { metadata: { at: Date.now() - 1000 } })
    const { ctx, flush } = fakeCtx()
    await worker.fetch(req('/?user=octocat&preview=1'), makeEnv(kv), ctx)
    await flush()
    expect(kv.store.has('gallery:u:octocat')).toBe(false)
  })

  // /og とカードが同じキャッシュを共有するため、cacheState を条件にすると
  // 「共有画像が先に温めた人は永久に記録されない」定常状態が生まれる
  it('/og が先にキャッシュを温めても、その後のカード描画でギャラリーに載る', async () => {
    mockOkOptedIn('octocat')
    const kv = fakeKv()
    const first = fakeCtx()
    await worker.fetch(req('/og?user=octocat'), makeEnv(kv), first.ctx)
    await first.flush()
    expect(kv.store.has('gallery:u:octocat')).toBe(false)

    const second = fakeCtx()
    const res = await worker.fetch(req('/?user=octocat'), makeEnv(kv), second.ctx)
    expect(res.headers.get('x-cache-state')).toBe('fresh')
    await second.flush()
    expect(kv.store.has('gallery:u:octocat')).toBe(true)
  })

  // 大文字小文字の違いは同一人物。区別すると1人がギャラリーを何行も占有できる
  it('大文字小文字が違っても同じ1人として記録される', async () => {
    mockOkOptedIn('octocat')
    const kv = fakeKv()
    for (const variant of ['octocat', 'Octocat', 'OCTOCAT']) {
      const { ctx, flush } = fakeCtx()
      await worker.fetch(req(`/?user=${variant}`), makeEnv(kv), ctx)
      await flush()
    }
    expect([...kv.store.keys()].filter((k) => k.startsWith('gallery:u:'))).toEqual([
      'gallery:u:octocat',
    ])
  })
})

describe('上流クォータの保護', () => {
  // GitHub App の GraphQL 枠は全ユーザー共有。IP 単位の制限では守れないので、
  // キャッシュミスの総数そのものに上限を置く
  it('時間あたりのキャッシュミス上限に達したら GitHub を叩かず placeholder に落ちる', async () => {
    mockOkPublicOnly('octocat')
    const kv = fakeKv()
    const hour = Math.floor(Date.now() / 3_600_000)
    await kv.put(`budget:miss:${hour}`, '1500')
    const res = await worker.fetch(req('/?user=newcomer'), makeEnv(kv), fakeCtx().ctx)
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('Summoning')
    expect(graphqlMock).not.toHaveBeenCalled()
  })

  // 障害中に produce が失敗すると何もキャッシュされない。ブレーカが無いと後続の
  // 全リクエストが同じ壁に GraphQL を3本ずつ投げ続ける
  it('上流障害でブレーカが落ち、続く召喚は GitHub を叩かない', async () => {
    graphqlMock.mockRejectedValue(new Error('github down'))
    const kv = fakeKv()
    await worker.fetch(req('/?user=alice'), makeEnv(kv), fakeCtx().ctx)
    const callsAfterFirst = graphqlMock.mock.calls.length
    expect(callsAfterFirst).toBeGreaterThan(0)

    const res = await worker.fetch(req('/?user=bob'), makeEnv(kv), fakeCtx().ctx)
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('Summoning')
    expect(graphqlMock.mock.calls.length).toBe(callsAfterFirst)
  })

  it('壊れた世代を掴んだら配らずに作り直す', async () => {
    mockOkOptedIn('octocat')
    const kv = fakeKv()
    // stats を落とした旧世代（フィールドを増やしたのに rev を上げ忘れた状況の再現）
    const broken = makeCardData() as unknown as Record<string, unknown>
    broken.stats = undefined
    await kv.put(
      'data:v1:octocat',
      JSON.stringify({ v: { kind: 'ok', data: broken }, at: Date.now() - 1000 }),
    )
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await worker.fetch(req('/?user=octocat'), makeEnv(kv), fakeCtx().ctx)
    const svg = await res.text()
    spy.mockRestore()
    expect(svg).not.toContain('NaN')
    expect(svg).not.toContain('undefined')
    expect(graphqlMock).toHaveBeenCalled()
  })
})

describe('エッジキャッシュ', () => {
  it('2回目の同一カード要求は KV も GitHub も踏まない', async () => {
    mockOkPublicOnly('octocat')
    const kv = fakeKv()
    const env = makeEnv(kv)
    const first = fakeCtx()
    await worker.fetch(req('/?user=octocat'), env, first.ctx)
    await first.flush()
    const callsAfterFirst = graphqlMock.mock.calls.length

    const reads: string[] = []
    const origGet = kv.get.bind(kv)
    kv.get = (async (key: string) => {
      reads.push(key)
      return origGet(key)
    }) as typeof kv.get
    const res = await worker.fetch(req('/?user=octocat'), env, fakeCtx().ctx)
    expect(res.status).toBe(200)
    expect(reads).toEqual([])
    expect(graphqlMock.mock.calls.length).toBe(callsAfterFirst)
  })

  // preview=1 はギャラリー記録を止めるためだけの印。キャッシュキーは user/theme/glow
  // しか見ないので、見本の取得と通常の取得は同じエントリを共有する（= 分断しない）
  it('preview=1 は通常のカード要求とエッジキャッシュを共有する', async () => {
    mockOkPublicOnly('octocat')
    const kv = fakeKv()
    const env = makeEnv(kv)
    const first = fakeCtx()
    await worker.fetch(req('/?user=octocat&preview=1'), env, first.ctx)
    await first.flush()

    // GraphQL を踏まないことだけでは証明にならない（KV のデータキャッシュでも踏まない）。
    // KV を1度も読まなかったことが「エッジで返した」= キーを分断していない証拠
    const reads: string[] = []
    const origGet = kv.get.bind(kv)
    kv.get = (async (key: string) => {
      reads.push(key)
      return origGet(key)
    }) as typeof kv.get
    const res = await worker.fetch(req('/?user=octocat'), env, fakeCtx().ctx)
    expect(res.status).toBe(200)
    expect(reads).toEqual([])
  })
})

describe('本人のインストール解決', () => {
  // 固定の installation token では他人の private は永久に見えない。「App を入れると
  // private 込み・verified+」という約束は、ユーザーごとに installation を解決して初めて成立する
  it('App を入れている本人の召喚は、その人の installation で解決される', async () => {
    mockOkOptedIn('octocat')
    const kv = fakeKv()
    const { ctx, flush } = fakeCtx()
    const res = await worker.fetch(req('/?user=octocat'), makeEnv(kv), ctx)
    expect(res.status).toBe(200)
    await flush()
    expect(kv.store.has('gallery:u:octocat')).toBe(true)
  })

  // 未インストールでも 404 で落ちず、公開分だけのカードとして成立すること
  it('未インストールのユーザーも公開分だけで描画される', async () => {
    mockOkPublicOnly('stranger')
    const kv = fakeKv()
    const res = await worker.fetch(req('/?user=stranger'), makeEnv(kv), fakeCtx().ctx)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/svg+xml')
    expect(await res.text()).toContain('stranger')
  })
})
