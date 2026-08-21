// KV の get/put/list/metadata/delete を最小実装したフェイク。value は '1' プレースホルダで
// 表示値は metadata 側に載る、キー名昇順の cursor ページング、という本番 KV の性質を再現する。
// api.test と gallery.test が別々のコピーを持つと、KV の挙動の理解が2箇所で食い違う。
export function fakeKv() {
  const store = new Map<string, string>()
  const meta = new Map<string, unknown>()
  return {
    store,
    meta,
    async get(key: string): Promise<string | null> {
      return store.get(key) ?? null
    },
    async getWithMetadata<T>(key: string): Promise<{ value: string | null; metadata: T | null }> {
      return { value: store.get(key) ?? null, metadata: (meta.get(key) as T) ?? null }
    },
    async put(key: string, value: string, opts?: { metadata?: unknown }): Promise<void> {
      store.set(key, value)
      if (opts?.metadata !== undefined) meta.set(key, opts.metadata)
    },
    async delete(key: string): Promise<void> {
      store.delete(key)
      meta.delete(key)
    },
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

// Worker はエッジキャッシュの前段で走るので、テストでも `caches.default` を実体として持つ。
// 各テストの間で持ち越すと「前のテストが温めたエッジ」が次のテストの KV 経路を隠すため、
// 返り値の reset() を beforeEach で呼ぶこと。
export function installFakeEdgeCache() {
  const entries = new Map<string, Response>()
  const cache = {
    async match(req: Request): Promise<Response | undefined> {
      return entries.get(req.url)?.clone()
    },
    async put(req: Request, res: Response): Promise<void> {
      // 本番同様、保存させない指示のあるレスポンスは載せない
      if ((res.headers.get('cache-control') ?? '').includes('no-store')) return
      entries.set(req.url, res)
    },
  }
  ;(globalThis as unknown as { caches: { default: typeof cache } }).caches = { default: cache }
  return {
    entries,
    reset: () => entries.clear(),
  }
}
