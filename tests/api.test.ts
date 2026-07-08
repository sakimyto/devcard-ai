import { beforeEach, describe, expect, it, vi } from 'vitest'
import worker from '../api/index'

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
  return {
    store,
    async get(key: string): Promise<string | null> {
      return store.get(key) ?? null
    },
    async put(key: string, value: string): Promise<void> {
      store.set(key, value)
    },
  } as unknown as KVNamespace & { store: Map<string, string> }
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

function req(path: string, headers: Record<string, string> = {}) {
  return new Request(`https://devcard.example${path}`, { headers })
}

beforeEach(() => {
  graphqlMock.mockReset()
})

describe('worker fetch routing', () => {
  it('invalid user → 400, GitHub not called', async () => {
    const res = await worker.fetch(req('/?user=-bad--name-'), makeEnv())
    expect(res.status).toBe(400)
    expect(res.headers.get('cache-control')).toContain('max-age=3600')
    expect(graphqlMock).not.toHaveBeenCalled()
  })

  it('empty user outside landing path → 400, GitHub not called', async () => {
    const res = await worker.fetch(req('/card?user='), makeEnv())
    expect(res.status).toBe(400)
    expect(graphqlMock).not.toHaveBeenCalled()
  })

  it('root without user → landing page HTML', async () => {
    const res = await worker.fetch(req('/'), makeEnv())
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(graphqlMock).not.toHaveBeenCalled()
  })

  it('unknown user + Accept text/html → 404 with cache', async () => {
    graphqlMock.mockResolvedValue(NOT_FOUND_RESPONSE)
    const res = await worker.fetch(req('/?user=ghost', { accept: 'text/html' }), makeEnv())
    expect(res.status).toBe(404)
    expect(res.headers.get('cache-control')).toContain('max-age=3600')
  })

  it('unknown user in image context → 200 error-card SVG (no broken image in README)', async () => {
    graphqlMock.mockResolvedValue(NOT_FOUND_RESPONSE)
    const res = await worker.fetch(req('/?user=ghost'), makeEnv())
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/svg+xml')
    expect(res.headers.get('x-cache-state')).toBe('miss')
  })

  it('GitHub failure with no stale → 200 placeholder, no-store', async () => {
    graphqlMock.mockRejectedValue(new Error('github down'))
    const res = await worker.fetch(req('/?user=someuser'), makeEnv())
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
    const res = await worker.fetch(req('/?user=cacheduser'), makeEnv(kv))
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
    )
    expect(res.status).toBe(404)
  })

  it('bot UA + existing user → 200 OGP HTML', async () => {
    graphqlMock.mockResolvedValue(NO_REPOS_RESPONSE)
    const res = await worker.fetch(
      req('/?user=someuser', { 'user-agent': 'Slackbot-LinkExpanding 1.0' }),
      makeEnv(),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(await res.text()).toContain('og:image')
  })
})
