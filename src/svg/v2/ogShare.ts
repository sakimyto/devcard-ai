import type { CardDataV2 } from '~/analyzers/types'
import { type Theme, getTheme } from '../themes'
import { svgRect, svgText } from '../utils'
import { TIER_GEM_COLORS } from './frame'

const W = 1200
const H = 630
const PAD = 72

function shareStatBar(label: string, value: number, y: number, theme: Theme): string {
  const barX = PAD + 230
  const barW = 420
  const filled = Math.round((barW * Math.max(0, Math.min(100, value))) / 100)
  return `${svgText(PAD, y + 16, label, { fontSize: 22, fill: theme.textSecondary, fontWeight: '600' })}
${svgRect(barX, y, barW, 20, { fill: theme.barBg, rx: 10 })}
${filled > 0 ? svgRect(barX, y, Math.max(filled, 20), 20, { fill: theme.accent, rx: 10 }) : ''}
${svgText(barX + barW + 20, y + 17, String(value), { fontSize: 24, fill: theme.text, fontWeight: 'bold' })}`
}

// 1200x630 landscape share image: a summary (name / tier gem / stat bars / POWER), NOT
// the 750x1050 vertical card scaled down. PNG-rasterized downstream, so no SMIL.
export function renderOgShare(data: CardDataV2, themeName: string): string {
  const theme = getTheme(themeName)
  const gemColor = TIER_GEM_COLORS[data.stats.grade]

  // Circular avatar to the left of the name. When absent, the name keeps its original
  // x=PAD position (text placement is invariant to the avatar being present or not).
  const avR = 40
  const hasAvatar = data.avatarDataUri !== null
  const nameX = hasAvatar ? PAD + avR * 2 + 24 : PAD
  const avCx = PAD + avR
  const avCy = 158
  const avatar = hasAvatar
    ? `<clipPath id="ogAvatarClip"><circle cx="${avCx}" cy="${avCy}" r="${avR}" /></clipPath>
<image href="${data.avatarDataUri}" x="${avCx - avR}" y="${avCy - avR}" width="${avR * 2}" height="${avR * 2}" clip-path="url(#ogAvatarClip)" preserveAspectRatio="xMidYMid slice" />
<circle cx="${avCx}" cy="${avCy}" r="${avR}" fill="none" stroke="${theme.accent}" stroke-width="3" />`
    : ''

  // POWER — the share image's headline number, under the tier gem. Gold past 9000.
  const power = data.stats.power
  const powerColor = power >= 9000 ? '#f0b429' : theme.accent
  const powerStr = power.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Inter">
${svgRect(0, 0, W, H, { fill: theme.bg })}
<rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="24" fill="none" stroke="${gemColor}" stroke-width="6" />
${svgText(nameX, 120, 'AI BUILDER', { fontSize: 24, fill: theme.textSecondary, fontWeight: '600' })}
${avatar}
${svgText(nameX, 180, data.username, { fontSize: 56, fill: theme.text, fontWeight: 'bold' })}
${svgText(nameX, 232, data.epithet, { fontSize: 30, fill: theme.accent, fontWeight: '600' })}
${shareStatBar('VELOCITY', data.stats.velocity, 300, theme)}
${shareStatBar('DIVERSITY', data.stats.diversity, 356, theme)}
${shareStatBar('CONSISTENCY', data.stats.consistency, 412, theme)}
<g transform="translate(${W - PAD - 180} 80)">
<polygon points="90,0 180,90 90,180 0,90" fill="${gemColor}" />
${svgText(90, 112, data.stats.grade, { fontSize: 64, fill: '#ffffff', fontWeight: 'bold', anchor: 'middle' })}
</g>
${svgText(W - PAD - 90, 300, 'POWER', { fontSize: 22, fill: theme.textSecondary, fontWeight: '600', anchor: 'middle' })}
${svgText(W - PAD - 90, 356, powerStr, { fontSize: 56, fill: powerColor, fontWeight: 'bold', anchor: 'middle' })}
${svgText(PAD, H - 70, `${data.serial} · ${data.issuedYear} · public · 12wk`, { fontSize: 20, fill: theme.textSecondary })}
${svgText(W - PAD, H - 70, 'PullCard AI', { fontSize: 22, fill: theme.textSecondary, anchor: 'end' })}
</svg>`
}

// Error/empty states on /og must stay 1200x630: svgToPng scales by width only, so a
// vertical error card would rasterize to the wrong aspect ratio while the OGP meta
// advertises 1200x630, cropping/rejecting the preview. Render errors on-canvas.
export function renderOgError(message: string, themeName: string): string {
  const theme = getTheme(themeName)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Inter">
${svgRect(0, 0, W, H, { fill: theme.bg })}
<rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="24" fill="none" stroke="${theme.border}" stroke-width="6" />
${svgText(W / 2, H / 2 - 10, message, { fontSize: 40, fill: theme.text, fontWeight: 'bold', anchor: 'middle' })}
${svgText(W / 2, H / 2 + 44, 'PullCard AI', { fontSize: 24, fill: theme.textSecondary, anchor: 'middle' })}
</svg>`
}
