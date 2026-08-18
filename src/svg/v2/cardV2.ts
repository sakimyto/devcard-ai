import type { CardDataV2 } from '~/analyzers/types'
import { glowLabel, normalizeGlow } from '~/card/customization'
import { type Theme, getTheme } from '../themes'
import { escapeXml, svgRect, svgText, wrapText } from '../utils'
import { renderArt, renderSparkles } from './art'
import { renderEmblem } from './emblem'
import { renderFrame } from './frame'
import { renderElementGlyph, renderStatGlyph, renderToolIcon } from './icons'
import { renderRadar } from './radar'

// Icon color per tool: the saturated brand color reads on the badge fill and gives
// fallback runes enough contrast for the white initial. Accent covers unknown tools.
function iconColor(theme: Theme, toolId: string): string {
  return theme.toolColors[toolId]?.[0] ?? theme.accent
}

export const CARD_W = 750
export const CARD_H = 1050
const PAD = 44

// POWER sits at the HP position on the nameplate (top-right), so the username shares
// its row with the POWER block. The name
// must clear the POWER block's left edge; nameFontSize takes the available width and
// shrinks a long login to fit. Uses an approx bold-glyph advance of 0.58em; short
// names stay at the 42px hero size. Min 17 keeps the 39-char worst case (max-length
// login + a 6-digit gold POWER) from ever crossing into the number.
function nameFontSize(len: number, maxWidth: number): number {
  const fit = Math.floor(maxWidth / (Math.max(1, len) * 0.58))
  return Math.max(17, Math.min(42, fit))
}

// Markers for the RECORD strip. Emoji render as flat monochrome glyphs in GitHub's SVG
// rasterizer (no color font), so plain text markers read crisper and more on-brand than
// ⚔/🔥 — chosen after side-by-side qlmanage inspection.
const RECORD_GLYPH = '›'
const STREAK_GLYPH = '▲'

// Thousands separator without Intl (deterministic across runtimes): 6340 → "6,340".
function withCommas(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// Pulls the headline number out of a trait proof so it can render big and right-aligned
// like an attack's damage number. Takes the FIRST number and its immediately-following
// unit: `65%`→"65%", `7-day`/`5 days`→"7d"/"5d", `12 weeks`→"12w", plain→the number.
// Proofs with no number (e.g. "Ships mostly bare-handed") yield null → no right value.
function traitMainValue(proof: string): string | null {
  const m = proof.match(/(\d[\d,]*)(%|[\s-]days?\b|\s*weeks?\b)?/)
  if (!m) return null
  const n = m[1]
  const u = m[2] ?? ''
  if (u.includes('%')) return `${n}%`
  if (/day/.test(u)) return `${n}d`
  if (/week/.test(u)) return `${n}w`
  return n
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
  const ICON_X = PAD + 324 // numeric column sits to the right of the radar (≥24px clear of its labels)
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

export function renderCardV2(data: CardDataV2, options: { theme: string; glow?: string }): string {
  const theme = getTheme(options.theme)
  const glow = normalizeGlow(options.glow)
  const { defs, frame } = renderFrame(glow, CARD_W, CARD_H, theme.accent)

  const cardDefs = `<linearGradient id="plateGrad" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="${theme.headerBg}" />
<stop offset="100%" stop-color="${theme.bg}" />
</linearGradient>
<clipPath id="cardClip"><rect x="0" y="0" width="${CARD_W}" height="${CARD_H}" rx="36" /></clipPath>
<filter id="cardGrain" x="0%" y="0%" width="100%" height="100%">
<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" stitchTiles="stitch" result="n" />
<feColorMatrix in="n" type="saturate" values="0" result="g" />
<feComponentTransfer in="g"><feFuncA type="linear" slope="0.5" /></feComponentTransfer>
</filter>
<filter id="powerGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.5" /></filter>
<radialGradient id="energyGrad" cx="34%" cy="28%" r="70%">
<stop offset="0%" stop-color="#ffffff" stop-opacity="0.92" />
<stop offset="26%" stop-color="${data.element.color}" />
<stop offset="100%" stop-color="${data.element.color}" />
</radialGradient>`
  // Full-card film grain: monochrome fractal noise at very low opacity — felt, not seen.
  // Clipped to the rounded card so corners stay clean; sits above the art but below text.
  const grain = `<g clip-path="url(#cardClip)"><rect x="0" y="0" width="${CARD_W}" height="${CARD_H}" filter="url(#cardGrain)" opacity="0.038" /></g>`

  // --- name plate (embossed panel behind the identity block) ---
  // POWER lives here now, at the Pokémon HP position: label on the AI BUILDER line,
  // big number on the username baseline, both right-aligned at the plate's inner edge
  // Gold past 9000, with a soft glow halo on the number.
  const power = data.stats.power
  const powerColor = power >= 9000 ? '#f0b429' : theme.accent
  const powerStr = withCommas(power)
  const POWER_RIGHT = CARD_W - PAD
  const POWER_NUM_SIZE = 32
  const powerNumW = Math.ceil(powerStr.length * POWER_NUM_SIZE * 0.6)
  // Name shares the row with POWER: available width runs from the name origin to the
  // POWER block's left edge, less an 18px gap.
  const nameMaxW = POWER_RIGHT - powerNumW - 18 - PAD
  const powerGlow =
    power >= 9000
      ? `<text x="${POWER_RIGHT}" y="128" font-size="${POWER_NUM_SIZE}" fill="${powerColor}" font-weight="bold" text-anchor="end" opacity="0.55" filter="url(#powerGlow)">${powerStr}</text>`
      : ''
  const plate = `<rect x="28" y="64" width="694" height="82" rx="14" fill="url(#plateGrad)" />
<rect x="28" y="64" width="694" height="82" rx="14" fill="none" stroke="${theme.border}" stroke-opacity="0.6" stroke-width="1" />
<line x1="42" y1="65.5" x2="708" y2="65.5" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1" />`
  const namePlate = `${plate}
${svgText(PAD, 84, 'AI BUILDER', { fontSize: 16, fill: theme.textSecondary, fontWeight: '600' })}
<text x="${POWER_RIGHT}" y="84" font-size="12" fill="${theme.textSecondary}" font-weight="600" text-anchor="end" letter-spacing="2" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">POWER</text>
${powerGlow}
${svgText(POWER_RIGHT, 128, powerStr, { fontSize: POWER_NUM_SIZE, fill: powerColor, fontWeight: 'bold', anchor: 'end' })}
${svgText(PAD, 128, data.username, { fontSize: nameFontSize(data.username.length, nameMaxW), fill: theme.text, fontWeight: 'bold' })}`

  // --- archetype row: emblem + epithet name + ✓verified + element chip ---
  // The emblem still reflects the internal PatternType (retained for flavor), but the
  // visible label is now the epithet; the old class label ('Pair Programmer' etc.) is gone.
  const archetypeY = 156
  const rowTextY = archetypeY + 23
  const emblem = renderEmblem(data.pattern.pattern, PAD, archetypeY, 30, theme.accent)
  const epithetX = PAD + 40
  const archetypeLabel = svgText(epithetX, rowTextY, data.epithet, {
    fontSize: 22,
    fill: theme.accent,
    fontWeight: '600',
  })
  // Advance estimate for the 22px bold epithet (~12px/char), matching the prior layout math.
  const afterEpithetX = epithetX + data.epithet.length * 12 + 24
  // `verified+` (with the private-inclusion mark) when the card also reflects private repos;
  // otherwise the plain `verified`. The trailing `+` stays within the 96px chip allowance.
  const verifiedLabel = data.includesPrivate ? '✓ verified+' : '✓ verified'
  const verified = data.toolAttribution.verified
    ? svgText(afterEpithetX, rowTextY, verifiedLabel, { fontSize: 16, fill: theme.textSecondary })
    : ''
  // Energy symbol: a round element-colored token (radial gradient + top-left specular
  // + white glyph), like a Pokémon energy pip, with a short label to its right. Sits
  // after verified; epithets are short and this row is clear of the 39-char nameplate.
  const chipStartX = afterEpithetX + (data.toolAttribution.verified ? 96 : 0)
  const elLabel = data.element.label
  const enR = 14
  const enCx = chipStartX + enR
  const enCy = archetypeY + 17 // centers the token on the epithet/verified row baseline
  const enGlyph = 18
  // Glossy energy pip: radial body, dark rim for a printed edge, a soft top-left specular
  // plus a small bright catch-light (top light source), the white element glyph, and a
  // faint lower-inner shade so the disc reads as a dome rather than a flat circle.
  const energyMark = `<circle cx="${enCx}" cy="${enCy}" r="${enR}" fill="url(#energyGrad)" />
<path d="M ${enCx - enR + 2} ${enCy + 3} A ${enR - 2} ${enR - 2} 0 0 0 ${enCx + enR - 2} ${enCy + 3}" fill="none" stroke="#000000" stroke-opacity="0.18" stroke-width="2.5" />
<circle cx="${enCx}" cy="${enCy}" r="${enR}" fill="none" stroke="#000000" stroke-opacity="0.25" stroke-width="1" />
<ellipse cx="${enCx - 4}" cy="${enCy - 5}" rx="6.5" ry="4.5" fill="#ffffff" fill-opacity="0.45" />
<circle cx="${enCx - 6}" cy="${enCy - 6}" r="1.6" fill="#ffffff" fill-opacity="0.9" />
${renderElementGlyph(data.element.id, enCx - enGlyph / 2, enCy - enGlyph / 2, enGlyph, '#ffffff')}
${svgText(enCx + enR + 8, rowTextY, elLabel, { fontSize: 15, fill: theme.text, fontWeight: '600', anchor: 'start' })}`

  // --- art area ---
  const artY = 210
  const artH = 220 // shrunk 20px vs v2.6 to free vertical budget for the CONTRIBUTIONS graph
  const artW = CARD_W - PAD * 2
  const sparkles = glow === 'holo' ? renderSparkles(data.seed, artW, artH, theme.accent) : ''
  const artFrameStroke =
    glow === 'holo' ? 'url(#holoGrad)' : glow === 'none' ? theme.border : theme.accent
  const art = `<clipPath id="artClip"><rect x="${PAD}" y="${artY}" width="${artW}" height="${artH}" rx="18" /></clipPath>
<g clip-path="url(#artClip)"><g transform="translate(${PAD} ${artY})">${renderArt({
    seed: data.seed,
    width: artW,
    height: artH,
    accent: theme.accent,
    bg: theme.headerBg,
  })}
${sparkles}</g></g>
<rect x="${PAD}" y="${artY}" width="${artW}" height="${artH}" rx="18" fill="none" stroke="${theme.border}" />
<rect x="${PAD + 4}" y="${artY + 4}" width="${artW - 8}" height="${artH - 8}" rx="14" fill="none" stroke="${artFrameStroke}" stroke-opacity="0.85" stroke-width="1.5" />
<rect x="${PAD + 5.5}" y="${artY + 5.5}" width="${artW - 11}" height="${artH - 11}" rx="13" fill="none" stroke="#000000" stroke-opacity="0.25" stroke-width="1" />
<line x1="${PAD + 14}" y1="${artY + 5}" x2="${CARD_W - PAD - 14}" y2="${artY + 5}" stroke="#ffffff" stroke-opacity="0.3" stroke-width="1" />`

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

  // --- stats: 6-axis radar (left) + numeric column (right) ---
  // POWER now lives on the nameplate (HP position), so the STATS header is just its
  // label and the numeric column reads clean.
  const statsHeaderY = 466
  const radar = renderRadar(
    [
      { label: 'VELOCITY', value: data.stats.velocity },
      { label: 'DIVERSITY', value: data.stats.diversity },
      { label: 'SYNERGY', value: data.stats.synergy },
      { label: 'CONSISTENCY', value: data.stats.consistency },
      { label: 'RANGE', value: data.stats.range },
      { label: 'FLOW', value: data.stats.flow },
    ],
    188,
    568,
    82,
    theme,
  )
  const stats = `${svgText(PAD, statsHeaderY, 'STATS', { fontSize: 15, fill: theme.textSecondary, fontWeight: '600' })}
${radar}
${statRow('VELOCITY', data.stats.velocity, 492, theme, 'velocity')}
${statRow('DIVERSITY', data.stats.diversity, 522, theme, 'diversity')}
${statRow('SYNERGY', data.stats.synergy, 552, theme, 'dot')}
${statRow('CONSISTENCY', data.stats.consistency, 582, theme, 'consistency')}
${statRow('RANGE', data.stats.range, 612, theme, 'dot')}
${statRow('FLOW', data.stats.flow, 642, theme, 'dot')}`

  // --- tool loadout ---
  const toolsY = 696
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
    // assisted は件数を定量表示（`Codex x17`）。count==1 も `x1` で統一。
    // 乗算記号は ASCII 'x' を使う（同梱サブセットフォントに × U+00D7 が無く、
    // resvg は loadSystemFonts:false で描画するため未収録字は空白になる）
    iconChip(a.toolId, `${a.toolName} x${a.count}`, 9, theme.textSecondary)
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

  // --- languages (TYPES) — byte-share stacked bar + legend (summary-cards style) ---
  // One content-width bar split by language colour (segment width = that language's byte %),
  // with a muted "others" tail, then a legend of the top 3-4. Everything stays inside the
  // original TYPES band (label y780 → legend y812) so it never crowds the EXP strip at y852.
  const langY = 780
  const shares = data.languages.languages
  const hasLangs = shares.length > 0
  const BAR_X = PAD
  const BAR_Y = 786
  const BAR_W = CARD_W - PAD * 2
  const BAR_H = 10
  const OTHERS_COLOR = theme.textSecondary
  // Stack segments left→right; each width = barW * pct/100. Segment coords use toFixed(2)
  // (the track keeps integer constants, which also distinguishes it from segments).
  let cursor = BAR_X
  const seg = (pct: number, fill: string): string => {
    const w = (BAR_W * pct) / 100
    if (w <= 0) return ''
    const rect = `<rect x="${cursor.toFixed(2)}" y="${BAR_Y.toFixed(2)}" width="${w.toFixed(2)}" height="${BAR_H.toFixed(2)}" fill="${fill}" />`
    cursor += w
    return rect
  }
  const segments = [
    ...shares.map((l) => seg(l.percentage, l.color)),
    seg(data.languages.othersPercentage, OTHERS_COLOR),
  ]
    .filter((s) => s !== '')
    .join('\n')
  // Rounded ends via a clip (same pattern as the art/avatar clips). A faint full-width track
  // sits under the segments so the rounded silhouette reads even when segments don't fill it.
  const bar = `<clipPath id="langBarClip"><rect x="${BAR_X}" y="${BAR_Y}" width="${BAR_W}" height="${BAR_H}" rx="5" /></clipPath>
<g clip-path="url(#langBarClip)"><rect x="${BAR_X}" y="${BAR_Y}" width="${BAR_W}" height="${BAR_H}" fill="${OTHERS_COLOR}" fill-opacity="0.25" />
${segments}</g>`
  // Legend: `● Name NN%` for the top 3-4 — dot in the language colour, % in the muted tone.
  const LEGEND_Y = 812
  const legendFont = shares.length >= 4 ? 12 : 13
  const legendItems = shares
    .slice(0, 4)
    .map(
      (l) =>
        `<tspan fill="${l.color}" font-size="${legendFont}">●</tspan><tspan fill="${theme.text}" font-size="${legendFont}"> ${escapeXml(l.name)} </tspan><tspan fill="${theme.textSecondary}" font-size="${legendFont}">${l.percentage}%</tspan>`,
    )
    .join(`<tspan fill="${theme.textSecondary}" font-size="${legendFont}"> · </tspan>`)
  const legend = `<text x="${PAD}" y="${LEGEND_Y}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">${legendItems}</text>`
  const langs = `${svgText(PAD, langY, 'TYPES', { fontSize: 15, fill: theme.textSecondary, fontWeight: '600' })}
${hasLangs ? `${bar}\n${legend}` : svgText(PAD, BAR_Y + 18, '—', { fontSize: 16, fill: theme.textSecondary })}`

  // --- record strip (EXP / commit·pr·review counts / streak) ---
  // Occupies the band y 820-858 between TYPES and the CONTRIBUTIONS graph. Display-only:
  // never feeds POWER. All values arrive as numbers, so no injection surface.
  const rec = data.record
  // ラベル「RECORD」は撤去（EXP/counts/streak で自明。TYPES 行との窮屈さ解消を優先）
  const recRowY = 852
  const expStr = withCommas(rec.exp)
  const expNumX = PAD + 40
  const expNumW = Math.ceil(expStr.length * 16.8) // ~0.6em advance at 28px bold
  const inclPrivate = rec.inclPrivate
    ? svgText(expNumX + expNumW + 8, recRowY - 13, 'incl. private', {
        fontSize: 11,
        fill: theme.textSecondary,
      })
    : ''
  const counts = `${RECORD_GLYPH} ${rec.commits}c · ${rec.prs}pr · ${rec.reviews}rev`
  const streakText =
    rec.currentStreak > 0
      ? `${STREAK_GLYPH} ${rec.currentStreak}d streak`
      : rec.longestStreak > 0
        ? `${STREAK_GLYPH} best ${rec.longestStreak}d`
        : ''
  const record = `${svgText(PAD, recRowY, 'EXP', { fontSize: 13, fill: theme.textSecondary, fontWeight: '600' })}
${svgText(expNumX, recRowY, expStr, { fontSize: 28, fill: theme.accent, fontWeight: 'bold' })}
${inclPrivate}
${svgText(CARD_W / 2 + 30, recRowY, counts, { fontSize: 13, fill: theme.textSecondary, anchor: 'middle' })}
${streakText ? svgText(CARD_W - PAD, recRowY, streakText, { fontSize: 13, fill: theme.textSecondary, anchor: 'end' }) : ''}`

  // --- contributions graph (52-week, 1y) — display-only activity log ---
  // Sits between the RECORD strip and TRAITS. Independent of the 12-week metric window
  // (labeled `· 1y` on the card); never feeds POWER. 52 upward bars grow from a
  // baseline; heights use a sqrt scale so a single busy week doesn't crush the rest, and the
  // current (rightmost) week is drawn at full opacity with a 1px outline to read as "now".
  const CONTRIB_BASE_Y = 928 // baseline the bars grow up from
  const CONTRIB_LABEL_Y = 886
  const BAR_MIN_H = 4
  const BAR_MAX_H = 32
  const graphW = CARD_W - PAD * 2
  const barSlot = graphW / 52
  const barW = barSlot - 1 // 1px gap between bars
  const weekly = data.record.weeklyContributions
  const maxWeek = Math.max(0, ...weekly)
  const bars = weekly
    .map((v, i) => {
      const norm = maxWeek > 0 ? Math.sqrt(Math.max(0, v)) / Math.sqrt(maxWeek) : 0
      const h = maxWeek > 0 ? BAR_MIN_H + norm * (BAR_MAX_H - BAR_MIN_H) : BAR_MIN_H
      const x = PAD + i * barSlot
      const y = CONTRIB_BASE_Y - h
      const isCurrent = i === weekly.length - 1
      const opacity = isCurrent ? 1 : 0.35 + norm * 0.55 // value-proportional 0.35→0.9
      const base = `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barW.toFixed(2)}" height="${h.toFixed(2)}" rx="1" fill="${theme.accent}" fill-opacity="${opacity.toFixed(2)}" />`
      // The current week gets a crisp 1px accent outline so "now" stands out even when small.
      const nowRing = isCurrent
        ? `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barW.toFixed(2)}" height="${h.toFixed(2)}" rx="1" fill="none" stroke="${theme.accent}" stroke-width="1" />`
        : ''
      return base + nowRing
    })
    .join('\n')
  const contrib = `${svgText(PAD, CONTRIB_LABEL_Y, 'CONTRIBUTIONS · 1y', { fontSize: 15, fill: theme.textSecondary, fontWeight: '600' })}
${svgText(CARD_W - PAD, CONTRIB_LABEL_Y, `${withCommas(data.record.yearTotal)} total`, { fontSize: 13, fill: theme.textSecondary, anchor: 'end' })}
${bars}`

  // --- traits (activated abilities) — replaces the flavor block ---
  // Pokémon 技-row format: `◆ {name} — {proof}` left-aligned, with the proof's headline
  // number pulled out big and right-aligned at the card edge (the attack's damage number).
  // Lines at y952/980 — the second clears the footer baseline (y1010) by 30px so the 17px
  // trait text never crowds it. When no trait fires, the legacy flavor line renders instead
  // (backward-compatible). ◆/• are text glyphs (crisp in GitHub's SVG rasterizer), never emoji.
  const flavorY = 952
  const traitFont = 'font-family="-apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif"'
  const traitLine = (name: string, proof: string, y: number): string => {
    const val = traitMainValue(proof)
    const num = val
      ? `<text x="${CARD_W - PAD}" y="${y + 1}" text-anchor="end" ${traitFont} font-size="22" fill="${theme.accent}" font-weight="bold">${escapeXml(val)}</text>
<line x1="${CARD_W - PAD - 100}" y1="${y - 5}" x2="${CARD_W - PAD - Math.ceil(val.length * 13) - 10}" y2="${y - 5}" stroke="${theme.textSecondary}" stroke-opacity="0.35" stroke-width="1" stroke-dasharray="1.5 3.5" />`
      : ''
    return `<text x="${PAD}" y="${y}" ${traitFont}><tspan font-size="17" fill="${theme.accent}" font-weight="bold">◆ ${escapeXml(name)}</tspan><tspan font-size="15" fill="${theme.textSecondary}"> — ${escapeXml(proof)}</tspan></text>
${num}`
  }
  let flavor: string
  if (data.traits.length > 0) {
    flavor = data.traits.map((t, i) => traitLine(t.name, t.proof, flavorY + i * 28)).join('\n')
  } else {
    flavor = wrapText(data.flavor, 46, 2)
      .map((line, i) =>
        svgText(CARD_W / 2, flavorY + i * 28, line, {
          fontSize: 19,
          fill: theme.textSecondary,
          anchor: 'middle',
        }),
      )
      .join('\n')
  }

  // --- footer ---
  // Card-number line (left): `No.7F3A · S1 ’26 · public 12wk` — serial without the #,
  // a fixed Season 1 tag, and the two-digit issue year. When private repos are included the
  // window token becomes `all repos · 12wk` (honest label — the card is no longer public-only).
  // The chosen finish is named in the footer so the treatment is not communicated by color alone.
  const footerY = CARD_H - 40
  const serialNo = data.serial.replace(/^#/, '')
  const yy = String(data.issuedYear).slice(-2)
  const scopeLabel = data.includesPrivate ? 'all repos · 12wk' : 'public 12wk'
  const finishRight = CARD_W - PAD - 104
  const finish = svgText(finishRight, footerY, glowLabel(glow), {
    fontSize: 13,
    fill: theme.accent,
    fontWeight: '600',
    anchor: 'end',
  })
  const footer = `${svgText(PAD, footerY, `No.${serialNo} · S1 ’${yy} · ${scopeLabel}`, { fontSize: 15, fill: theme.textSecondary })}
${finish}
${svgText(CARD_W - PAD, footerY, 'PullCard AI', { fontSize: 15, fill: theme.textSecondary, anchor: 'end' })}`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
<defs>${defs}${cardDefs}</defs>
${svgRect(0, 0, CARD_W, CARD_H, { fill: theme.bg, rx: 36 })}
${grain}
${frame}
${namePlate}
${emblem}
${archetypeLabel}
${verified}
${energyMark}
${art}
${medallion}
${stats}
${loadout}
${langs}
${record}
${contrib}
${flavor}
${footer}
</svg>`
}

export function renderPlaceholderCard(
  username: string,
  themeName: string,
  glowName = 'soft',
): string {
  const theme = getTheme(themeName)
  const glow = normalizeGlow(glowName)
  const { defs, frame } = renderFrame(glow, CARD_W, CARD_H, theme.accent)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
<defs>${defs}</defs>
${svgRect(0, 0, CARD_W, CARD_H, { fill: theme.bg, rx: 36 })}
${frame}
${svgText(CARD_W / 2, CARD_H / 2 - 20, 'Summoning…', { fontSize: 34, fill: theme.text, fontWeight: 'bold', anchor: 'middle' })}
${svgText(CARD_W / 2, CARD_H / 2 + 24, `${username}'s card is being drawn`, { fontSize: 18, fill: theme.textSecondary, anchor: 'middle' })}
${svgText(CARD_W / 2, CARD_H - 48, 'PullCard AI', { fontSize: 15, fill: theme.textSecondary, anchor: 'middle' })}
</svg>`
}
