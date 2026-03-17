import type { GitHubCommit } from '~/github/types'
import type { ToolAttribution, ToolAttributionAnalysis } from './types'

const TOOL_NAMES: Record<string, string> = {
  claude: 'Claude',
  copilot: 'Copilot',
  cursor: 'Cursor',
  devin: 'Devin',
  sweep: 'Sweep',
  unknown: 'Other',
}

const BOT_TOOL_MAP: Record<string, string> = {
  'copilot-for-prs[bot]': 'copilot',
  'devin-ai-integration[bot]': 'devin',
  'devin-ai[bot]': 'devin',
  'sweep-ai[bot]': 'sweep',
}

function attributeTool(commit: GitHubCommit): string {
  const msg = commit.message.toLowerCase()
  const login = commit.author?.user?.login ?? ''

  if (login && BOT_TOOL_MAP[login]) return BOT_TOOL_MAP[login]
  if (login.endsWith('[bot]')) return 'unknown'

  if (msg.includes('@anthropic.com') || /co-authored-by:.*\bclaude\b/i.test(msg)) return 'claude'
  if (/co-authored-by:.*\bcopilot\b/i.test(msg)) return 'copilot'
  if (/co-authored-by:.*\bcursor\b/i.test(msg)) return 'cursor'

  return 'unknown'
}

export function analyzeToolAttribution(aiCommits: GitHubCommit[]): ToolAttributionAnalysis {
  if (aiCommits.length === 0) {
    return { tools: [], totalAiCommits: 0 }
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

  return { tools, totalAiCommits: total }
}
