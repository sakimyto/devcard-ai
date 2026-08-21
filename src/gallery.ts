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
// 本人確認できた召喚だけを載せる設計（recordGallery 参照）なので鍵数は伸びない。
// 走査上限を低く保つこと自体が、/api/gallery 1発で KV list を大量に回させない防御になる。
const GALLERY_MAX_PAGES = 5
// 同一ユーザーの再記録は1時間に1回まで。見た目（theme/glow）を変えたときだけ即時に更新する
const GALLERY_REFRESH_MS = 60 * 60 * 1000

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

// GitHub の login は大文字小文字を区別しない。区別したまま鍵にすると、同一人物が
// Octocat / octocat / OCTOCAT … と何行も並び、鍵空間も任意に膨らませられる
function galleryKey(user: string): string {
  return `${GALLERY_PREFIX}${user.toLowerCase()}`
}

// fire-and-forget 記録。失敗はベストエフォートで握りつぶし、レンダリングを止めない
// （ギャラリーは可用性の単一障害点にしない）。
//
// 呼び出し側の責務: **本人がオプトインした召喚だけ**を渡すこと。誰でも他人を召喚できる以上、
// 「描画されたから載せる」にすると、本人の同意なくログイン名と数値が公開ページに90日並ぶ。
//
// 書き込みは1時間に1回まで（見た目を変えたときは即時）。旧実装はキャッシュミス時のみ
// 書いていたが、カードと共有画像が同じキャッシュを共有するようになり「/og が先に温めると
// 永久に記録されない」状態が起きたため、cacheState から切り離した。
export async function recordGallery(
  kv: KVNamespace,
  user: string,
  meta: GalleryMeta,
): Promise<void> {
  const key = galleryKey(user)
  try {
    const prev = (await kv.getWithMetadata<GalleryMeta>(key)).metadata
    if (
      prev &&
      meta.at - prev.at < GALLERY_REFRESH_MS &&
      prev.theme === meta.theme &&
      prev.glow === meta.glow
    ) {
      return
    }
    await kv.put(key, '1', {
      expirationTtl: GALLERY_TTL_SEC,
      metadata: meta,
    })
  } catch (error) {
    console.error('gallery: record failed (ignored):', error)
  }
}

// オプトアウトの実体。GitHub App を外した人は次に誰かがそのカードを描いた時点で
// ギャラリーから消える（削除依頼を待たずに本人の操作だけで降りられる）。
export async function removeFromGallery(kv: KVNamespace, user: string): Promise<void> {
  try {
    await kv.delete(galleryKey(user))
  } catch (error) {
    console.error('gallery: remove failed (ignored):', error)
  }
}

// prefix list → metadata から表示用エントリを組み立て、at 降順 top24 を返す。
// KV list はキー名昇順ページングのため、上限ページ数まで cursor を辿って全鍵を集めてから
// at で並べ替える（名前順1ページだけを at ソートすると「直近」が壊れる）。
// KV list の結果整合性は許容（表示用途）。list 失敗は空配列に劣化。
export async function listGallery(kv: KVNamespace): Promise<GalleryEntry[]> {
  // 整形は top24 が確定してから。走査対象は最大 GALLERY_MAX_PAGES × GALLERY_PAGE_SIZE 件あり、
  // その全件を先に整形しても 24 件を残して捨てるだけになる
  const rows: { user: string; meta: GalleryMeta }[] = []
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
        rows.push({ user: key.name.slice(GALLERY_PREFIX.length), meta })
      }
      if (res.list_complete) break
      cursor = res.cursor
    }
  } catch (error) {
    console.error('gallery: list failed, returning empty:', error)
    return []
  }
  rows.sort((a, b) => b.meta.at - a.meta.at)
  // Whitelist fields instead of spreading metadata: old KV rows may still contain
  // the retired `grade`, and arbitrary metadata must never leak through the API.
  return rows.slice(0, GALLERY_LIMIT).map(({ user, meta }) => ({
    user,
    at: meta.at,
    // Before customization existed the gallery always rendered dark cards.
    // Preserve that look for old rows with no theme; malformed values still fall safe.
    theme: normalizeTheme(meta.theme, 'dark'),
    glow: normalizeGlow(meta.glow),
    power: typeof meta.power === 'number' ? meta.power : undefined,
    element: typeof meta.element === 'string' ? meta.element : undefined,
    epithet: typeof meta.epithet === 'string' ? meta.epithet : undefined,
  }))
}
