import type { GitHubRepo } from '~/github/types'
import type { EquippedAnalysis, EquippedTool } from './types'

const TOOL_LABELS: Record<string, string> = {
  claude: 'Claude',
  codex: 'Codex',
  cursor: 'Cursor',
  copilot: 'Copilot',
}

function toolsInRepo(repo: GitHubRepo): Set<string> {
  const tools = new Set<string>()
  if (repo.claudeMd || repo.claudeDir) tools.add('claude')
  if (repo.agentsMd) tools.add('codex')
  if (repo.cursorrules || repo.cursorrulesDir) tools.add('cursor')
  if (repo.githubCopilot) tools.add('copilot')
  return tools
}

export function analyzeEquipped(repos: GitHubRepo[]): EquippedAnalysis {
  const counts = new Map<string, number>()
  for (const repo of repos) {
    for (const toolId of toolsInRepo(repo)) {
      counts.set(toolId, (counts.get(toolId) ?? 0) + 1)
    }
  }
  const equipped: EquippedTool[] = [...counts.entries()]
    .map(([toolId, repoCount]) => ({ toolId, toolName: TOOL_LABELS[toolId], repoCount }))
    .sort((a, b) => b.repoCount - a.repoCount || a.toolId.localeCompare(b.toolId))
  return { equipped }
}
