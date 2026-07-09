export interface GitHubUser {
  login: string
  // GitHub always returns this; optional here only so existing GraphQL fixtures that
  // predate the avatar feature still type-check. Handler treats absent as "no avatar".
  avatarUrl?: string
  repositories: {
    nodes: GitHubRepo[]
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
