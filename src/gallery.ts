import { type CardTheme, type GlowStyle, normalizeGlow, normalizeTheme } from './card/customization'

// 召喚ギャラリー: KV metadata による直近召喚者一覧。収集・所有・シーズン機構は OUT。
// KV metadata（1024B 上限）に表示用の軽量値だけ載せ、値本体は '1' のプレースホルダ。
const GALLERY_PREFIX = 'gallery:u:'
const GALLERY_TTL_SEC = 90 * 24 * 60 * 60 // 90日で自然消滅
const GALLERY_LIMIT = 24
// KV list はキー名昇順のページングなので、metadata.at で「直近」を出すには全ページを
// 走査してから並べ替える必要がある。1ページ1000件 × 最大ページ数で走査上限を固定
// （TTL 90日 × ok-miss 限定書き込みで現実的な鍵数を十分カバー、暴走もしない）。
const GALLERY_PAGE_SIZE = 1000
const GALLERY_MAX_PAGES = 20

// KV metadata に載せる表示専用の値。element は element.id（グリフ・枠色は LP 側の静的マップ）。
export interface GalleryMeta {
  at: number
  theme?: CardTheme
  glow?: GlowStyle
  power?: number
  element?: string
  epithet?: string
}

export interface GalleryEntry extends GalleryMeta {
  user: string
}

// ok-miss レンダリング時のみ呼ぶ fire-and-forget 記録。失敗はベストエフォートで握りつぶし、
// レンダリングを止めない（ギャラリーは可用性の単一障害点にしない）。
export async function recordGallery(
  kv: KVNamespace,
  user: string,
  meta: GalleryMeta,
): Promise<void> {
  try {
    await kv.put(`${GALLERY_PREFIX}${user}`, '1', {
      expirationTtl: GALLERY_TTL_SEC,
      metadata: meta,
    })
  } catch (error) {
    console.error('gallery: record failed (ignored):', error)
  }
}

// prefix list → metadata から表示用エントリを組み立て、at 降順 top24 を返す。
// KV list はキー名昇順ページングのため、上限ページ数まで cursor を辿って全鍵を集めてから
// at で並べ替える（名前順1ページだけを at ソートすると「直近」が壊れる）。
// KV list の結果整合性は許容（表示用途）。list 失敗は空配列に劣化。
export async function listGallery(kv: KVNamespace): Promise<GalleryEntry[]> {
  const entries: GalleryEntry[] = []
  let cursor: string | undefined
  try {
    for (let page = 0; page < GALLERY_MAX_PAGES; page++) {
      const res: KVNamespaceListResult<GalleryMeta> = await kv.list<GalleryMeta>({
        prefix: GALLERY_PREFIX,
        limit: GALLERY_PAGE_SIZE,
        cursor,
      })
      for (const key of res.keys) {
        const meta = key.metadata
        // metadata 欠落（TTL 切れ間際・書き込み途中）は表示から除外
        if (!meta || typeof meta.at !== 'number') continue
        // Whitelist fields instead of spreading metadata: old KV rows may still contain
        // the retired `grade`, and arbitrary metadata must never leak through the API.
        entries.push({
          user: key.name.slice(GALLERY_PREFIX.length),
          at: meta.at,
          // Before customization existed the gallery always rendered dark cards.
          // Preserve that look for old rows with no theme; malformed values still fall safe.
          theme: meta.theme === undefined ? 'dark' : normalizeTheme(meta.theme),
          glow: normalizeGlow(meta.glow),
          ...(typeof meta.power === 'number' ? { power: meta.power } : {}),
          ...(typeof meta.element === 'string' ? { element: meta.element } : {}),
          ...(typeof meta.epithet === 'string' ? { epithet: meta.epithet } : {}),
        })
      }
      if (res.list_complete) break
      cursor = res.cursor
    }
  } catch (error) {
    console.error('gallery: list failed, returning empty:', error)
    return []
  }
  entries.sort((a, b) => b.at - a.at)
  return entries.slice(0, GALLERY_LIMIT)
}
