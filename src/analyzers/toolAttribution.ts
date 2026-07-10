import type { GitHubCommit } from '~/github/types'
import { detectAiSignal, detectAssistedSignal } from './aiPatterns'
import type { AssistedTool, ToolAttribution, ToolAttributionAnalysis } from './types'

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
  // Task 23: 世界の AI ツール
  deepseek: 'DeepSeek',
  qwen: 'Qwen',
  kimi: 'Kimi',
  mistral: 'Mistral',
  grok: 'Grok',
  cline: 'Cline',
  roo: 'Roo Code',
  continue: 'Continue',
  zed: 'Zed AI',
  junie: 'Junie',
  amp: 'Amp',
  openhands: 'OpenHands',
  goose: 'Goose',
  kiro: 'Kiro',
  trae: 'Trae',
  augment: 'Augment',
  jules: 'Jules',
  replit: 'Replit',
  v0: 'v0',
  bolt: 'Bolt',
  lovable: 'Lovable',
  unknown: 'Other',
}

function attributeTool(commit: GitHubCommit): string {
  return detectAiSignal(commit.message, commit.author?.user?.login ?? null).toolId
}

export function analyzeToolAttribution(aiCommits: GitHubCommit[]): ToolAttributionAnalysis {
  if (aiCommits.length === 0) {
    return { tools: [], assisted: [], totalAiCommits: 0, verified: false }
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

  return { tools, assisted: [], totalAiCommits: total, verified }
}

// v2: 全 involved コミット（committed または assisted）を受け、committed（%付き tools）と
// assisted（本文レビュー文脈）を仕分ける。committed の % 分母は committed コミット数のみ。
export function analyzeToolAttributionV2(commits: GitHubCommit[]): ToolAttributionAnalysis {
  const committedCommits = commits.filter(
    (c) => detectAiSignal(c.message, c.author?.user?.login ?? null).isAi,
  )
  const base = analyzeToolAttribution(committedCommits)

  const committedIds = new Set(base.tools.map((t) => t.toolId))
  const assistedCounts = new Map<string, number>()
  for (const c of commits) {
    const toolId = detectAssistedSignal(c.message)
    // committed は上位証跡。同一ツールは assisted 側に重複して出さない
    if (toolId !== null && !committedIds.has(toolId)) {
      assistedCounts.set(toolId, (assistedCounts.get(toolId) ?? 0) + 1)
    }
  }

  const assisted: AssistedTool[] = [...assistedCounts.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([toolId, count]) => ({ toolId, toolName: TOOL_NAMES[toolId] ?? toolId, count }))

  // totalAiCommits reflects the new "committed OR assisted" definition (all involved
  // commits passed in), not just committed. tools[].percentage stays committed-share
  // by design (% は committed 実績のみ), so the two axes intentionally differ.
  // verified also covers assisted: a recognized assisted tool is specific public
  // evidence, so an assisted-only card still earns the ✓ verified badge.
  const verified = base.verified || assisted.some((a) => a.toolId !== 'unknown')
  return { ...base, assisted, verified, totalAiCommits: commits.length }
}
