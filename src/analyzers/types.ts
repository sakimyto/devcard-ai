export interface CoauthorAnalysis {
  totalCommits: number
  aiCommits: number
  rate: number // 0-1
}

// === Score ===
export interface ScoreAnalysis {
	grade: 'S' | 'A' | 'B' | 'C' | 'D'
	points: number
	breakdown: {
		hasTools: boolean
		multipleTools: boolean
		activeAiCommits: boolean
		recentActivity: boolean
	}
}

// === Tool Attribution ===
export interface ToolAttribution {
	toolId: string
	toolName: string
	commitCount: number
	percentage: number
}
export interface ToolAttributionAnalysis {
	tools: ToolAttribution[]
	totalAiCommits: number
}

// === Usage ===
export type UsageCategory = 'feature' | 'bugfix' | 'test' | 'refactor'
export interface UsageCategoryData {
	category: UsageCategory
	count: number
	percentage: number
}
export interface UsageAnalysis {
	categories: UsageCategoryData[]
	totalCommits: number
}

// === Languages ===
export interface LanguageData {
	name: string
	color: string
	repoCount: number
}
export interface LanguageAnalysis {
	languages: LanguageData[]
}

// === Pattern ===
export type PatternType = 'AI Native' | 'Pair Programmer' | 'Delegator' | 'Selective User'
export interface PatternAnalysis {
	pattern: PatternType
	aiRate: number
	alternationScore: number
}

// === Card Data ===
export interface CardData {
	username: string
	score: ScoreAnalysis
	toolAttribution: ToolAttributionAnalysis
	usage: UsageAnalysis
	languages: LanguageAnalysis
	pattern: PatternAnalysis
}
