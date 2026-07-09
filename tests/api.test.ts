import { beforeEach, describe, expect, it, vi } from 'vitest'
import worker from '../api/index'
import type { GitHubQueryResponse } from '../src/github/types'

// GitHub App / Octokit は外部境界なのでここだけモックする。graphql の応答は
// 各テストが fixture を差し込み、handler〜レンダラは本物を通す
const { graphqlMock } = vi.hoisted(() => ({ graphqlMock: vi.fn() }))

vi.mock('@octokit/app', () => ({
  App: class {
    async getInstallationOctokit() {
      return { graphql: graphqlMock }
    }
  },
}))

function fakeKv() {
  const store = new Map<string, string>()
  const meta = new Map<string, unknown>()
  return {
    store,
    meta,
    async get(key: string): Promise<string | null> {
      return store.get(key) ?? null
    },
    async put(key: string, value: string, opts?: { metadata?: unknown }): Promise<void> {
      store.set(key, value)
      if (opts?.metadata !== undefined) meta.set(key, opts.metadata)
    },
    async list(opts?: { prefix?: string; limit?: number }) {
      const prefix = opts?.prefix ?? ''
      const limit = opts?.limit ?? 1000
      const keys = [...store.keys()]
        .filter((k) => k.startsWith(prefix))
        .slice(0, limit)
        .map((name) => ({ name, metadata: meta.get(name) }))
      return { keys, list_complete: true, cursor: undefined }
    },
  } as unknown as KVNamespace & { store: Map<string, string>; meta: Map<string, unknown> }
}

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

// 実時刻基準（api の handleRequest は now を注入しないため）の ok 応答 fixture。
function okResponse(login = 'octocat'): GitHubQueryResponse {
  const recent = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString()
  const aiCommit = (daysAgo: number, oid: string) => ({
    oid,
    message: 'feat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>',
    committedDate: recent(daysAgo),
    author: { user: { login: 'someone' } },
  })
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
function mockOkPublicOnly(login = 'octocat') {
  const ok = okResponse(login)
  graphqlMock.mockImplementation((_q: string, vars: Record<string, unknown>) => {
    if (vars?.privacy === 'PRIVATE') {
      return Promise.resolve({ user: { login, repositories: { nodes: [] } } })
    }
    return Promise.resolve(ok)
  })
}

function req(path: string, headers: Record<string, string> = {}) {
  return new Request(`https://devcard.example${path}`, { headers })
}

beforeEach(() => {
  graphqlMock.mockReset()
})

describe('worker fetch routing', () => {
  it('workers.dev host → 301 to devcard.sakimyto.com preserving path+query', async () => {
    const res = await worker.fetch(
      new Request('https://devcard-ai.sakimyto.workers.dev/?user=octocat&theme=dark'),
      makeEnv(),
      fakeCtx().ctx,
    )
    expect(res.status).toBe(301)
    expect(res.headers.get('location')).toBe(
      'https://devcard.sakimyto.com/?user=octocat&theme=dark',
    )
    expect(graphqlMock).not.toHaveBeenCalled()
  })

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

  it('GitHub failure with no stale → 200 placeholder, no-store', async () => {
    graphqlMock.mockRejectedValue(new Error('github down'))
    const res = await worker.fetch(req('/?user=someuser'), makeEnv(), fakeCtx().ctx)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/svg+xml')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.text()).toContain('someuser')
  })

  it('fresh KV hit → served without touching GitHub', async () => {
    const kv = fakeKv()
    kv.store.set(
      'card:v2:cacheduser:light',
      JSON.stringify({ v: { svg: '<svg>cached</svg>', kind: 'ok' }, at: Date.now() - 60_000 }),
    )
    const res = await worker.fetch(req('/?user=cacheduser'), makeEnv(kv), fakeCtx().ctx)
    expect(res.status).toBe(200)
    expect(res.headers.get('x-cache-state')).toBe('fresh')
    expect(await res.text()).toBe('<svg>cached</svg>')
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

describe('召喚ギャラリー', () => {
  it('GET /api/gallery → at 降順 top24 JSON, Cache-Control 60s', async () => {
    const kv = fakeKv()
    for (let i = 0; i < 30; i++) {
      kv.store.set(`gallery:u:user${i}`, '1')
      kv.meta.set(`gallery:u:user${i}`, {
        at: 1000 + i,
        grade: 'A',
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

  it('ok の miss レンダリングでギャラリーへ記録される', async () => {
    mockOkPublicOnly('octocat')
    const kv = fakeKv()
    const { ctx, flush } = fakeCtx()
    const res = await worker.fetch(req('/?user=octocat'), makeEnv(kv), ctx)
    expect(res.status).toBe(200)
    expect(res.headers.get('x-cache-state')).toBe('miss')
    await flush()
    expect(kv.store.has('gallery:u:octocat')).toBe(true)
    const meta = kv.meta.get('gallery:u:octocat') as { at: number; power: number }
    expect(meta.at).toBeGreaterThan(0)
    expect(typeof meta.power).toBe('number')
  })

  it('fresh hit ではギャラリーへ書かない', async () => {
    const kv = fakeKv()
    kv.store.set(
      'card:v2:cacheduser:light',
      JSON.stringify({
        v: { svg: '<svg>cached</svg>', kind: 'ok', grade: 'A', power: 5000 },
        at: Date.now() - 60_000,
      }),
    )
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
})
