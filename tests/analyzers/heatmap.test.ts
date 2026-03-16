import { describe, expect, it } from "vitest";
import { analyzeHeatmap } from "~/analyzers/heatmap";
import type { GitHubCommit } from "~/github/types";

const makeCommit = (
	message: string,
	committedDate: string,
	login: string | null = "testuser",
): GitHubCommit => ({
	message,
	committedDate,
	author: { user: login ? { login } : null },
});

const makeAiCommit = (committedDate: string): GitHubCommit =>
	makeCommit(
		`feat: something\n\nCo-Authored-By: Claude <noreply@anthropic.com>`,
		committedDate,
	);

describe("analyzeHeatmap", () => {
	describe("hourly bucketing", () => {
		it("correctly buckets commits by UTC hour", () => {
			const commits = [
				makeAiCommit("2026-03-14T09:00:00Z"), // hour 9
				makeAiCommit("2026-03-14T09:30:00Z"), // hour 9
				makeAiCommit("2026-03-14T14:15:00Z"), // hour 14
			];
			const result = analyzeHeatmap(commits);
			expect(result.hourly).toHaveLength(24);
			expect(result.hourly[9]).toBe(2);
			expect(result.hourly[14]).toBe(1);
			expect(result.hourly[0]).toBe(0);
		});

		it("returns zeros for empty input", () => {
			const result = analyzeHeatmap([]);
			expect(result.totalAiCommits).toBe(0);
			expect(result.hourly.every((v) => v === 0)).toBe(true);
		});
	});

	describe("peak hour detection", () => {
		it("returns the hour with most AI commits as peakHour", () => {
			const commits = [
				makeAiCommit("2026-03-14T02:00:00Z"), // hour 2
				makeAiCommit("2026-03-14T15:00:00Z"), // hour 15
				makeAiCommit("2026-03-14T15:30:00Z"), // hour 15
				makeAiCommit("2026-03-14T15:59:00Z"), // hour 15
			];
			const result = analyzeHeatmap(commits);
			expect(result.peakHour).toBe(15);
		});

		it("returns 0 as peakHour when no AI commits", () => {
			const result = analyzeHeatmap([]);
			expect(result.peakHour).toBe(0);
		});
	});

	describe("totalAiCommits", () => {
		it("counts all provided commits", () => {
			const commits = [
				makeAiCommit("2026-03-14T09:00:00Z"),
				makeAiCommit("2026-03-14T10:00:00Z"),
				makeAiCommit("2026-03-14T11:00:00Z"),
			];
			const result = analyzeHeatmap(commits);
			expect(result.totalAiCommits).toBe(3);
		});
	});

	describe("empty commits", () => {
		it("returns zeroed hourly array and 0 totalAiCommits for empty input", () => {
			const result = analyzeHeatmap([]);
			expect(result.hourly).toHaveLength(24);
			expect(result.hourly.every((v) => v === 0)).toBe(true);
			expect(result.totalAiCommits).toBe(0);
			expect(result.peakHour).toBe(0);
		});
	});

	describe("all commits in same hour", () => {
		it("buckets all into the same hour slot", () => {
			const commits = [
				makeAiCommit("2026-03-14T23:00:00Z"),
				makeAiCommit("2026-03-14T23:15:00Z"),
				makeAiCommit("2026-03-14T23:45:00Z"),
			];
			const result = analyzeHeatmap(commits);
			expect(result.hourly[23]).toBe(3);
			expect(result.peakHour).toBe(23);
			expect(result.totalAiCommits).toBe(3);
			// all other hours are 0
			for (let h = 0; h < 23; h++) {
				expect(result.hourly[h]).toBe(0);
			}
		});
	});
});
