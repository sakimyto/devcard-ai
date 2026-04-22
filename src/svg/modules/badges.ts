import type { BadgeAnalysis } from '~/analyzers/badges'
import type { Theme } from '../themes'
import { escapeXml, svgText } from '../utils'

const BADGE_GAP = 6
const BADGE_HEIGHT = 22
const BADGE_RX = 11
const BADGE_FONT_SIZE = 10
const BADGE_PAD_X = 10
const ICON_WIDTH = 14
const CHAR_WIDTH = 5.8
const BADGE_ROW_X = 24
const BADGE_ROW_MAX_X = 376 // CARD_WIDTH (400) - 24 padding
const MORE_CHIP_WIDTH = 32

function badgeWidth(label: string): number {
  return BADGE_PAD_X * 2 + ICON_WIDTH + label.length * CHAR_WIDTH
}

export function renderBadgesModule(
  badges: BadgeAnalysis,
  theme: Theme,
  yOffset: number,
): string {
  const parts: string[] = []
  const y = yOffset + 8

  // Stats line: "142 AI commits · since 2025-06"
  const statsItems: string[] = []
  statsItems.push(`${badges.totalAiCommits} AI commits`)
  if (badges.firstAiDate) {
    statsItems.push(`since ${badges.firstAiDate}`)
  }
  if (badges.aiStreakDays >= 3) {
    statsItems.push(`${badges.aiStreakDays}d streak`)
  }
  const statsText = statsItems.join(' \u00B7 ')
  parts.push(svgText(24, y + 12, statsText, {
    fontSize: 11,
    fill: theme.textSecondary,
  }))

  if (badges.badges.length > 0) {
    let x = BADGE_ROW_X
    const badgeY = y + 22
    let rendered = 0

    for (let i = 0; i < badges.badges.length; i++) {
      const badge = badges.badges[i]
      const w = badgeWidth(badge.label)
      const remaining = badges.badges.length - i - 1
      // Reserve space for a "+N" chip if more badges remain after this one.
      const reserve = remaining > 0 ? MORE_CHIP_WIDTH + BADGE_GAP : 0
      if (x + w + reserve > BADGE_ROW_MAX_X && rendered > 0) {
        const overflow = badges.badges.length - rendered
        parts.push(
          `<rect x="${x}" y="${badgeY}" width="${MORE_CHIP_WIDTH}" height="${BADGE_HEIGHT}" fill="${theme.badgeBg}" rx="${BADGE_RX}" />`,
        )
        parts.push(
          svgText(x + MORE_CHIP_WIDTH / 2, badgeY + 15, `+${overflow}`, {
            fontSize: BADGE_FONT_SIZE,
            fill: theme.textSecondary,
            fontWeight: '600',
            anchor: 'middle',
          }),
        )
        break
      }
      parts.push(
        `<rect x="${x}" y="${badgeY}" width="${w}" height="${BADGE_HEIGHT}" fill="${theme.badgeBg}" rx="${BADGE_RX}" />`,
      )
      parts.push(
        `<text x="${x + BADGE_PAD_X}" y="${badgeY + 15}" font-size="${BADGE_FONT_SIZE}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">${escapeXml(badge.icon)}</text>`,
      )
      parts.push(
        svgText(x + BADGE_PAD_X + ICON_WIDTH, badgeY + 15, badge.label, {
          fontSize: BADGE_FONT_SIZE,
          fill: theme.text,
          fontWeight: '600',
        }),
      )
      x += w + BADGE_GAP
      rendered++
    }
  }

  return parts.join('\n')
}
