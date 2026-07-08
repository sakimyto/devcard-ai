import type { GitHubCommit } from '~/github/types'

const MS_PER_DAY = 24 * 60 * 60 * 1000
export const WINDOW_DAYS = 84 // 12 weeks

export function filterToWindow(
  commits: GitHubCommit[],
  now: Date,
  days: number = WINDOW_DAYS,
): GitHubCommit[] {
  const nowMs = now.getTime()
  const cutoff = nowMs - days * MS_PER_DAY
  return commits.filter((c) => {
    const ts = Date.parse(c.committedDate)
    return Number.isFinite(ts) && ts >= cutoff && ts <= nowMs
  })
}
