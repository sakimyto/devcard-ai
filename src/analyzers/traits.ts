import type { GitHubCommit } from '~/github/types'
import type { RecordAnalysis } from './record'
import type {
  EquippedAnalysis,
  LanguageAnalysisV2,
  StatsAnalysis,
  ToolAttributionAnalysis,
} from './types'

export interface Trait {
  id: string
  name: string
  proof: string
}

// Everything analyzeTraits needs. It derives per-day / per-week / per-repo facts from the
// two commit arrays internally so all trait logic stays deterministic and in one tested unit.
export interface TraitsInput {
  stats: StatsAnalysis
  record: RecordAnalysis
  toolAttribution: ToolAttributionAnalysis
  equipped: EquippedAnalysis
  languages: LanguageAnalysisV2
  involvedCommits: GitHubCommit[] // AI-involved, in-window
  windowCommits: GitHubCommit[] // all in-window (AI + human)
  now: Date
}

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_WEEK = 7 * MS_PER_DAY
const WINDOW_WEEKS = 12
const FRESH_WINDOW_MS = 28 * MS_PER_DAY // first AI commit within the last 4 weeks = fresh start

function startOfUtcDay(ts: number): number {
  const d = new Date(ts)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

interface Derived {
  maxCommitsInDay: number
  daysWith8Plus: number
  weekendRatio: number // 0-1, UTC Sat/Sun share of involved commits
  topRepoShare: number // 0-1, largest single-repo share of window commits
  activeRepoCount: number // distinct repos with a window commit
  comeback: boolean // 3+ idle weeks, then 3+ active weeks (involved commits)
  freshStart: boolean // earliest involved commit within the last 4 weeks
  totalCommits: number // window commits (AI + human)
}

function derive(input: TraitsInput): Derived {
  const nowMs = input.now.getTime()

  // Per-UTC-day involved-commit counts.
  const perDay = new Map<number, number>()
  let weekendCount = 0
  let earliestTs = Number.POSITIVE_INFINITY
  const weekActive = new Array<boolean>(WINDOW_WEEKS).fill(false)
  for (const c of input.involvedCommits) {
    const ts = Date.parse(c.committedDate)
    if (!Number.isFinite(ts)) continue
    const day = startOfUtcDay(ts)
    perDay.set(day, (perDay.get(day) ?? 0) + 1)
    const dow = new Date(day).getUTCDay()
    if (dow === 0 || dow === 6) weekendCount++
    if (ts < earliestTs) earliestTs = ts
    const weeksAgo = Math.floor((nowMs - ts) / MS_PER_WEEK)
    if (weeksAgo >= 0 && weeksAgo < WINDOW_WEEKS) {
      // oldest → newest: index 0 is the oldest week.
      weekActive[WINDOW_WEEKS - 1 - weeksAgo] = true
    }
  }
  let maxCommitsInDay = 0
  let daysWith8Plus = 0
  for (const n of perDay.values()) {
    if (n > maxCommitsInDay) maxCommitsInDay = n
    if (n >= 8) daysWith8Plus++
  }
  const involvedTotal = input.involvedCommits.length
  const weekendRatio = involvedTotal === 0 ? 0 : weekendCount / involvedTotal

  // Per-repo distribution of window commits.
  const perRepo = new Map<string, number>()
  for (const c of input.windowCommits) {
    const key = c.repoFullName
    if (key === undefined) continue
    perRepo.set(key, (perRepo.get(key) ?? 0) + 1)
  }
  const repoTotal = [...perRepo.values()].reduce((a, b) => a + b, 0)
  const topRepo = [...perRepo.values()].reduce((a, b) => Math.max(a, b), 0)
  const topRepoShare = repoTotal === 0 ? 0 : topRepo / repoTotal
  const activeRepoCount = perRepo.size

  // comeback: a run of ≥3 consecutive active weeks preceded by ≥3 idle weeks.
  // j = run start; need weeks [j-3..j-1] idle and [j..j+2] active, all in bounds.
  let comeback = false
  for (let j = 3; j + 2 <= WINDOW_WEEKS - 1; j++) {
    if (
      weekActive[j] &&
      weekActive[j + 1] &&
      weekActive[j + 2] &&
      !weekActive[j - 1] &&
      !weekActive[j - 2] &&
      !weekActive[j - 3]
    ) {
      comeback = true
      break
    }
  }

  const freshStart =
    earliestTs !== Number.POSITIVE_INFINITY && nowMs - earliestTs <= FRESH_WINDOW_MS

  return {
    maxCommitsInDay,
    daysWith8Plus,
    weekendRatio,
    topRepoShare,
    activeRepoCount,
    comeback,
    freshStart,
    totalCommits: input.windowCommits.length,
  }
}

// Priority-ordered pool (1 = highest). analyzeTraits returns the first two whose condition
// holds. Each proof string is a fixed template with deterministic numbers embedded.
interface TraitDef {
  id: string
  name: string
  test: (i: TraitsInput, d: Derived) => boolean
  proof: (i: TraitsInput, d: Derived) => string
}

const POOL: TraitDef[] = [
  {
    id: 'ascension',
    name: 'Over 9000',
    test: (i) => i.stats.power >= 9000,
    proof: () => 'Power level beyond measure',
  },
  {
    id: 'unbroken',
    name: 'Unbroken',
    test: (i) => i.record.currentStreak >= 21,
    proof: (i) => `${i.record.currentStreak}-day commit streak, still alive`,
  },
  {
    id: 'centurion',
    name: 'Centurion',
    test: (i) => i.stats.aiCommitsInWindow >= 100,
    proof: (i) => `${i.stats.aiCommitsInWindow} AI-assisted commits in 12 weeks`,
  },
  {
    id: 'chain-strike',
    name: 'Chain strike',
    test: (_i, d) => d.daysWith8Plus >= 3,
    proof: (_i, d) => `${d.daysWith8Plus} days of 8+ commits`,
  },
  {
    id: 'burst-caster',
    name: 'Burst caster',
    test: (_i, d) => d.maxCommitsInDay >= 20,
    proof: (_i, d) => `${d.maxCommitsInDay} commits in a single day`,
  },
  {
    id: 'perfect-attendance',
    name: 'Perfect attendance',
    test: (i) => i.stats.activeWeeks === 12,
    proof: () => 'Active all 12 weeks',
  },
  {
    id: 'ghostwriter',
    name: 'Ghostwriter',
    test: (i) => i.stats.synergy >= 80,
    proof: (i) => `${i.stats.synergy}% of commits ship with AI`,
  },
  {
    id: 'iron-hand',
    name: 'Iron hand',
    test: (i, d) => i.stats.synergy <= 20 && d.totalCommits >= 30,
    proof: () => 'Ships mostly bare-handed',
  },
  {
    id: 'duelist',
    name: 'Duelist',
    test: (i) => i.toolAttribution.assisted.some((a) => a.toolId !== 'unknown'),
    proof: () => 'A second AI reviews every strike',
  },
  {
    id: 'one-true-blade',
    name: 'One true blade',
    test: (i) => {
      const top = i.toolAttribution.tools[0]
      return top !== undefined && top.toolId !== 'unknown' && top.percentage >= 90
    },
    proof: (i) => {
      const top = i.toolAttribution.tools[0]
      return `${top.toolName} loyalty: ${Math.round(top.percentage)}%`
    },
  },
  {
    id: 'multi-wielder',
    name: 'Multi-wielder',
    test: (i) => i.toolAttribution.tools.filter((t) => t.toolId !== 'unknown').length >= 3,
    proof: (i) =>
      `${i.toolAttribution.tools.filter((t) => t.toolId !== 'unknown').length} blades drawn this season`,
  },
  {
    id: 'armory',
    name: 'Full armory',
    test: (i) => i.equipped.equipped.length >= 3,
    proof: (i) => `${i.equipped.equipped.length} tools equipped and ready`,
  },
  {
    id: 'reviewers-eye',
    name: "Reviewer's eye",
    test: (i) => i.record.reviews >= 15 && i.record.reviews / (i.record.commits + 1) >= 0.2,
    proof: (i) => `${i.record.reviews} reviews delivered`,
  },
  {
    id: 'pr-cannon',
    name: 'PR cannon',
    test: (i) => i.record.prs >= 25,
    proof: (i) => `${i.record.prs} pull requests fired`,
  },
  {
    id: 'monastic',
    name: 'Monastic focus',
    test: (_i, d) => d.topRepoShare >= 0.7,
    proof: (_i, d) => `${Math.round(d.topRepoShare * 100)}% devoted to one repo`,
  },
  {
    id: 'nomad',
    name: 'Nomad',
    test: (_i, d) => d.activeRepoCount >= 8,
    proof: (_i, d) => `Roaming ${d.activeRepoCount} repositories`,
  },
  {
    id: 'polyglot',
    name: 'Polyglot',
    test: (i) => i.languages.languages.length >= 3,
    proof: (i) => `Fluent in ${i.languages.languages.map((l) => l.name).join(', ')}`,
  },
  {
    id: 'weekend-warrior',
    name: 'Weekend warrior',
    test: (_i, d) => d.weekendRatio >= 0.35,
    proof: (_i, d) => `${Math.round(d.weekendRatio * 100)}% shipped on weekends`,
  },
  {
    id: 'comeback',
    name: 'The comeback',
    test: (_i, d) => d.comeback,
    proof: () => 'Returned from the void',
  },
  {
    id: 'fresh-summoner',
    name: 'Fresh summoner',
    test: (_i, d) => d.freshStart,
    proof: () => 'The journey begins',
  },
]

export function analyzeTraits(input: TraitsInput): Trait[] {
  const d = derive(input)
  const out: Trait[] = []
  for (const def of POOL) {
    if (def.test(input, d)) {
      out.push({ id: def.id, name: def.name, proof: def.proof(input, d) })
      if (out.length === 2) break
    }
  }
  return out
}
