import type { CardData } from '~/analyzers/types'
import { renderCoauthorModule } from './modules/coauthor'
import { renderScoreModule } from './modules/score'
import { renderToolsModule } from './modules/tools'
import { getTheme } from './themes'
import { svgRect, svgText } from './utils'

export interface CardOptions {
  theme: string
  modules: string[]
}

const DEFAULT_MODULES = ['tools', 'coauthor', 'score']
const CARD_WIDTH = 340
const MODULE_HEIGHT = 36
const HEADER_HEIGHT = 52
const PADDING_BOTTOM = 16
const FOOTER_HEIGHT = 20

export function renderCard(data: CardData, options: CardOptions): string {
  const theme = getTheme(options.theme)
  const modules = options.modules.length > 0 ? options.modules : DEFAULT_MODULES

  const modulesSvg: string[] = []
  let yOffset = HEADER_HEIGHT

  for (const mod of modules) {
    switch (mod) {
      case 'tools':
        modulesSvg.push(renderToolsModule(data.tools, theme, yOffset))
        break
      case 'coauthor':
        modulesSvg.push(renderCoauthorModule(data.coauthor, theme, yOffset))
        break
      case 'score':
        modulesSvg.push(renderScoreModule(data.score, theme, yOffset))
        break
    }
    yOffset += MODULE_HEIGHT
  }

  const cardHeight = yOffset + PADDING_BOTTOM + FOOTER_HEIGHT

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${cardHeight}" viewBox="0 0 ${CARD_WIDTH} ${cardHeight}">
  ${svgRect(0, 0, CARD_WIDTH, cardHeight, { fill: theme.bg, rx: 8 })}
  <rect x="0.5" y="0.5" width="${CARD_WIDTH - 1}" height="${cardHeight - 1}" fill="none" stroke="${theme.border}" rx="8" />
  ${svgText(20, 30, data.username, { fontSize: 16, fill: theme.text, fontWeight: 'bold' })}
  <line x1="20" y1="40" x2="${CARD_WIDTH - 20}" y2="40" stroke="${theme.border}" />
  ${modulesSvg.join('\n')}
  ${svgText(CARD_WIDTH / 2, cardHeight - 8, 'Powered by devcard-ai', { fontSize: 9, fill: theme.textSecondary, anchor: 'middle' })}
</svg>`
}
