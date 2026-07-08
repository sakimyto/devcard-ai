export interface SwrOptions<T> {
  kv: KVNamespace
  key: string
  freshTtlSec: number
  staleTtlSec: number
  produce: () => Promise<T>
  shouldCache?: (value: T) => boolean
  now?: () => number
}

interface Entry<T> {
  v: T
  at: number
}

export async function getCachedOrProduce<T>(
  opts: SwrOptions<T>,
): Promise<{ value: T; cacheState: 'fresh' | 'stale' | 'miss' }> {
  const nowMs = (opts.now ?? Date.now)()
  const raw = await opts.kv.get(opts.key)
  let entry: Entry<T> | null = null
  if (raw !== null) {
    try {
      entry = JSON.parse(raw) as Entry<T>
    } catch {
      entry = null
    }
  }

  const ageSec = entry ? (nowMs - entry.at) / 1000 : Number.POSITIVE_INFINITY

  if (entry && ageSec < opts.freshTtlSec) {
    return { value: entry.v, cacheState: 'fresh' }
  }

  try {
    const value = await opts.produce()
    if (opts.shouldCache?.(value) ?? true) {
      // KV 側の expirationTtl で staleTtl 超過分は自然消滅させる
      await opts.kv.put(opts.key, JSON.stringify({ v: value, at: nowMs }), {
        expirationTtl: opts.staleTtlSec,
      })
    }
    return { value, cacheState: 'miss' }
  } catch (error) {
    if (entry && ageSec < opts.staleTtlSec) {
      console.error('cache: produce failed, serving stale:', error)
      return { value: entry.v, cacheState: 'stale' }
    }
    throw error
  }
}
