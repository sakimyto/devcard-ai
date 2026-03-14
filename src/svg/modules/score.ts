import type { ScoreAnalysis } from '~/analyzers/types'
import type { Theme } from '../themes'
import { svgRect, svgText } from '../utils'

const GRADE_COLORS: Record<string, string> = {
  S: '#6f42c1',
  A: '#2ea44f',
  B: '#0969da',
  C: '#bf8700',
  D: '#6e7781',
}

export function renderScoreModule(data: ScoreAnalysis, theme: Theme, yOffset: number): string {
  const gradeColor = GRADE_COLORS[data.grade] ?? theme.textSecondary

  return `
    <g transform="translate(0, ${yOffset})">
      ${svgText(20, 16, 'AI Readiness', { fontSize: 12, fill: theme.textSecondary })}
      ${svgRect(120, -2, 32, 24, { fill: gradeColor, rx: 6 })}
      ${svgText(136, 16, data.grade, { fontSize: 14, fill: '#ffffff', fontWeight: 'bold', anchor: 'middle' })}
    </g>
  `
}
