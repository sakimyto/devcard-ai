import { Resvg, initWasm } from '@resvg/resvg-wasm'
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
import interBold from '../fonts/inter-bold-subset.ttf'
import interRegular from '../fonts/inter-regular-subset.ttf'

let initialized = false

// Built once at module scope, not per request — the Worker's cpu_ms=100 budget
// can't afford re-decoding the font buffers on every /og call.
const FONT_BUFFERS = [new Uint8Array(interRegular), new Uint8Array(interBold)]

async function ensureWasmInitialized(): Promise<void> {
  if (initialized) return
  await initWasm(resvgWasm)
  initialized = true
}

export async function svgToPng(svg: string, widthPx = 1200): Promise<Uint8Array> {
  await ensureWasmInitialized()
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: widthPx },
    // resvg-wasm has no filesystem, so system fonts are never available. Ship the
    // subset TTFs explicitly — without this every text glyph rendered as nothing.
    font: {
      fontBuffers: FONT_BUFFERS,
      defaultFontFamily: 'Inter',
      loadSystemFonts: false,
    },
  })
  const rendered = resvg.render()
  return rendered.asPng()
}

const BOT_USER_AGENTS = [
  'Twitterbot',
  'facebookexternalhit',
  'Slackbot',
  'LinkedInBot',
  'Discordbot',
  'TelegramBot',
  'WhatsApp',
]

export function isBotRequest(userAgent: string): boolean {
  const ua = userAgent.toLowerCase()
  return BOT_USER_AGENTS.some((bot) => ua.includes(bot.toLowerCase()))
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// GitHub logins are [A-Za-z0-9-], but we do not trust input here — the caller
// hands us a raw query parameter, and XSS surfaced in tools like this has
// historically bypassed later validation. Escape at the interpolation boundary.
export function renderOgpHtml(user: string, baseUrl: string, theme: string, glow = 'soft'): string {
  const safeImage = escapeHtml(
    `${baseUrl}/og?user=${encodeURIComponent(user)}&theme=${encodeURIComponent(theme)}&glow=${encodeURIComponent(glow)}`,
  )
  // Relative meta-refresh avoids any dependency on the incoming Host header.
  const safeRedirect = escapeHtml(
    `/?user=${encodeURIComponent(user)}&theme=${encodeURIComponent(theme)}&glow=${encodeURIComponent(glow)}`,
  )
  const safeUser = escapeHtml(user)
  const title = `${safeUser}&#39;s AI Builder Passport`
  const description = `See how ${safeUser} ships with AI — PullCard AI`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${safeImage}" />
  <meta http-equiv="refresh" content="0;url=${safeRedirect}" />
  <title>${title}</title>
</head>
<body></body>
</html>`
}
