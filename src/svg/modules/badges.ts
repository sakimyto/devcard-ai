import type { BadgeAnalysis } from '~/analyzers/badges'
import type { Theme } from '../themes'
import { pillWidth, renderPill, svgText } from '../utils'

const BADGE_GAP = 6
const BADGE_HEIGHT = 22
const BADGE_ROW_X = 24
const BADGE_ROW_MAX_X = 376 // CARD_WIDTH (400) - 24 padding
const MORE_CHIP_WIDTH = 32

export function renderBadgesModule(
  badges: BadgeAnalysis,
  theme: Theme,
  yOffset: number,
): string {
  const parts: string[] = []
  const y = yOffset + 8

  const statsItems: string[] = [`${badges.totalAiCommits} AI commits`]
  if (badges.firstAiDate) statsItems.push(`since ${badges.firstAiDate}`)
  if (badges.aiStreakDays >= 3) statsItems.push(`${badges.aiStreakDays}d streak`)
  parts.push(
    svgText(24, y + 12, statsItems.join(' · '), {
      fontSize: 11,
      fill: theme.textSecondary,
    }),
  )

  if (badges.badges.length === 0) return parts.join('\n')

  let x = BADGE_ROW_X
  const badgeY = y + 22

  for (let i = 0; i < badges.badges.length; i++) {
    const badge = badges.badges[i]
    const w = pillWidth(badge.label, { icon: true })
    const remaining = badges.badges.length - i - 1
    const reserve = remaining > 0 ? MORE_CHIP_WIDTH + BADGE_GAP : 0
    const rendered = i

    if (x + w + reserve > BADGE_ROW_MAX_X && rendered > 0) {
      const overflow = badges.badges.length - rendered
      parts.push(
        renderPill(x, badgeY + 2, `+${overflow}`, {
          width: MORE_CHIP_WIDTH,
          height: BADGE_HEIGHT - 4,
          fill: theme.badgeBg,
          textColor: theme.textSecondary,
          fontWeight: '600',
        }),
      )
      break
    }

    parts.push(
      renderPill(x, badgeY, badge.label, {
        icon: badge.icon,
        height: BADGE_HEIGHT,
        fill: theme.badgeBg,
        textColor: theme.text,
      }),
    )
    x += w + BADGE_GAP
  }

  return parts.join('\n')
}
