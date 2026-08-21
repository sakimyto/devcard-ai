import { describe, expect, it, vi } from 'vitest'
import { type GalleryMeta, listGallery, recordGallery } from '~/gallery'
import { fakeKv } from './fixtures/fakeKv'

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

  // theme 未記録の行はカスタマイズ導入前の召喚 = dark 時代のカード。壊れた値も同じ扱いに
  // 落とす（「未記録なら dark、壊れていたら light」という分岐は読む側に説明がつかない）
  it('theme が無い行も壊れた行も、レガシー既定の dark に落ちる', async () => {
    const kv = fakeKv()
    await kv.put('gallery:u:legacy', '1', { metadata: { at: 3 } })
    await kv.put('gallery:u:broken', '1', { metadata: { at: 2, theme: 'purple', glow: 42 } })
    const entries = await listGallery(kv)
    expect(entries.find((e) => e.user === 'legacy')?.theme).toBe('dark')
    expect(entries.find((e) => e.user === 'broken')?.theme).toBe('dark')
    expect(entries.find((e) => e.user === 'broken')?.glow).toBe('soft')
  })
})
