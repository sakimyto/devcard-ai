import type { VelocityAnalysis } from '~/analyzers/types'
import type { Theme } from '../themes'
import { pillWidth, renderPill, svgText } from '../utils'

const BAR_X = 24
const BAR_WIDTH = 352
const SPARK_Y_OFFSET = 52
const SPARK_HEIGHT = 22
const SPARK_GAP = 3
const PILL_GAP = 6

function formatDaysActive(days: number): string {
  if (days <= 0) return 'today'
  if (days < 14) return `${days}d active`
  if (days < 60) return `${Math.floor(days / 7)}w active`
  if (days < 365) return `${Math.floor(days / 30)}mo active`
  const years = Math.floor(days / 365)
  const extraMonths = Math.floor((days - years * 365) / 30)
  return extraMonths > 0 ? `${years}y ${extraMonths}mo active` : `${years}y active`
}

export function renderVelocityModule(
  velocity: VelocityAnalysis,
  theme: Theme,
  yOffset: number,
): string {
  const maxVal = Math.max(...velocity.sparkline, 1)
  const barCount = velocity.sparkline.length
  const slot = (BAR_WIDTH - SPARK_GAP * (barCount - 1)) / barCount
  const barWidth = Math.max(slot, 4)

  const bars = velocity.sparkline.map((n, i) => {
    const h = n === 0 ? 2 : Math.max(3, Math.round((n / maxVal) * SPARK_HEIGHT))
    const x = BAR_X + i * (slot + SPARK_GAP)
    const y = yOffset + SPARK_Y_OFFSET + SPARK_HEIGHT - h
    const fill = n === 0 ? theme.barBg : theme.accent
    const opacity = n === 0 ? 0.6 : 0.85
    return `<rect x="${x.toFixed(2)}" y="${y}" width="${barWidth.toFixed(2)}" height="${h}" fill="${fill}" fill-opacity="${opacity}" rx="1" />`
  }).join('')

  const weeksLabel = `${velocity.weeksActive}/12 active weeks`
  const cadenceLabel =
    velocity.commitsPerWeek > 0
      ? `${velocity.commitsPerWeek.toFixed(1).replace(/\.0$/, '')} AI cmts/wk`
      : '— cmts/wk'
  const activeLabel =
    velocity.daysSinceFirst > 0
      ? formatDaysActive(velocity.daysSinceFirst)
      : velocity.firstAiDate
        ? 'today'
        : 'no AI activity'

  const pillsY = yOffset + 21
  const labels = [weeksLabel, cadenceLabel, activeLabel]
  let cursor = BAR_X
  const pills = labels
    .map((label) => {
      const w = pillWidth(label)
      const pill = renderPill(cursor, pillsY, label, {
        width: w,
        fill: theme.badgeBg,
        textColor: theme.text,
      })
      cursor += w + PILL_GAP
      return pill
    })
    .join('\n')

  const footY = yOffset + SPARK_Y_OFFSET + SPARK_HEIGHT + 12

  return `
    <g>
      ${svgText(BAR_X, yOffset + 12, 'SHIP VELOCITY', { fontSize: 10, fill: theme.textSecondary })}
      ${velocity.firstAiDate ? svgText(BAR_X + BAR_WIDTH, yOffset + 12, `since ${velocity.firstAiDate}`, { fontSize: 9, fill: theme.textSecondary, anchor: 'end' }) : ''}
      ${pills}
      ${bars}
      ${svgText(BAR_X, footY, 'last 12 weeks', { fontSize: 8, fill: theme.textSecondary })}
    </g>`
}
