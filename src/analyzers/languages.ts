import type { GitHubRepo } from '~/github/types'
import type { LanguageAnalysisV2, LanguageShare } from './types'

// Fallback for languages GitHub reports with a null linguist color (e.g. Dockerfile) and
// for the "others" bucket. Also the safe value when the reported color is not a hex token.
const NEUTRAL_GRAY = '#858585'
const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/

function safeColor(color: string | null | undefined): string {
  return color && HEX_COLOR.test(color) ? color : NEUTRAL_GRAY
}

// Byte-weighted language mix across all of a user's repos (github-profile-summary-cards
// style). Aggregates every repo's languages.edges by size, ranks by total bytes, keeps the
// top 4, and reports each as an integer percentage of the grand total. The rounding residual
// (and every language past the top 4) is folded into `othersPercentage`, so the top-4
// percentages plus others always describe a full 100%-wide bar. No language is filtered —
// Markdown/HTML/CSS are counted honestly, matching summary-cards.
export function analyzeLanguagesV2(repos: GitHubRepo[]): LanguageAnalysisV2 {
  const byLang = new Map<string, { color: string; bytes: number }>()
  let total = 0

  for (const repo of repos) {
    for (const edge of repo.languages?.edges ?? []) {
      const name = edge.node?.name
      const size = edge.size
      if (!name || !Number.isFinite(size) || size <= 0) continue
      const entry = byLang.get(name)
      if (entry) {
        entry.bytes += size
      } else {
        byLang.set(name, { color: safeColor(edge.node.color), bytes: size })
      }
      total += size
    }
  }

  if (total === 0) return { languages: [], othersPercentage: 0 }

  // Rank by bytes desc, then name asc for a deterministic tie-break.
  const ranked = [...byLang.entries()].sort(
    (a, b) => b[1].bytes - a[1].bytes || a[0].localeCompare(b[0]),
  )

  const languages: LanguageShare[] = ranked.slice(0, 4).map(([name, { color, bytes }]) => ({
    name,
    color,
    percentage: Math.round((100 * bytes) / total),
  }))

  const topSum = languages.reduce((acc, l) => acc + l.percentage, 0)
  // Others absorbs both the tail languages and the rounding residual so the bar sums to 100.
  // Clamped at 0 for the rare case where top-4 rounding overshoots (never negative width).
  const othersPercentage = Math.max(0, 100 - topSum)

  return { languages, othersPercentage }
}
