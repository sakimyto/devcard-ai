import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GLOW,
  DEFAULT_THEME,
  GLOW_STYLES,
  glowLabel,
  normalizeGlow,
  normalizeTheme,
} from '~/card/customization'

describe('card customization contract', () => {
  it('accepts only the published glow presets', () => {
    expect(GLOW_STYLES).toEqual(['none', 'soft', 'neon', 'holo'])
    for (const glow of GLOW_STYLES) expect(normalizeGlow(glow)).toBe(glow)
  })

  it('falls back safely for missing, malformed, and injection-shaped values', () => {
    for (const value of [undefined, null, '', 'laser', '<script>', 'holo" onload=alert(1)']) {
      expect(normalizeGlow(value)).toBe(DEFAULT_GLOW)
    }
    for (const value of [undefined, null, '', 'sepia', '<script>']) {
      expect(normalizeTheme(value)).toBe(DEFAULT_THEME)
    }
  })

  it('labels every finish as a choice, never as a rank', () => {
    expect(GLOW_STYLES.map(glowLabel)).toEqual(['CLEAN', 'SOFT GLOW', 'NEON GLOW', 'HOLO GLOW'])
    expect(GLOW_STYLES.map(glowLabel).join(' ')).not.toMatch(/\b[ABCDEFS][+-]?\b/)
  })
})
