export interface CoauthorAnalysis {
	totalCommits: number;
	aiCommits: number;
	rate: number; // 0-1
}

export interface DetectedTool {
	id: string;
	name: string;
	repoCount: number;
}

export interface ToolsAnalysis {
	tools: DetectedTool[];
}

export interface ScoreAnalysis {
	grade: "S" | "A" | "B" | "C" | "D";
	points: number; // 0-100
	breakdown: {
		hasAiConfig: boolean;
		multipleTools: boolean;
		activeAiCommits: boolean;
		recentActivity: boolean;
	};
}

export type StyleType = "TDD Architect" | "Vibe Coder" | "Orchestrator" | "Minimalist";

export interface StyleAnalysis {
	styles: StyleType[];
}

export interface HeatmapAnalysis {
	hourly: number[]; // 24 elements, count of AI commits per hour (0-23)
	peakHour: number;
	totalAiCommits: number;
}

export interface CardData {
	username: string;
	coauthor: CoauthorAnalysis;
	tools: ToolsAnalysis;
	score: ScoreAnalysis;
	style: StyleAnalysis;
	heatmap: HeatmapAnalysis;
}
