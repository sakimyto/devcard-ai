import { describe, expect, it, vi } from 'vitest'
import { type GalleryMeta, listGallery, recordGallery } from '~/gallery'

// KV の list/metadata/put を最小実装したフェイク。value は '1' プレースホルダ、
// 表示値は metadata 側に載る（本番 KV の挙動に合わせる）。
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
    // 本番 KV に合わせてキー名昇順・cursor ページングを再現する（at 順ではない）。
    async list(opts?: { prefix?: string; limit?: number; cursor?: string }) {
      const prefix = opts?.prefix ?? ''
      const limit = opts?.limit ?? 1000
      const all = [...store.keys()].filter((k) => k.startsWith(prefix)).sort()
      const start = opts?.cursor ? Number(opts.cursor) : 0
      const page = all.slice(start, start + limit)
      const next = start + limit
      const complete = next >= all.length
      return {
        keys: page.map((name) => ({ name, metadata: meta.get(name) })),
        list_complete: complete,
        cursor: complete ? undefined : String(next),
      }
    },
  } as unknown as KVNamespace & { store: Map<string, string>; meta: Map<string, unknown> }
}

const meta = (at: number, extra: Partial<GalleryMeta> = {}): GalleryMeta => ({
  at,
  theme: 'dark',
  glow: 'neon',
  power: 5000,
  element: 'bolt',
  epithet: 'Rapid Prototyper',
  ...extra,
})

describe('recordGallery', () => {
  it('writes gallery:u:{user} with metadata and TTL', async () => {
    const kv = fakeKv()
    await recordGallery(kv, 'octocat', meta(1000))
    expect(kv.store.get('gallery:u:octocat')).toBe('1')
    expect(kv.meta.get('gallery:u:octocat')).toMatchObject({
      at: 1000,
      theme: 'dark',
      glow: 'neon',
      power: 5000,
    })
  })

  it('swallows put failure (best-effort, never throws)', async () => {
    const kv = fakeKv()
    kv.put = async () => {
      throw new Error('kv write down')
    }
    await expect(recordGallery(kv, 'octocat', meta(1000))).resolves.toBeUndefined()
  })
})

describe('listGallery', () => {
  it('returns entries at-desc, top 24', async () => {
    const kv = fakeKv()
    for (let i = 0; i < 30; i++) {
      await recordGallery(kv, `user${i}`, meta(1000 + i, { power: 5000 + i }))
    }
    const entries = await listGallery(kv)
    expect(entries).toHaveLength(24)
    expect(entries[0].user).toBe('user29')
    expect(entries[0].at).toBe(1029)
    // 降順であること
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i - 1].at).toBeGreaterThanOrEqual(entries[i].at)
    }
    // 最古の user0..user5 は 24 件から溢れる
    expect(entries.some((e) => e.user === 'user0')).toBe(false)
  })

  it('carries customization and display fields', async () => {
    const kv = fakeKv()
    await recordGallery(kv, 'octocat', meta(1000, { element: 'blaze', epithet: 'Ship It' }))
    const [entry] = await listGallery(kv)
    expect(entry).toMatchObject({
      user: 'octocat',
      theme: 'dark',
      glow: 'neon',
      power: 5000,
      element: 'blaze',
      epithet: 'Ship It',
    })
  })

  it('drops retired grade and normalizes malformed customization metadata', async () => {
    const kv = fakeKv()
    kv.store.set('gallery:u:legacy', '1')
    kv.meta.set('gallery:u:legacy', {
      at: 1000,
      grade: 'C',
      glow: 'laser',
      unexpected: 'private',
    })
    const [entry] = await listGallery(kv)
    expect(entry).toEqual({ user: 'legacy', at: 1000, theme: 'dark', glow: 'soft' })
    expect(entry).not.toHaveProperty('grade')
    expect(entry).not.toHaveProperty('unexpected')
  })

  it('skips keys with missing/invalid metadata', async () => {
    const kv = fakeKv()
    await recordGallery(kv, 'good', meta(1000))
    kv.store.set('gallery:u:nometa', '1') // metadata なし
    const entries = await listGallery(kv)
    expect(entries.map((e) => e.user)).toEqual(['good'])
  })

  it('pages past the first 1000-key list page so recent entries are not dropped', async () => {
    const kv = fakeKv()
    // 1000件を古い at で埋め、最新 at の1件を「名前が最後」に置く（= 2ページ目に落ちる）。
    // 単一ページ実装なら最新が漏れるが、cursor 走査すれば拾える。
    for (let i = 0; i < 1000; i++) {
      const name = `a${String(i).padStart(4, '0')}`
      kv.store.set(`gallery:u:${name}`, '1')
      kv.meta.set(`gallery:u:${name}`, meta(1000 + i))
    }
    kv.store.set('gallery:u:zzz-newest', '1')
    kv.meta.set('gallery:u:zzz-newest', meta(9_999_999))
    const entries = await listGallery(kv)
    expect(entries[0].user).toBe('zzz-newest')
    expect(entries[0].at).toBe(9_999_999)
  })

  it('returns [] when list throws', async () => {
    const kv = fakeKv()
    kv.list = async () => {
      throw new Error('kv list down')
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await listGallery(kv)).toEqual([])
    spy.mockRestore()
  })
})
