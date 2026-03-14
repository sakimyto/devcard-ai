import type { CoauthorAnalysis, ScoreAnalysis, ToolsAnalysis } from "./types";

export function analyzeScore(
	coauthor: CoauthorAnalysis,
	tools: ToolsAnalysis,
	hasRecentActivity: boolean,
): ScoreAnalysis {
	const hasAiConfig = tools.tools.length > 0;
	const multipleTools = tools.tools.length >= 2;
	const activeAiCommits = coauthor.rate > 0.1;
	const recentActivity = hasRecentActivity;

	let points = 0;
	if (hasAiConfig) points += 25;
	if (multipleTools) points += 20;
	if (activeAiCommits) points += Math.min(35, Math.round(coauthor.rate * 70));
	if (recentActivity) points += 20;

	const grade = gradeFromPoints(points);

	return {
		grade,
		points,
		breakdown: { hasAiConfig, multipleTools, activeAiCommits, recentActivity },
	};
}

function gradeFromPoints(points: number): ScoreAnalysis["grade"] {
	if (points >= 80) return "S";
	if (points >= 60) return "A";
	if (points >= 40) return "B";
	if (points >= 20) return "C";
	return "D";
}
