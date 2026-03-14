export interface CoauthorAnalysis {
  totalCommits: number
  aiCommits: number
  rate: number // 0-1
}

export interface DetectedTool {
  id: string
  name: string
  repoCount: number
}

export interface ToolsAnalysis {
  tools: DetectedTool[]
}

export interface ScoreAnalysis {
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  points: number // 0-100
  breakdown: {
    hasAiConfig: boolean
    multipleTools: boolean
    activeAiCommits: boolean
    recentActivity: boolean
  }
}

export interface CardData {
  username: string
  coauthor: CoauthorAnalysis
  tools: ToolsAnalysis
  score: ScoreAnalysis
}
