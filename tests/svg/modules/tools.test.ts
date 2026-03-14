import { describe, it, expect } from 'vitest'
import { renderToolsModule } from '~/svg/modules/tools'
import { themes } from '~/svg/themes'

describe('renderToolsModule', () => {
  it('renders tool badges', () => {
    const svg = renderToolsModule(
      { tools: [{ id: 'claude', name: 'Claude Code', repoCount: 3 }] },
      themes.light,
      0,
    )
    expect(svg).toContain('Claude Code')
    expect(svg).toContain('<rect')
  })

  it('renders multiple tools', () => {
    const svg = renderToolsModule(
      {
        tools: [
          { id: 'claude', name: 'Claude Code', repoCount: 2 },
          { id: 'cursor', name: 'Cursor', repoCount: 1 },
        ],
      },
      themes.light,
      0,
    )
    expect(svg).toContain('Claude Code')
    expect(svg).toContain('Cursor')
  })

  it('renders empty state', () => {
    const svg = renderToolsModule({ tools: [] }, themes.light, 0)
    expect(svg).toContain('None detected')
  })
})
