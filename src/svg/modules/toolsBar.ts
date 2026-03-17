import type { ToolAttributionAnalysis } from '~/analyzers/types'
import type { Theme } from '../themes'
import { svgText } from '../utils'

const BAR_X = 24
const BAR_WIDTH = 352
const BAR_HEIGHT = 20
const BAR_RX = 10

export function renderToolsBarModule(
  data: ToolAttributionAnalysis,
  theme: Theme,
  yOffset: number,
): string {
  if (data.tools.length === 0) {
    return `
    <g transform="translate(0, ${yOffset})">
      ${svgText(BAR_X, 12, 'TOOLS', { fontSize: 10, fill: theme.textSecondary })}
      ${svgText(BAR_X, 32, 'No tools detected', { fontSize: 11, fill: theme.textSecondary })}
    </g>`
  }

  const clipId = `toolsBarClip-${yOffset}`
  const defs: string[] = []
  const segments: string[] = []
  const labels: string[] = []
  let xCursor = BAR_X

  for (const tool of data.tools) {
    const segWidth = Math.max(Math.round((tool.percentage / 100) * BAR_WIDTH), 2)
    const gradId = `toolGrad-${tool.toolId}-${yOffset}`
    const [c1, c2] = theme.toolColors[tool.toolId] ?? theme.toolColors.unknown ?? ['#8b949e', '#6e7681']

    defs.push(`<linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${c1}" />
      <stop offset="100%" stop-color="${c2}" />
    </linearGradient>`)

    segments.push(`<rect x="${xCursor}" y="${yOffset + 18}" width="${segWidth}" height="${BAR_HEIGHT}" fill="url(#${gradId})" />`)

    const labelText = `${tool.toolName} ${Math.round(tool.percentage)}%`
    if (segWidth > labelText.length * 6) {
      labels.push(svgText(
        xCursor + segWidth / 2,
        yOffset + 18 + BAR_HEIGHT / 2 + 4,
        labelText,
        { fontSize: 9, fill: '#ffffff', fontWeight: 'bold', anchor: 'middle' },
      ))
    }

    xCursor += segWidth
  }

  return `
    <defs>
      <clipPath id="${clipId}">
        <rect x="${BAR_X}" y="${yOffset + 18}" width="${BAR_WIDTH}" height="${BAR_HEIGHT}" rx="${BAR_RX}" />
      </clipPath>
      ${defs.join('\n')}
    </defs>
    <g transform="translate(0, 0)">
      ${svgText(BAR_X, yOffset + 12, 'TOOLS', { fontSize: 10, fill: theme.textSecondary })}
      <rect x="${BAR_X}" y="${yOffset + 18}" width="${BAR_WIDTH}" height="${BAR_HEIGHT}" fill="${theme.barBg}" rx="${BAR_RX}" />
      <g clip-path="url(#${clipId})">
        ${segments.join('\n')}
      </g>
      ${labels.join('\n')}
    </g>`
}
