import type { GitHubRepo } from '~/github/types'
import type { LanguageAnalysis, LanguageData } from './types'

function hasAiConfig(repo: GitHubRepo): boolean {
  return !!(
    repo.claudeMd || repo.claudeDir || repo.cursorrules ||
    repo.cursorrulesDir || repo.githubCopilot || repo.agentsMd
  )
}

export function analyzeLanguages(repos: GitHubRepo[]): LanguageAnalysis {
  const counts = new Map<string, { color: string; count: number }>()

  for (const repo of repos) {
    if (!hasAiConfig(repo) || !repo.primaryLanguage) continue
    const { name, color } = repo.primaryLanguage
    const entry = counts.get(name)
    if (entry) {
      entry.count++
    } else {
      counts.set(name, { color, count: 1 })
    }
  }

  const languages: LanguageData[] = [...counts.entries()]
    .map(([name, { color, count }]) => ({ name, color, repoCount: count }))
    .sort((a, b) => b.repoCount - a.repoCount)
    .slice(0, 3)

  return { languages }
}
