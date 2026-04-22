import { describe, expect, it } from 'vitest'
import { isBotRequest, renderOgpHtml } from '~/ogp'

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
})
