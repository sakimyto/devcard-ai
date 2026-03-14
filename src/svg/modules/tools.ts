import type { ToolsAnalysis } from '~/analyzers/types'
import type { Theme } from '../themes'
import { svgRect, svgText } from '../utils'

export function renderToolsModule(data: ToolsAnalysis, theme: Theme, yOffset: number): string {
  const label = svgText(20, 16, 'Tools', { fontSize: 12, fill: theme.textSecondary })

  if (data.tools.length === 0) {
    return `
      <g transform="translate(0, ${yOffset})">
        ${label}
        ${svgText(80, 16, 'None detected', { fontSize: 12, fill: theme.textSecondary })}
      </g>
    `
  }

  let badgeX = 80
  const badges = data.tools.map((tool) => {
    const textWidth = tool.name.length * 7.5 + 16
    const badge = `
      ${svgRect(badgeX, 0, textWidth, 24, { fill: theme.barBg, rx: 12 })}
      ${svgText(badgeX + 8, 16, tool.name, { fontSize: 11, fill: theme.text })}
    `
    badgeX += textWidth + 8
    return badge
  })

  return `
    <g transform="translate(0, ${yOffset})">
      ${label}
      ${badges.join('')}
    </g>
  `
}
