// テーマ名の正本は配色表そのもの（src/svg/themes.ts）。ここで一覧を再宣言すると、
// 配色を足したのに選べない／選べるのに配色が無い、という片側だけの更新が起きる。
import { CARD_THEMES, type CardTheme } from '~/svg/themes'

export { CARD_THEMES, type CardTheme }

export const GLOW_STYLES = ['none', 'soft', 'neon', 'holo'] as const
export type GlowStyle = (typeof GLOW_STYLES)[number]

export const DEFAULT_THEME: CardTheme = 'light'
export const DEFAULT_GLOW: GlowStyle = 'soft'

const THEME_SET = new Set<string>(CARD_THEMES)
const GLOW_SET = new Set<string>(GLOW_STYLES)

// `fallback` は呼び出し側が自分のデフォルトを宣言するための引数。gallery の
// レガシー行（theme 未記録 = dark 時代の召喚）のように、既定が light ではない
// 文脈が実在するので、共有ノーマライザの外側で特殊ケースを組むのを防ぐ。
export function normalizeTheme(
  value: string | null | undefined,
  fallback: CardTheme = DEFAULT_THEME,
): CardTheme {
  return value && THEME_SET.has(value) ? (value as CardTheme) : fallback
}

export function normalizeGlow(
  value: string | null | undefined,
  fallback: GlowStyle = DEFAULT_GLOW,
): GlowStyle {
  return value && GLOW_SET.has(value) ? (value as GlowStyle) : fallback
}

// holo の虹色ストップ。SVG の <linearGradient>（frame.ts）と LP のスウォッチ CSS の
// 両方がここから引くので、片方だけ色が変わってプレビューと実物がずれることがない。
export const HOLO_STOPS: ReadonlyArray<{ offset: number; color: string }> = [
  { offset: 0, color: '#ff6ec7' },
  { offset: 30, color: '#ffc36e' },
  { offset: 60, color: '#6ef3ff' },
  { offset: 100, color: '#a06eff' },
]

// glow スタイルごとの事実の唯一の置き場。ここに無いと、LP のラジオ・スウォッチ、
// カード脚注のラベル、アート枠の装飾判定がそれぞれ独立に glow を再分岐しはじめ、
// スタイルを1つ足すたびに触り忘れがコンパイラに検出されないまま残る。
// フレーム自体の描画レシピだけは renderFrame（svg/v2/frame.ts）が持つ。
export interface GlowSpec {
  // カード脚注に出る表記
  label: string
  // LP のラジオに出る表示名
  title: string
  // LP のスウォッチの CSS。カード側の見え方と視覚的に揃える
  swatch: string
  // アート枠にきらめきを重ねるか
  sparkles: boolean
}

export const GLOW_SPEC: Record<GlowStyle, GlowSpec> = {
  none: { label: 'CLEAN', title: 'Clean', swatch: 'background: #6e7681', sparkles: false },
  soft: {
    label: 'SOFT GLOW',
    title: 'Soft',
    swatch: 'background: var(--accent); box-shadow: 0 0 5px var(--accent)',
    sparkles: false,
  },
  neon: {
    label: 'NEON GLOW',
    title: 'Neon',
    swatch: 'background: #d9c7ff; box-shadow: 0 0 8px 2px var(--accent)',
    sparkles: false,
  },
  holo: {
    label: 'HOLO GLOW',
    title: 'Holo',
    swatch: `background: linear-gradient(135deg, ${HOLO_STOPS.map((s) => s.color).join(', ')}); box-shadow: 0 0 6px var(--accent)`,
    sparkles: true,
  },
}

export function glowLabel(glow: GlowStyle): string {
  return GLOW_SPEC[glow].label
}
