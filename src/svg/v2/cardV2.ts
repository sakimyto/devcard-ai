import type { CardDataV2 } from '~/analyzers/types'
import { type Theme, getTheme } from '../themes'
import { svgRect, svgText, wrapText } from '../utils'
import { renderArt, renderSparkles } from './art'
import { renderEmblem } from './emblem'
import { TIER_GEM_GRADIENT, renderFrame } from './frame'
import { renderStatGlyph, renderToolIcon } from './icons'
import { renderRadar } from './radar'

// Icon color per tool: the saturated brand color reads on the badge fill and gives
// fallback runes enough contrast for the white initial. Accent covers unknown tools.
function iconColor(theme: Theme, toolId: string): string {
  return theme.toolColors[toolId]?.[0] ?? theme.accent
}

export const CARD_W = 750
export const CARD_H = 1050
const PAD = 44

// Tier gem occupies the top-right corner (left edge at CARD_W - PAD - 92).
// Shrink the nameplate so a max-length (39-char GitHub login) username never
// slides under the gem. Uses an approx bold-glyph advance of 0.58em; short
// names stay at the 42px hero size.
const NAME_MAX_WIDTH = CARD_W - PAD - 92 - 16 - PAD // 554px, name x=PAD → gem
function nameFontSize(len: number): number {
  const fit = Math.floor(NAME_MAX_WIDTH / (Math.max(1, len) * 0.58))
  return Math.max(20, Math.min(42, fit))
}

// Thousands separator without Intl (deterministic across runtimes): 6340 → "6,340".
function withCommas(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// Small filled diamond marker for the derived radar axes (SYNERGY/RANGE/FLOW) that
// have no hand-drawn glyph. Centered in a size×size box at (x, y).
function miniDiamond(x: number, y: number, size: number, color: string): string {
  const c = size / 2
  const s = size * 0.62
  return `<rect x="${x + c - s / 2}" y="${y + c - s / 2}" width="${s}" height="${s}" rx="1.5" fill="${color}" transform="rotate(45 ${x + c} ${y + c})" />`
}

// One row of the numeric stat column: marker + label (left) and value (right-aligned).
function statRow(
  label: string,
  value: number,
  y: number,
  theme: Theme,
  marker: 'velocity' | 'diversity' | 'consistency' | 'dot',
): string {
  const ICON_X = PAD + 316 // numeric column sits to the right of the radar
  const LABEL_X = ICON_X + 26
  const VAL_X = CARD_W - PAD
  const glyph =
    marker === 'dot'
      ? miniDiamond(ICON_X, y - 14, 16, theme.accent)
      : renderStatGlyph(marker, ICON_X, y - 14, 16, theme.accent)
  return `${glyph}
${svgText(LABEL_X, y, label, { fontSize: 16, fill: theme.textSecondary, fontWeight: '600' })}
${svgText(VAL_X, y, String(value), { fontSize: 20, fill: theme.text, fontWeight: 'bold', anchor: 'end' })}`
}

// Faceted tier gem: jewel-gradient body, a diagonal cut cross, a bright upper-left
// specular facet, and inner/edge outlines so it reads as cut crystal, not a flat rhombus.
function tierGem(grade: CardDataV2['stats']['grade'], x: number, y: number): string {
  const size = 92
  const half = size / 2
  const diamond = `${half},0 ${size},${half} ${half},${size} 0,${half}`
  // S/A gems get a subtle specular shimmer; lower tiers stay static.
  const pulse =
    grade === 'S' || grade === 'A'
      ? '<animate attributeName="fill-opacity" values="0.42;0.72;0.42" dur="3.5s" repeatCount="indefinite" />'
      : ''
  return `<g transform="translate(${x} ${y})">
<polygon points="${diamond}" fill="url(#gemGrad)" />
<polygon points="${half},0 0,${half} ${half},${half}" fill="#ffffff" fill-opacity="0.42">${pulse}</polygon>
<line x1="${half}" y1="0" x2="${half}" y2="${size}" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1" />
<line x1="0" y1="${half}" x2="${size}" y2="${half}" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1" />
<polygon points="${half},8 ${size - 8},${half} ${half},${size - 8} 8,${half}" fill="none" stroke="#ffffff" stroke-opacity="0.3" stroke-width="1.5" />
<polygon points="${diamond}" fill="none" stroke="#000000" stroke-opacity="0.25" stroke-width="1.5" />
${svgText(half, half + 12, grade, { fontSize: 34, fill: '#ffffff', fontWeight: 'bold', anchor: 'middle' })}
</g>`
}

export function renderCardV2(data: CardDataV2, options: { theme: string }): string {
  const theme = getTheme(options.theme)
  const { defs, frame } = renderFrame(data.stats.grade, CARD_W, CARD_H)

  // Jewel gradient for the tier gem + subtle raised gradient for the nameplate.
  const [g0, g1, g2] = TIER_GEM_GRADIENT[data.stats.grade]
  const cardDefs = `<linearGradient id="gemGrad" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="${g0}" />
<stop offset="50%" stop-color="${g1}" />
<stop offset="100%" stop-color="${g2}" />
</linearGradient>
<linearGradient id="plateGrad" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="${theme.headerBg}" />
<stop offset="100%" stop-color="${theme.bg}" />
</linearGradient>
<clipPath id="cardClip"><rect x="0" y="0" width="${CARD_W}" height="${CARD_H}" rx="36" /></clipPath>
<filter id="cardGrain" x="0%" y="0%" width="100%" height="100%">
<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" stitchTiles="stitch" result="n" />
<feColorMatrix in="n" type="saturate" values="0" result="g" />
<feComponentTransfer in="g"><feFuncA type="linear" slope="0.5" /></feComponentTransfer>
</filter>`
  // Full-card film grain: monochrome fractal noise at very low opacity — felt, not seen.
  // Clipped to the rounded card so corners stay clean; sits above the art but below text.
  const grain = `<g clip-path="url(#cardClip)"><rect x="0" y="0" width="${CARD_W}" height="${CARD_H}" filter="url(#cardGrain)" opacity="0.038" /></g>`

  // --- name plate (embossed panel behind the identity block) ---
  const plate = `<rect x="28" y="64" width="548" height="82" rx="14" fill="url(#plateGrad)" />
<rect x="28" y="64" width="548" height="82" rx="14" fill="none" stroke="${theme.border}" stroke-opacity="0.6" stroke-width="1" />
<line x1="42" y1="65.5" x2="562" y2="65.5" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1" />`
  const namePlate = `${plate}
${svgText(PAD, 84, 'AI BUILDER', { fontSize: 16, fill: theme.textSecondary, fontWeight: '600' })}
${svgText(PAD, 128, data.username, { fontSize: nameFontSize(data.username.length), fill: theme.text, fontWeight: 'bold' })}`

  // --- archetype row ---
  const archetypeY = 156
  const emblem = renderEmblem(data.pattern.pattern, PAD, archetypeY, 30, theme.accent)
  const archetypeLabel = svgText(PAD + 40, archetypeY + 23, data.pattern.pattern, {
    fontSize: 22,
    fill: theme.accent,
    fontWeight: '600',
  })
  const verified = data.toolAttribution.verified
    ? `${svgText(PAD + 40 + data.pattern.pattern.length * 12 + 24, archetypeY + 23, '✓ verified', { fontSize: 16, fill: theme.textSecondary })}`
    : ''

  // --- art area ---
  const artY = 210
  const artH = 240
  const artW = CARD_W - PAD * 2
  const sparkles =
    data.stats.grade === 'S' ? renderSparkles(data.seed, artW, artH, theme.accent) : ''
  const art = `<clipPath id="artClip"><rect x="${PAD}" y="${artY}" width="${artW}" height="${artH}" rx="18" /></clipPath>
<g clip-path="url(#artClip)"><g transform="translate(${PAD} ${artY})">${renderArt({
    seed: data.seed,
    width: artW,
    height: artH,
    accent: theme.accent,
    bg: theme.headerBg,
  })}
${sparkles}</g></g>
<rect x="${PAD}" y="${artY}" width="${artW}" height="${artH}" rx="18" fill="none" stroke="${theme.border}" />`

  // --- avatar medallion (centered over the art) ---
  const medCx = CARD_W / 2
  const medCy = artY + artH / 2
  const medR = 56
  const medallion = data.avatarDataUri
    ? `<clipPath id="avatarClip"><circle cx="${medCx}" cy="${medCy}" r="${medR}" /></clipPath>
<image href="${data.avatarDataUri}" x="${medCx - medR}" y="${medCy - medR}" width="${medR * 2}" height="${medR * 2}" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice" />
<circle cx="${medCx}" cy="${medCy}" r="${medR}" fill="none" stroke="${theme.accent}" stroke-width="3" />
<circle cx="${medCx}" cy="${medCy}" r="${medR + 2.5}" fill="none" stroke="#000000" stroke-opacity="0.4" stroke-width="1" />`
    : ''

  // --- stats: 6-axis radar (left) + numeric column (right) + POWER headline ---
  const statsHeaderY = 486
  const power = data.stats.power
  const powerColor = power >= 9000 ? '#f0b429' : theme.accent
  const radar = renderRadar(
    [
      { label: 'VELOCITY', value: data.stats.velocity },
      { label: 'DIVERSITY', value: data.stats.diversity },
      { label: 'SYNERGY', value: data.stats.synergy },
      { label: 'CONSISTENCY', value: data.stats.consistency },
      { label: 'RANGE', value: data.stats.range },
      { label: 'FLOW', value: data.stats.flow },
    ],
    200,
    588,
    82,
    theme,
  )
  const stats = `${svgText(PAD, statsHeaderY, 'STATS', { fontSize: 15, fill: theme.textSecondary, fontWeight: '600' })}
${svgText(CARD_W - PAD, statsHeaderY - 20, 'POWER', { fontSize: 13, fill: theme.textSecondary, fontWeight: '600', anchor: 'end' })}
${svgText(CARD_W - PAD, statsHeaderY + 8, withCommas(power), { fontSize: 30, fill: powerColor, fontWeight: 'bold', anchor: 'end' })}
${radar}
${statRow('VELOCITY', data.stats.velocity, 512, theme, 'velocity')}
${statRow('DIVERSITY', data.stats.diversity, 542, theme, 'diversity')}
${statRow('SYNERGY', data.stats.synergy, 572, theme, 'dot')}
${statRow('CONSISTENCY', data.stats.consistency, 602, theme, 'consistency')}
${statRow('RANGE', data.stats.range, 632, theme, 'dot')}
${statRow('FLOW', data.stats.flow, 662, theme, 'dot')}`

  // --- tool loadout ---
  const toolsY = 716
  const CHIP_ROW_RIGHT = CARD_W - PAD // 706: chips must not cross this edge
  const CHIP_H = 36
  const ICON = 12
  const ICON_X = 12 // left padding before icon
  const ICON_GAP = 6 // gap between icon and label
  const TEXT_X = ICON_X + ICON + ICON_GAP // where left-aligned label starts
  const toolChips: string[] = []
  let chipX = PAD
  // Drop priority: committed > assisted > equipped. Chips are laid out in that
  // order and the row stops entirely at the first chip that would cross the right
  // edge, so a lower-priority chip never takes the place of a dropped higher one.
  let rowFull = false
  const place = (cw: number, render: () => string): void => {
    if (rowFull) return
    if (chipX + cw > CHIP_ROW_RIGHT) {
      rowFull = true
      return
    }
    toolChips.push(render())
    chipX += cw + 12
  }
  // Icon-bearing chip (committed / assisted): left-aligned icon + label, solid fill.
  const iconChip = (toolId: string, label: string, charW: number, textColor: string): void => {
    const cw = TEXT_X + Math.ceil(label.length * charW) + 12
    const startX = chipX
    place(
      cw,
      () =>
        `${svgRect(startX, toolsY, cw, CHIP_H, { fill: theme.badgeBg, rx: 18 })}
${renderToolIcon(toolId, startX + ICON_X, toolsY + (CHIP_H - ICON) / 2, ICON, iconColor(theme, toolId))}
${svgText(startX + TEXT_X, toolsY + 24, label, { fontSize: 16, fill: textColor, fontWeight: '600', anchor: 'start' })}`,
    )
  }
  for (const t of data.toolAttribution.tools.slice(0, 3)) {
    iconChip(t.toolId, `${t.toolName} ${Math.round(t.percentage)}%`, 9, theme.text)
  }
  for (const a of data.toolAttribution.assisted.slice(0, 2)) {
    iconChip(a.toolId, `${a.toolName} · assisted`, 8.5, theme.textSecondary)
  }
  const shownIds = new Set([
    ...data.toolAttribution.tools.map((t) => t.toolId),
    ...data.toolAttribution.assisted.map((a) => a.toolId),
  ])
  for (const e of data.equipped.equipped.filter((e) => !shownIds.has(e.toolId)).slice(0, 2)) {
    const label = `${e.toolName} · equipped`
    const cw = 24 + label.length * 10
    const startX = chipX
    place(
      cw,
      () =>
        `<rect x="${startX}" y="${toolsY}" width="${cw}" height="36" rx="18" fill="none" stroke="${theme.accent}" stroke-opacity="0.5" stroke-dasharray="4 3" />
${svgText(startX + cw / 2, toolsY + 24, label, { fontSize: 15, fill: theme.textSecondary, anchor: 'middle' })}`,
    )
  }
  const loadout = `${svgText(PAD, toolsY - 14, 'LOADOUT', { fontSize: 15, fill: theme.textSecondary, fontWeight: '600' })}
${toolChips.length > 0 ? toolChips.join('\n') : svgText(PAD, toolsY + 24, 'no tools detected yet', { fontSize: 16, fill: theme.textSecondary })}`

  // --- languages ---
  const langY = 812
  const langItems = data.languages.languages
    .map((l, i) => {
      const x = PAD + i * 180
      return `<circle cx="${x + 8}" cy="${langY + 18}" r="7" fill="${l.color}" />
${svgText(x + 24, langY + 24, l.name, { fontSize: 18, fill: theme.text })}`
    })
    .join('\n')
  const langs = `${svgText(PAD, langY, 'TYPES', { fontSize: 15, fill: theme.textSecondary, fontWeight: '600' })}
${data.languages.languages.length > 0 ? langItems : svgText(PAD, langY + 24, '—', { fontSize: 16, fill: theme.textSecondary })}`

  // --- flavor ---
  const flavorY = 900
  const flavorLines = wrapText(data.flavor, 46, 2)
  const flavor = flavorLines
    .map((line, i) =>
      svgText(CARD_W / 2, flavorY + i * 28, line, {
        fontSize: 19,
        fill: theme.textSecondary,
        anchor: 'middle',
      }),
    )
    .join('\n')
  const flavorRule = `<line x1="${PAD + 60}" y1="${flavorY - 30}" x2="${CARD_W - PAD - 60}" y2="${flavorY - 30}" stroke="${theme.border}" stroke-width="1" />`

  // --- footer ---
  const footer = `${svgText(PAD, CARD_H - 40, `${data.serial} · ${data.issuedYear} · public · 12wk`, { fontSize: 15, fill: theme.textSecondary })}
${svgText(CARD_W - PAD, CARD_H - 40, 'devcard-ai', { fontSize: 15, fill: theme.textSecondary, anchor: 'end' })}`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
<defs>${defs}${cardDefs}</defs>
${svgRect(0, 0, CARD_W, CARD_H, { fill: theme.bg, rx: 36 })}
${grain}
${frame}
${namePlate}
${emblem}
${archetypeLabel}
${verified}
${art}
${medallion}
${stats}
${loadout}
${langs}
${flavorRule}
${flavor}
${tierGem(data.stats.grade, CARD_W - PAD - 92, 56)}
${footer}
</svg>`
}

export function renderPlaceholderCard(username: string, themeName: string): string {
  const theme = getTheme(themeName)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
${svgRect(0, 0, CARD_W, CARD_H, { fill: theme.bg, rx: 36 })}
<rect x="10" y="10" width="${CARD_W - 20}" height="${CARD_H - 20}" rx="28" fill="none" stroke="${theme.border}" stroke-width="6" stroke-dasharray="10 8" />
${svgText(CARD_W / 2, CARD_H / 2 - 20, 'Summoning…', { fontSize: 34, fill: theme.text, fontWeight: 'bold', anchor: 'middle' })}
${svgText(CARD_W / 2, CARD_H / 2 + 24, `${username}'s card is being drawn`, { fontSize: 18, fill: theme.textSecondary, anchor: 'middle' })}
${svgText(CARD_W / 2, CARD_H - 48, 'devcard-ai', { fontSize: 15, fill: theme.textSecondary, anchor: 'middle' })}
</svg>`
}
