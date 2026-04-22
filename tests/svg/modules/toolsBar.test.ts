import { describe, expect, it } from 'vitest'
import { renderToolsBarModule } from '~/svg/modules/toolsBar'
import { getTheme } from '~/svg/themes'
import type { ToolAttributionAnalysis } from '~/analyzers/types'

describe('renderToolsBarModule', () => {
  const theme = getTheme('dark')

  it('renders stacked bar with tool segments', () => {
    const data: ToolAttributionAnalysis = {
      tools: [
        { toolId: 'claude', toolName: 'Claude', commitCount: 7, percentage: 70 },
        { toolId: 'cursor', toolName: 'Cursor', commitCount: 3, percentage: 30 },
      ],
      totalAiCommits: 10, verified: false,
    }
    const svg = renderToolsBarModule(data, theme, 80)
    expect(svg).toContain('TOOLS')
    expect(svg).toContain('Claude')
    expect(svg).toContain('Cursor')
    expect(svg).toContain('70%')
    expect(svg).toContain('clipPath')
  })

  it('renders single tool at full width', () => {
    const data: ToolAttributionAnalysis = {
      tools: [{ toolId: 'claude', toolName: 'Claude', commitCount: 5, percentage: 100 }],
      totalAiCommits: 5, verified: false,
    }
    const svg = renderToolsBarModule(data, theme, 80)
    expect(svg).toContain('Claude')
    expect(svg).toContain('100%')
  })

  it('handles empty tools', () => {
    const data: ToolAttributionAnalysis = { tools: [], totalAiCommits: 0, verified: false }
    const svg = renderToolsBarModule(data, theme, 80)
    expect(svg).toContain('No tools detected')
  })
})
