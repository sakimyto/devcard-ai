import type { GitHubCommit } from '~/github/types'
import { detectAiSignal } from './aiPatterns'
import type { ToolAttribution, ToolAttributionAnalysis } from './types'

const TOOL_NAMES: Record<string, string> = {
  claude: 'Claude',
  codex: 'Codex',
  copilot: 'Copilot',
  cursor: 'Cursor',
  windsurf: 'Windsurf',
  aider: 'Aider',
  tabnine: 'Tabnine',
  cody: 'Cody',
  amazonq: 'Amazon Q',
  gemini: 'Gemini',
  devin: 'Devin',
  sweep: 'Sweep',
  unknown: 'Other',
}

function attributeTool(commit: GitHubCommit): string {
  return detectAiSignal(commit.message, commit.author?.user?.login ?? null).toolId
}

export function analyzeToolAttribution(aiCommits: GitHubCommit[]): ToolAttributionAnalysis {
  if (aiCommits.length === 0) {
    return { tools: [], totalAiCommits: 0, verified: false }
  }

  const counts = new Map<string, number>()
  for (const commit of aiCommits) {
    const toolId = attributeTool(commit)
    counts.set(toolId, (counts.get(toolId) ?? 0) + 1)
  }

  const total = aiCommits.length
  const tools: ToolAttribution[] = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([toolId, count]) => ({
      toolId,
      toolName: TOOL_NAMES[toolId] ?? toolId,
      commitCount: count,
      percentage: Math.round((count / total) * 1000) / 10,
    }))

  const verified = tools.some((t) => t.toolId !== 'unknown' && t.commitCount > 0)

  return { tools, totalAiCommits: total, verified }
}
