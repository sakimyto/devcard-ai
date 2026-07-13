import { getTheme } from './themes'
import { svgRect, svgText } from './utils'

const CARD_WIDTH = 400

export function renderErrorCard(message: string, themeName: string): string {
  const theme = getTheme(themeName)
  const height = 80

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${height}" viewBox="0 0 ${CARD_WIDTH} ${height}">
  ${svgRect(0, 0, CARD_WIDTH, height, { fill: theme.bg, rx: 12 })}
  <rect x="0.5" y="0.5" width="${CARD_WIDTH - 1}" height="${height - 1}" fill="none" stroke="${theme.border}" rx="12" />
  ${svgText(CARD_WIDTH / 2, 35, message, { fontSize: 14, fill: theme.textSecondary, anchor: 'middle' })}
  ${svgText(CARD_WIDTH / 2, 58, 'PullCard AI', { fontSize: 10, fill: theme.textSecondary, anchor: 'middle' })}
</svg>`
}
