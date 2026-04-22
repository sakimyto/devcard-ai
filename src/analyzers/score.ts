import type { ScoreAnalysis, ToolAttributionAnalysis } from './types'

// `totalCommitCount` is the denominator for aiRate — the count of ALL commits
// (AI + non-AI). Passing only AI commits here makes aiRate saturate at 1 and
// every active user becomes TIER S.
export function analyzeScore(
  toolAttribution: ToolAttributionAnalysis,
  totalCommitCount: number,
  hasRecentActivity: boolean,
): ScoreAnalysis {
  const hasTools = toolAttribution.tools.length > 0
  const multipleTools = toolAttribution.tools.length >= 2
  const aiRate = totalCommitCount > 0
    ? toolAttribution.totalAiCommits / totalCommitCount
    : 0
  const activeAiCommits = aiRate > 0.1
  const recentActivity = hasRecentActivity

  let points = 0
  if (hasTools) points += 25
  if (multipleTools) points += 20
  if (activeAiCommits) points += Math.min(35, Math.round(aiRate * 70))
  if (recentActivity) points += 20

  const grade = gradeFromPoints(points)

  return {
    grade,
    points,
    breakdown: { hasTools, multipleTools, activeAiCommits, recentActivity },
  }
}

function gradeFromPoints(points: number): ScoreAnalysis['grade'] {
  if (points >= 80) return 'S'
  if (points >= 60) return 'A'
  if (points >= 40) return 'B'
  if (points >= 20) return 'C'
  return 'D'
}
