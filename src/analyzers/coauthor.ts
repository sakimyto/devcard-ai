import type { GitHubCommit } from "~/github/types";
import type { CoauthorAnalysis } from "./types";
import { detectAiSignal } from "./aiPatterns";

export function isAiCommit(
	message: string,
	authorLogin: string | null,
): boolean {
	return detectAiSignal(message, authorLogin).isAi;
}

export function analyzeCoauthor(
	commits: GitHubCommit[],
	precomputedAiCount?: number,
): CoauthorAnalysis {
	const totalCommits = commits.length;
	if (totalCommits === 0) {
		return { totalCommits: 0, aiCommits: 0, rate: 0 };
	}
	const aiCommits =
		precomputedAiCount ??
		commits.filter((c) =>
			isAiCommit(c.message, c.author?.user?.login ?? null),
		).length;
	return {
		totalCommits,
		aiCommits,
		rate: aiCommits / totalCommits,
	};
}
