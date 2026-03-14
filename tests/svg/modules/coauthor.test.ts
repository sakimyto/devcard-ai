import { describe, it, expect } from 'vitest'
import { renderCoauthorModule } from '~/svg/modules/coauthor'
import { themes } from '~/svg/themes'

describe('renderCoauthorModule', () => {
  it('renders percentage and bar', () => {
    const svg = renderCoauthorModule({ totalCommits: 100, aiCommits: 42, rate: 0.42 }, themes.light, 0)
    expect(svg).toContain('42%')
    expect(svg).toContain('<rect')
  })

  it('renders 0% when no AI commits', () => {
    const svg = renderCoauthorModule({ totalCommits: 50, aiCommits: 0, rate: 0 }, themes.light, 0)
    expect(svg).toContain('0%')
  })
})
