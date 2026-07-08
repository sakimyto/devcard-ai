import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'
import { isBotRequest, renderOgpHtml, svgToPng } from '~/ogp'
import { themes } from '~/svg/themes'

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
    expect(html).toContain("sakimyto&#39;s AI Builder Passport")
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

// Layout constants for the probe SVG — the inspection rect is derived from these,
// never hardcoded, so the assertion tracks the drawn glyph box exactly.
const CANVAS = { w: 200, h: 60 }
const TEXT = { x: 10, baselineY: 40, fontSize: 32, content: 'HELLO' }
// Glyph ink lives from ~ascent (≈fontSize above the baseline) to a little below it.
const TEXT_RECT = {
  x: TEXT.x,
  y: TEXT.baselineY - TEXT.fontSize,
  w: Math.round(TEXT.fontSize * 0.6 * TEXT.content.length),
  h: TEXT.fontSize + 8,
}
const MIN_INK_RATIO = 0.02 // >2% of the rect non-background ⇒ glyphs actually drew
const CHANNEL_DIFF_THRESHOLD = 30

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  }
}

describe('svgToPng font rendering regression (pixel inspection)', () => {
  it('renders text ink inside the glyph box — font-missing detector', async () => {
    const bg = themes.light.bg // same theme constant the cards paint their background with
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS.w}" height="${CANVAS.h}">
      <rect width="${CANVAS.w}" height="${CANVAS.h}" fill="${bg}"/>
      <text x="${TEXT.x}" y="${TEXT.baselineY}" font-size="${TEXT.fontSize}" fill="#000000" font-family="Inter">${TEXT.content}</text>
    </svg>`
    const bytes = await svgToPng(svg, CANVAS.w)
    const png = PNG.sync.read(Buffer.from(bytes))
    const bgRgb = hexToRgb(bg)

    let ink = 0
    let total = 0
    for (let y = TEXT_RECT.y; y < TEXT_RECT.y + TEXT_RECT.h && y < png.height; y++) {
      for (let x = TEXT_RECT.x; x < TEXT_RECT.x + TEXT_RECT.w && x < png.width; x++) {
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
