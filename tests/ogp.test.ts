import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'
import type { CardDataV2 } from '~/analyzers/types'
import { isBotRequest, renderOgpHtml, svgToPng } from '~/ogp'
import { themes } from '~/svg/themes'
import { renderOgShare } from '~/svg/v2/ogShare'

describe('isBotRequest', () => {
  it('detects Twitterbot', () => {
    expect(isBotRequest('Twitterbot/1.0')).toBe(true)
  })

  it('detects Slackbot', () => {
    expect(isBotRequest('Slackbot-LinkExpanding 1.0')).toBe(true)
  })

  it('detects Facebook crawler', () => {
    expect(isBotRequest('facebookexternalhit/1.1')).toBe(true)
  })

  it('detects Discord bot', () => {
    expect(isBotRequest('Mozilla/5.0 (compatible; Discordbot/2.0)')).toBe(true)
  })

  it('does not flag normal browser', () => {
    expect(isBotRequest('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(false)
  })

  it('handles empty user agent', () => {
    expect(isBotRequest('')).toBe(false)
  })
})

describe('renderOgpHtml', () => {
  it('includes og:image with correct URL (HTML-escaped ampersand)', () => {
    const html = renderOgpHtml('testuser', 'https://devcard-ai.example.com', 'dark')
    expect(html).toContain('og:image')
    expect(html).toContain('/og?user=testuser&amp;theme=dark')
  })

  it('includes twitter:card meta', () => {
    const html = renderOgpHtml('testuser', 'https://example.com', 'light')
    expect(html).toContain('twitter:card')
    expect(html).toContain('summary_large_image')
  })

  it('includes user name in title', () => {
    const html = renderOgpHtml('sakimyto', 'https://example.com', 'light')
    expect(html).toContain('sakimyto&#39;s AI Builder Passport')
  })

  it('escapes HTML-special characters in user to prevent XSS', () => {
    const malicious = '"><script>alert(1)</script>'
    const html = renderOgpHtml(malicious, 'https://example.com', 'light')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).not.toMatch(/content="[^"]*"[^>]*><script/)
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&quot;')
  })

  it('escapes angle brackets in user', () => {
    const html = renderOgpHtml('<img onerror=alert(1)>', 'https://example.com', 'light')
    expect(html).not.toContain('<img onerror=alert(1)>')
    expect(html).toContain('&lt;img onerror=alert(1)&gt;')
  })

  it('uses a relative URL for meta refresh (independent of host header)', () => {
    const html = renderOgpHtml('testuser', 'https://evil.example.com', 'dark')
    expect(html).toMatch(/http-equiv="refresh"[^>]+content="0;url=\/\?user=testuser/)
  })

  it('declares 1200x630 landscape OGP image dimensions', () => {
    const html = renderOgpHtml('testuser', 'https://example.com', 'dark')
    expect(html).toContain('og:image:width" content="1200"')
    expect(html).toContain('og:image:height" content="630"')
  })
})

const MIN_INK_RATIO = 0.02 // >2% of the rect non-background ⇒ glyphs actually drew
const CHANNEL_DIFF_THRESHOLD = 30

// Mirrors renderOgShare's username layout in src/svg/v2/ogShare.ts (PAD=72, baseline
// y=180, fontSize=56). Kept in sync there; the inspection rect is derived from these,
// never hardcoded, so it tracks the drawn glyph box.
const OG_USERNAME = { pad: 72, baselineY: 180, fontSize: 56 }

const PROBE_DATA: CardDataV2 = {
  username: 'testuser',
  stats: {
    velocity: 82,
    diversity: 60,
    consistency: 74,
    synergy: 65,
    range: 50,
    flow: 40,
    points: 73,
    grade: 'S',
    power: 6307,
    aiCommitsInWindow: 120,
    activeWeeks: 9,
  },
  toolAttribution: { tools: [], assisted: [], totalAiCommits: 120, verified: true },
  equipped: { equipped: [] },
  usage: { categories: [], totalCommits: 120 },
  languages: { languages: [], othersPercentage: 0 },
  pattern: { pattern: 'AI Native', aiRate: 0.7, alternationScore: 0.3 },
  record: {
    exp: 1240,
    commits: 210,
    prs: 18,
    reviews: 34,
    issues: 9,
    inclPrivate: false,
    currentStreak: 7,
    longestStreak: 15,
    yearTotal: 1240,
    weeklyContributions: new Array(52).fill(0),
  },
  element: { id: 'bolt', label: 'Bolt', color: '#f0b429' },
  epithet: 'The Ascendant',
  traits: [],
  flavor: 'x',
  serial: '#7F3A',
  seed: 42,
  issuedYear: 2026,
  avatarDataUri: null,
  includesPrivate: false,
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  }
}

// The real /og path draws every glyph through svgText, whose font-family is the
// `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` stack — NONE of which
// resvg has. Correct text therefore depends entirely on svgToPng's fallback to
// `defaultFontFamily: 'Inter'`. This test rasterizes the actual renderOgShare output
// (not a bespoke font-family="Inter" SVG), so it goes red the moment that fallback
// breaks — e.g. defaultFontFamily removed or svgText's family stack changed — which
// is exactly the "all OGP text missing" regression Task 8 fixed. A direct
// font-family="Inter" probe would stay green through such a regression (false green).
describe('svgToPng font rendering regression (pixel inspection)', () => {
  it('renders username ink via the production svgText → Inter fallback path', async () => {
    const bg = themes.dark.bg // renderOgShare paints the canvas with this theme constant
    const svg = renderOgShare(PROBE_DATA, 'dark')
    const bytes = await svgToPng(svg, 1200)
    const png = PNG.sync.read(Buffer.from(bytes))
    const bgRgb = hexToRgb(bg)

    // Glyph ink spans from ~ascent (≈fontSize above the baseline) to a little below it.
    const rect = {
      x: OG_USERNAME.pad,
      y: OG_USERNAME.baselineY - OG_USERNAME.fontSize,
      w: Math.round(OG_USERNAME.fontSize * 0.6 * PROBE_DATA.username.length),
      h: OG_USERNAME.fontSize + 8,
    }

    let ink = 0
    let total = 0
    for (let y = rect.y; y < rect.y + rect.h && y < png.height; y++) {
      for (let x = rect.x; x < rect.x + rect.w && x < png.width; x++) {
        const i = (png.width * y + x) << 2
        total++
        const diff =
          Math.abs(png.data[i] - bgRgb.r) +
          Math.abs(png.data[i + 1] - bgRgb.g) +
          Math.abs(png.data[i + 2] - bgRgb.b)
        if (diff > CHANNEL_DIFF_THRESHOLD) ink++
      }
    }
    expect(total).toBeGreaterThan(0)
    expect(ink / total).toBeGreaterThan(MIN_INK_RATIO)
  })
})
