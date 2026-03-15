import { isAiCommit } from "~/analyzers/coauthor";
import type { CoauthorAnalysis, StyleAnalysis, StyleType, ToolsAnalysis } from "~/analyzers/types";
import type { GitHubCommit } from "~/github/types";

const TDD_KEYWORDS = /\b(test|spec|tdd|jest|vitest|describe|expect|assert)\b/i;
const REVERT_FIX_PATTERN = /^(revert|fix)[:\s!]/i;

function medianInterval(sortedDates: Date[]): number {
	if (sortedDates.length < 2) return Infinity;
	const intervals: number[] = [];
	for (let i = 1; i < sortedDates.length; i++) {
		const diffMs = sortedDates[i].getTime() - sortedDates[i - 1].getTime();
		intervals.push(Math.abs(diffMs) / 60000); // convert to minutes
	}
	intervals.sort((a, b) => a - b);
	const mid = Math.floor(intervals.length / 2);
	return intervals.length % 2 === 0
		? (intervals[mid - 1] + intervals[mid]) / 2
		: intervals[mid];
}

export function analyzeStyle(
	commits: GitHubCommit[],
	coauthor: CoauthorAnalysis,
	tools: ToolsAnalysis,
): StyleAnalysis {
	const styles: StyleType[] = [];

	if (commits.length === 0) {
		return { styles };
	}

	const aiCommits = commits.filter((c) =>
		isAiCommit(c.message, c.author?.user?.login ?? null),
	);

	// TDD Architect: 40%+ of AI commits mention test/spec keywords
	if (aiCommits.length > 0) {
		const tddCommits = aiCommits.filter((c) => TDD_KEYWORDS.test(c.message));
		const tddRate = tddCommits.length / aiCommits.length;
		if (tddRate >= 0.4) {
			styles.push("TDD Architect");
		}
	}

	// Vibe Coder: median AI commit interval ≤ 5 min AND AI rate ≥ 50%
	if (coauthor.rate >= 0.5 && aiCommits.length >= 2) {
		const sortedAiDates = aiCommits
			.map((c) => new Date(c.committedDate))
			.sort((a, b) => a.getTime() - b.getTime());
		const median = medianInterval(sortedAiDates);
		if (median <= 5) {
			styles.push("Vibe Coder");
		}
	}

	// Orchestrator: 3+ types of AI config files detected
	if (tools.tools.length >= 3) {
		styles.push("Orchestrator");
	}

	// Minimalist: AI rate ≤ 20% AND revert/fix commit rate ≤ 5%
	if (coauthor.rate <= 0.2) {
		const revertFixCount = commits.filter((c) => REVERT_FIX_PATTERN.test(c.message)).length;
		const revertFixRate = revertFixCount / commits.length;
		if (revertFixRate <= 0.05) {
			styles.push("Minimalist");
		}
	}

	return { styles };
}
