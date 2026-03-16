import type { HeatmapAnalysis } from "~/analyzers/types";
import type { GitHubCommit } from "~/github/types";

export function analyzeHeatmap(aiCommits: GitHubCommit[]): HeatmapAnalysis {
	const hourly = new Array<number>(24).fill(0);

	for (const commit of aiCommits) {
		const hour = new Date(commit.committedDate).getUTCHours();
		hourly[hour]++;
	}

	const maxCount = hourly.reduce((a, b) => Math.max(a, b), 0);
	const peakHour = aiCommits.length === 0 ? 0 : hourly.indexOf(maxCount);

	return { hourly, peakHour, totalAiCommits: aiCommits.length };
}
