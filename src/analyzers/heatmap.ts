import { isAiCommit } from "~/analyzers/coauthor";
import type { HeatmapAnalysis } from "~/analyzers/types";
import type { GitHubCommit } from "~/github/types";

export function analyzeHeatmap(commits: GitHubCommit[]): HeatmapAnalysis {
	const hourly = new Array<number>(24).fill(0);
	let totalAiCommits = 0;

	for (const commit of commits) {
		if (!isAiCommit(commit.message, commit.author?.user?.login ?? null)) {
			continue;
		}
		const hour = new Date(commit.committedDate).getUTCHours();
		hourly[hour]++;
		totalAiCommits++;
	}

	const maxCount = hourly.reduce((a, b) => Math.max(a, b), 0);
	const peakHour = totalAiCommits === 0 ? 0 : hourly.indexOf(maxCount);

	return { hourly, peakHour, totalAiCommits };
}
