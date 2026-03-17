import { describe, expect, it } from 'vitest'
import { renderUsageModule } from '~/svg/modules/usage'
import { getTheme } from '~/svg/themes'
import type { UsageAnalysis, LanguageAnalysis } from '~/analyzers/types'

describe('renderUsageModule', () => {
  const theme = getTheme('dark')
  const usage: UsageAnalysis = {
    categories: [
      { category: 'feature', count: 4, percentage: 40 },
      { category: 'bugfix', count: 3, percentage: 30 },
      { category: 'test', count: 2, percentage: 20 },
      { category: 'refactor', count: 1, percentage: 10 },
    ],
    totalCommits: 10,
  }
  const languages: LanguageAnalysis = {
    languages: [
      { name: 'TypeScript', color: '#3178c6', repoCount: 3 },
      { name: 'Go', color: '#00add8', repoCount: 1 },
    ],
  }

  it('renders donut chart with categories', () => {
    const svg = renderUsageModule(usage, languages, theme, 130)
    expect(svg).toContain('USAGE')
    expect(svg).toContain('Feature')
    expect(svg).toContain('Bug Fix')
    expect(svg).toContain('circle')
  })

  it('renders language badges', () => {
    const svg = renderUsageModule(usage, languages, theme, 130)
    expect(svg).toContain('LANGUAGES')
    expect(svg).toContain('TypeScript')
    expect(svg).toContain('Go')
  })

  it('renders center commit count', () => {
    const svg = renderUsageModule(usage, languages, theme, 130)
    expect(svg).toContain('>10<')
    expect(svg).toContain('commits')
  })

  it('handles zero commits', () => {
    const emptyUsage: UsageAnalysis = {
      categories: [
        { category: 'feature', count: 0, percentage: 0 },
        { category: 'bugfix', count: 0, percentage: 0 },
        { category: 'test', count: 0, percentage: 0 },
        { category: 'refactor', count: 0, percentage: 0 },
      ],
      totalCommits: 0,
    }
    const svg = renderUsageModule(emptyUsage, { languages: [] }, theme, 130)
    expect(svg).toContain('>0<')
  })
})
