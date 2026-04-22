import type { CardData } from '~/analyzers/types'
import { renderBadgesModule } from './modules/badges'
import { renderToolsBarModule } from './modules/toolsBar'
import { renderUsageModule } from './modules/usage'
import { renderVelocityModule } from './modules/velocity'
import { getTheme } from './themes'
import { pillWidth, renderPill, svgRect, svgText } from './utils'

export interface CardOptions {
  theme: string
  modules: string[]
}

const DEFAULT_MODULES = ['toolsBar', 'velocity', 'badges', 'usage']
const CARD_WIDTH = 400
const HEADER_HEIGHT = 84
const PADDING_BOTTOM = 12
const FOOTER_HEIGHT = 24

export const MODULE_HEIGHTS: Record<string, number> = {
  toolsBar: 50,
  velocity: 94,
  badges: 54,
  usage: 110,
}

const TIER_COLORS: Record<string, string> = {
  S: '#a371f7',
  A: '#3fb950',
  B: '#58a6ff',
  C: '#d29922',
  D: '#6e7781',
}

export function renderCard(data: CardData, options: CardOptions): string {
  const theme = getTheme(options.theme)
  const modules =
    options.modules.length > 0 ? options.modules : DEFAULT_MODULES

  const modulesSvg: string[] = []
  let yOffset = HEADER_HEIGHT

  for (const mod of modules) {
    switch (mod) {
      case 'toolsBar':
        modulesSvg.push(renderToolsBarModule(data.toolAttribution, theme, yOffset))
        break
      case 'velocity':
        modulesSvg.push(renderVelocityModule(data.velocity, theme, yOffset))
        break
      case 'badges':
        modulesSvg.push(renderBadgesModule(data.badges, theme, yOffset))
        break
      case 'usage':
        modulesSvg.push(renderUsageModule(data.usage, data.languages, theme, yOffset))
        break
    }
    yOffset += MODULE_HEIGHTS[mod] ?? 40
  }

  const cardHeight = yOffset + PADDING_BOTTOM + FOOTER_HEIGHT

  const tierColor = TIER_COLORS[data.score.grade] ?? theme.textSecondary
  const archetype = data.pattern.pattern
  const verified = data.toolAttribution.verified

  const chipY = 56
  const archetypeX = 24
  const archetypeW = pillWidth(archetype)
  const archetypeChip = renderPill(archetypeX, chipY, archetype, {
    width: archetypeW,
    fill: theme.badgeBg,
    textColor: theme.accent,
    fontWeight: '600',
  })

  const verifiedX = archetypeX + archetypeW + 6
  const verifiedChip = verified
    ? `
    <rect x="${verifiedX}" y="${chipY}" width="66" height="18" fill="none" stroke="${theme.accent}" stroke-opacity="0.55" rx="9" />
    <circle cx="${verifiedX + 9}" cy="${chipY + 9}" r="4" fill="${theme.accent}" />
    ${svgText(verifiedX + 15, chipY + 13, '✓', { fontSize: 9, fill: '#ffffff', fontWeight: 'bold' })}
    ${svgText(verifiedX + 22, chipY + 13, 'Verified', { fontSize: 9, fill: theme.text, fontWeight: '600' })}
  `
    : ''

  const tierBoxSize = 46
  const tierX = CARD_WIDTH - tierBoxSize - 14
  const tierY = 10

  const tierBadge = `
    ${svgRect(tierX, tierY, tierBoxSize, tierBoxSize, { fill: tierColor, rx: 10 })}
    <rect x="${tierX}" y="${tierY}" width="${tierBoxSize}" height="${tierBoxSize}" fill="none" stroke="#ffffff" stroke-width="0.5" stroke-opacity="0.25" rx="10" />
    ${svgText(tierX + tierBoxSize / 2, tierY + 18, 'TIER', { fontSize: 7, fill: '#ffffff', fontWeight: 'bold', anchor: 'middle' })}
    ${svgText(tierX + tierBoxSize / 2, tierY + 38, data.score.grade, { fontSize: 20, fill: '#ffffff', fontWeight: 'bold', anchor: 'middle' })}
  `

  const issuedDate = (data.velocity.firstAiDate ?? '').slice(0, 7)
  const footerRight = issuedDate ? `issued ${issuedDate}` : 'verified'
  const footerText = `AI Builder Passport · ${footerRight}`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${cardHeight}" viewBox="0 0 ${CARD_WIDTH} ${cardHeight}">
  <defs>
    <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${theme.headerBg}" />
      <stop offset="100%" stop-color="${theme.bg}" />
    </linearGradient>
    <linearGradient id="sepGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.6" />
      <stop offset="50%" stop-color="${theme.accent}" stop-opacity="0.15" />
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0" />
    </linearGradient>
  </defs>

  <!-- Card background -->
  ${svgRect(0, 0, CARD_WIDTH, cardHeight, { fill: theme.bg, rx: 12 })}

  <!-- Border -->
  <rect x="0.5" y="0.5" width="${CARD_WIDTH - 1}" height="${cardHeight - 1}" fill="none" stroke="${theme.border}" stroke-width="1" rx="12" />

  <!-- Header background -->
  <rect x="1" y="1" width="${CARD_WIDTH - 2}" height="${HEADER_HEIGHT - 10}" fill="url(#headerGrad)" rx="11" />

  <!-- Header: AI Builder eyebrow + username -->
  ${svgText(24, 24, 'AI BUILDER', { fontSize: 9, fill: theme.textSecondary, fontWeight: '600' })}
  ${svgText(24, 44, data.username, { fontSize: 18, fill: theme.text, fontWeight: 'bold' })}
  ${archetypeChip}
  ${verifiedChip}

  <!-- Tier badge (top-right) -->
  ${tierBadge}

  <!-- Separator -->
  <line x1="24" y1="${HEADER_HEIGHT - 4}" x2="${CARD_WIDTH - 24}" y2="${HEADER_HEIGHT - 4}" stroke="url(#sepGrad)" stroke-width="1" />

  ${modulesSvg.join('\n')}

  <!-- Footer -->
  ${svgText(CARD_WIDTH / 2, cardHeight - 10, footerText, { fontSize: 9, fill: theme.textSecondary, anchor: 'middle' })}
</svg>`
}

export function renderErrorCard(message: string, themeName: string): string {
  const theme = getTheme(themeName)
  const height = 80

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${height}" viewBox="0 0 ${CARD_WIDTH} ${height}">
  ${svgRect(0, 0, CARD_WIDTH, height, { fill: theme.bg, rx: 12 })}
  <rect x="0.5" y="0.5" width="${CARD_WIDTH - 1}" height="${height - 1}" fill="none" stroke="${theme.border}" rx="12" />
  ${svgText(CARD_WIDTH / 2, 35, message, { fontSize: 14, fill: theme.textSecondary, anchor: 'middle' })}
  ${svgText(CARD_WIDTH / 2, 58, 'devcard-ai', { fontSize: 10, fill: theme.textSecondary, anchor: 'middle' })}
</svg>`
}
