export const CARD_THEMES = ['light', 'dark'] as const
export type CardTheme = (typeof CARD_THEMES)[number]

export const GLOW_STYLES = ['none', 'soft', 'neon', 'holo'] as const
export type GlowStyle = (typeof GLOW_STYLES)[number]

export const DEFAULT_THEME: CardTheme = 'light'
export const DEFAULT_GLOW: GlowStyle = 'soft'

const THEME_SET = new Set<string>(CARD_THEMES)
const GLOW_SET = new Set<string>(GLOW_STYLES)

export function normalizeTheme(value: string | null | undefined): CardTheme {
  return value && THEME_SET.has(value) ? (value as CardTheme) : DEFAULT_THEME
}

export function normalizeGlow(value: string | null | undefined): GlowStyle {
  return value && GLOW_SET.has(value) ? (value as GlowStyle) : DEFAULT_GLOW
}

export function glowLabel(glow: GlowStyle): string {
  return glow === 'none' ? 'CLEAN' : `${glow.toUpperCase()} GLOW`
}
