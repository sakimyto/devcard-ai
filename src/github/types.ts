export interface GitHubUser {
  login: string
  // GitHub always returns this; optional here only so existing GraphQL fixtures that
  // predate the avatar feature still type-check. Handler treats absent as "no avatar".
  avatarUrl?: string
  // Contribution totals + daily calendar over the same 12-week window (from: $since).
  // Optional/null so pre-Task-17 fixtures and permission-restricted responses degrade
  // to an all-zero RECORD strip instead of crashing.
  contributionsCollection?: ContributionsCollection | null
  // 1-year calendar (from: $yearAgo, GitHub's contributionsCollection max span) used only
  // for the display-only 52-week activity graph. Optional/null → degrades to all-zero bars.
  yearContributions?: YearContributions | null
  repositories: {
    nodes: GitHubRepo[]
  }
  // True when private activity influenced the card via EITHER channel: a private repo node
  // (languages / commit messages) or a private row in commitContributionsByRepository (which
  // feeds RANGE even if the private repos query 502'd). Set by fetchUserData; drives the
  // `all repos` / `verified+` labels. Optional so pre-split fixtures default to public-only.
  includesPrivate?: boolean
}

export interface ContributionDay {
  date: string // 'YYYY-MM-DD' (UTC)
  contributionCount: number
}

export interface ContributionsCollection {
  totalCommitContributions: number
  totalPullRequestContributions: number
  totalPullRequestReviewContributions: number
  totalIssueContributions: number
  // Private contributions the user chose to surface publicly; 0 when private activity is hidden.
  restrictedContributionsCount: number
  contributionCalendar: {
    totalContributions: number
    weeks: { contributionDays: ContributionDay[] }[]
  }
  // Exact per-repo commit counts over the same 12-week window (uncapped by the 100-node
  // history limit). Optional/null so pre-Task-21 fixtures and permission-restricted responses
  // degrade — the RANGE analyzer falls back to the history-derived active-repo count.
  commitContributionsByRepository?: CommitsByRepo[] | null
}

export interface CommitsByRepo {
  repository: {
    name: string
    primaryLanguage: { name: string; color: string | null } | null
    isPrivate: boolean
  }
  contributions: { totalCount: number }
}

// Slim 1-year calendar: only weekly contribution counts are needed for the activity graph,
// so this aliased collection omits the daily `date` and the totals `contributionsCollection`
// carries. A missing calendar/weeks array degrades to zeros in analyzeRecord.
export interface YearContributions {
  contributionCalendar: {
    totalContributions: number
    weeks: { contributionDays: { contributionCount: number }[] }[]
  }
}

export interface GitHubRepo {
  name: string
  pushedAt: string
  defaultBranchRef: {
    target: {
      history: {
        nodes: GitHubCommit[]
        totalCount: number
      }
    }
  } | null
  claudeMd: FileCheck | null
  agentsMd: FileCheck | null
  cursorrules: FileCheck | null
  cursorrulesDir: FileCheck | null
  githubCopilot: FileCheck | null
  claudeDir: FileCheck | null
  primaryLanguage: { name: string; color: string } | null
  // Per-repo byte breakdown (top 8 by size). Optional/null so pre-Task-21 fixtures and
  // repos with no detectable languages degrade to an empty aggregation.
  languages?: RepoLanguages | null
}

export interface LanguageEdge {
  size: number
  node: { name: string; color: string | null }
}

export interface RepoLanguages {
  totalSize: number
  edges: LanguageEdge[]
}

interface FileCheck {
  id: string
}

export interface GitHubCommit {
  oid: string
  message: string
  committedDate: string
  author: {
    user: { login: string } | null
  }
  repoFullName?: string
}

export interface GitHubQueryResponse {
  user: GitHubUser | null
}
