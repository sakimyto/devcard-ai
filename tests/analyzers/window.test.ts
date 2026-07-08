import { describe, expect, it } from 'vitest'
import { filterToWindow } from '~/analyzers/window'
import type { GitHubCommit } from '~/github/types'

const NOW = new Date('2026-07-08T12:00:00Z')
const commit = (committedDate: string): GitHubCommit => ({
  oid: committedDate,
  message: 'feat: x',
  committedDate,
  author: { user: { login: 'u' } },
})

describe('filterToWindow', () => {
  it('keeps commits within 84 days, drops older and future', () => {
    const inside = commit('2026-07-01T00:00:00Z')
    const edge = commit('2026-04-16T00:00:00Z') // 83日前 → 含む
    const outside = commit('2026-04-14T00:00:00Z') // 85日前 → 除外
    const future = commit('2026-07-09T00:00:00Z')
    expect(filterToWindow([inside, edge, outside, future], NOW)).toEqual([inside, edge])
  })

  it('drops unparsable dates and handles empty input', () => {
    expect(filterToWindow([commit('not-a-date')], NOW)).toEqual([])
    expect(filterToWindow([], NOW)).toEqual([])
  })
})
