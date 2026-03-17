import type { LanguageAnalysis, UsageAnalysis, UsageCategory } from '~/analyzers/types'
import type { Theme } from '../themes'
import { svgRect, svgText } from '../utils'

const CATEGORY_LABELS: Record<UsageCategory, string> = {
  feature: 'Feature',
  bugfix: 'Bug Fix',
  test: 'Test',
  refactor: 'Refactor',
}

const DONUT_CX = 76
const DONUT_R = 32
const DONUT_STROKE = 10
const CIRCUMFERENCE = 2 * Math.PI * DONUT_R

export function renderUsageModule(
  usage: UsageAnalysis,
  languages: LanguageAnalysis,
  theme: Theme,
  yOffset: number,
): string {
  const donutCy = yOffset + 62

  // Donut segments
  const donutSegments: string[] = []
  let offset = 0
  for (const cat of usage.categories) {
    if (cat.percentage === 0) continue
    const dashLen = (cat.percentage / 100) * CIRCUMFERENCE
    const color = theme.usageColors[cat.category]
    donutSegments.push(
      `<circle cx="${DONUT_CX}" cy="${donutCy}" r="${DONUT_R}" fill="none"
        stroke="${color}" stroke-width="${DONUT_STROKE}"
        stroke-dasharray="${dashLen} ${CIRCUMFERENCE - dashLen}"
        stroke-dashoffset="${-offset}"
        transform="rotate(-90 ${DONUT_CX} ${donutCy})" />`,
    )
    offset += dashLen
  }

  // If no commits, show empty ring
  if (usage.totalCommits === 0) {
    donutSegments.push(
      `<circle cx="${DONUT_CX}" cy="${donutCy}" r="${DONUT_R}" fill="none"
        stroke="${theme.barBg}" stroke-width="${DONUT_STROKE}" />`,
    )
  }

  // Center text
  const centerText = `
    ${svgText(DONUT_CX, donutCy - 2, String(usage.totalCommits), { fontSize: 14, fill: theme.text, fontWeight: 'bold', anchor: 'middle' })}
    ${svgText(DONUT_CX, donutCy + 10, 'commits', { fontSize: 8, fill: theme.textSecondary, anchor: 'middle' })}
  `

  // Legend (right of donut)
  const legendX = 134
  const legendRows = usage.categories.map((cat, i) => {
    const y = yOffset + 38 + i * 18
    const color = theme.usageColors[cat.category]
    return `
      <circle cx="${legendX}" cy="${y - 3}" r="4" fill="${color}" />
      ${svgText(legendX + 10, y, CATEGORY_LABELS[cat.category], { fontSize: 10, fill: theme.text })}
      ${svgText(legendX + 70, y, `${Math.round(cat.percentage)}%`, { fontSize: 10, fill: theme.textSecondary })}
    `
  })

  // Languages column (far right)
  const langX = 284
  const langPills = languages.languages.map((lang, i) => {
    const y = yOffset + 38 + i * 22
    const pillWidth = Math.max(lang.name.length * 7 + 20, 50)
    return `
      ${svgRect(langX, y - 12, pillWidth, 18, { fill: theme.barBg, rx: 9 })}
      <circle cx="${langX + 10}" cy="${y - 3}" r="4" fill="${lang.color}" />
      ${svgText(langX + 18, y, lang.name, { fontSize: 9, fill: theme.text })}
    `
  })

  return `
    <g>
      ${svgText(24, yOffset + 16, 'USAGE', { fontSize: 10, fill: theme.textSecondary })}
      ${donutSegments.join('\n')}
      ${centerText}
      ${legendRows.join('\n')}
      ${langPills.length > 0 ? svgText(langX, yOffset + 16, 'LANGUAGES', { fontSize: 10, fill: theme.textSecondary }) : ''}
      ${langPills.join('\n')}
    </g>`
}
