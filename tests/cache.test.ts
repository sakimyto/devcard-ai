import { describe, expect, it, vi } from 'vitest'
import { getCachedOrProduce } from '~/cache'

function fakeKv() {
  const store = new Map<string, { value: string; storedAt: number }>()
  return {
    store,
    async get(key: string): Promise<string | null> {
      return store.get(key)?.value ?? null
    },
    async put(key: string, value: string): Promise<void> {
      store.set(key, { value, storedAt: Date.now() })
    },
  } as unknown as KVNamespace & { store: Map<string, { value: string; storedAt: number }> }
}

const NOW = 1_800_000_000_000

describe('getCachedOrProduce', () => {
  it('miss → produce, stores, returns miss', async () => {
    const kv = fakeKv()
    const r = await getCachedOrProduce({
      kv,
      key: 'k',
      freshTtlSec: 3600,
      staleTtlSec: 86400,
      now: () => NOW,
      produce: async () => 'value1',
    })
    expect(r).toEqual({ value: 'value1', cacheState: 'miss' })
    expect(await kv.get('k')).toContain('value1')
  })

  it('fresh hit → no produce call', async () => {
    const kv = fakeKv()
    const produce = vi.fn(async () => 'v2')
    await kv.put('k', JSON.stringify({ v: 'v1', at: NOW - 1000 * 60 }))
    const r = await getCachedOrProduce({
      kv, key: 'k', freshTtlSec: 3600, staleTtlSec: 86400, now: () => NOW, produce,
    })
    expect(r).toEqual({ value: 'v1', cacheState: 'fresh' })
    expect(produce).not.toHaveBeenCalled()
  })

  it('expired + produce ok → refresh', async () => {
    const kv = fakeKv()
    await kv.put('k', JSON.stringify({ v: 'old', at: NOW - 1000 * 60 * 60 * 2 }))
    const r = await getCachedOrProduce({
      kv, key: 'k', freshTtlSec: 3600, staleTtlSec: 86400, now: () => NOW,
      produce: async () => 'new',
    })
    expect(r).toEqual({ value: 'new', cacheState: 'miss' })
  })

  it('expired + produce throws + stale available → stale-if-error', async () => {
    const kv = fakeKv()
    await kv.put('k', JSON.stringify({ v: 'old', at: NOW - 1000 * 60 * 60 * 2 }))
    const r = await getCachedOrProduce({
      kv, key: 'k', freshTtlSec: 3600, staleTtlSec: 86400, now: () => NOW,
      produce: async () => {
        throw new Error('rate limited')
      },
    })
    expect(r).toEqual({ value: 'old', cacheState: 'stale' })
  })

  it('expired beyond staleTtl + produce throws → rethrows', async () => {
    const kv = fakeKv()
    await kv.put('k', JSON.stringify({ v: 'ancient', at: NOW - 1000 * 60 * 60 * 48 }))
    await expect(
      getCachedOrProduce({
        kv, key: 'k', freshTtlSec: 3600, staleTtlSec: 86400, now: () => NOW,
        produce: async () => {
          throw new Error('down')
        },
      }),
    ).rejects.toThrow('down')
  })

  it('shouldCache=false → returned but not stored', async () => {
    const kv = fakeKv()
    const r = await getCachedOrProduce({
      kv, key: 'k', freshTtlSec: 3600, staleTtlSec: 86400, now: () => NOW,
      produce: async () => 'err-card',
      shouldCache: () => false,
    })
    expect(r.cacheState).toBe('miss')
    expect(await kv.get('k')).toBeNull()
  })

  it('corrupt KV entry → treated as miss, repopulated', async () => {
    const kv = fakeKv()
    await kv.put('k', '{not json')
    const r = await getCachedOrProduce({
      kv, key: 'k', freshTtlSec: 3600, staleTtlSec: 86400, now: () => NOW,
      produce: async () => 'fresh-value',
    })
    expect(r).toEqual({ value: 'fresh-value', cacheState: 'miss' })
    expect(await kv.get('k')).toContain('fresh-value')
  })
})
