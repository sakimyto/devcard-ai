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
  // KV read 障害は miss 扱いで origin 生成に進む（キャッシュを可用性の単一障害点にしない）
  let raw: string | null = null
  try {
    raw = await opts.kv.get(opts.key)
  } catch (error) {
    console.error('cache: kv read failed, treating as miss:', error)
  }
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

  // stale-if-error は produce() の失敗に限定する。生成成功後の KV 書き込み失敗は
  // ログのみに留め、生成済みの値をそのまま返す（KV 障害で正常な生成結果を捨てない）
  let value: T
  try {
    value = await opts.produce()
  } catch (error) {
    if (entry && ageSec < opts.staleTtlSec) {
      console.error('cache: produce failed, serving stale:', error)
      return { value: entry.v, cacheState: 'stale' }
    }
    throw error
  }

  if (opts.shouldCache?.(value) ?? true) {
    try {
      // KV 側の expirationTtl で staleTtl 超過分は自然消滅させる
      await opts.kv.put(opts.key, JSON.stringify({ v: value, at: nowMs }), {
        expirationTtl: opts.staleTtlSec,
      })
    } catch (error) {
      console.error('cache: kv write failed, serving value uncached:', error)
    }
  }
  return { value, cacheState: 'miss' }
}
