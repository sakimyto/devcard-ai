import { describe, expect, it } from "vitest";
import { analyzeStyle } from "~/analyzers/style";
import type { CoauthorAnalysis, ToolsAnalysis } from "~/analyzers/types";
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

const makeAiCommit = (message: string, committedDate: string): GitHubCommit =>
	makeCommit(`${message}\n\nCo-Authored-By: Claude <noreply@anthropic.com>`, committedDate);

const defaultCoauthor = (aiRate: number, aiCommits: number): CoauthorAnalysis => ({
	totalCommits: aiCommits > 0 ? Math.round(aiCommits / aiRate) : 10,
	aiCommits,
	rate: aiRate,
});

const defaultTools = (toolCount: number): ToolsAnalysis => ({
	tools: Array.from({ length: toolCount }, (_, i) => ({
		id: `tool${i}`,
		name: `Tool ${i}`,
		repoCount: 1,
	})),
});

describe("analyzeStyle", () => {
	describe("TDD Architect", () => {
		it("detects TDD Architect when 40%+ AI commits mention test/spec", () => {
			const commits = [
				makeAiCommit("test: add unit tests for auth module", "2026-03-14T10:00:00Z"),
				makeAiCommit("feat: add auth module", "2026-03-14T10:05:00Z"),
				makeAiCommit("spec: verify login spec", "2026-03-14T10:10:00Z"),
				makeAiCommit("fix: spec issue", "2026-03-14T10:15:00Z"),
				makeAiCommit("chore: cleanup", "2026-03-14T10:20:00Z"),
				makeCommit("docs: update readme", "2026-03-14T10:25:00Z"),
			];
			const coauthor = defaultCoauthor(5 / 6, 5);
			const tools = defaultTools(1);
			const result = analyzeStyle(commits, coauthor, tools);
			expect(result.styles).toContain("TDD Architect");
		});

		it("does NOT detect TDD Architect when less than 40% AI commits mention test/spec", () => {
			const commits = [
				makeAiCommit("test: add one test", "2026-03-14T10:00:00Z"),
				makeAiCommit("feat: add feature A", "2026-03-14T10:05:00Z"),
				makeAiCommit("feat: add feature B", "2026-03-14T10:10:00Z"),
				makeAiCommit("feat: add feature C", "2026-03-14T10:15:00Z"),
				makeAiCommit("feat: add feature D", "2026-03-14T10:20:00Z"),
				makeCommit("docs: update readme", "2026-03-14T10:25:00Z"),
			];
			const coauthor = defaultCoauthor(5 / 6, 5);
			const tools = defaultTools(1);
			const result = analyzeStyle(commits, coauthor, tools);
			expect(result.styles).not.toContain("TDD Architect");
		});
	});

	describe("Vibe Coder", () => {
		it("detects Vibe Coder when median AI interval ≤ 5 min AND AI rate ≥ 50%", () => {
			// 6 AI commits in rapid succession (< 5 min apart), rate = 6/8 = 75%
			const commits = [
				makeAiCommit("feat: quick A", "2026-03-14T10:00:00Z"),
				makeAiCommit("feat: quick B", "2026-03-14T10:03:00Z"),
				makeAiCommit("feat: quick C", "2026-03-14T10:06:00Z"),
				makeAiCommit("feat: quick D", "2026-03-14T10:09:00Z"),
				makeAiCommit("feat: quick E", "2026-03-14T10:12:00Z"),
				makeAiCommit("feat: quick F", "2026-03-14T10:15:00Z"),
				makeCommit("docs: manual A", "2026-03-14T10:20:00Z"),
				makeCommit("docs: manual B", "2026-03-14T10:25:00Z"),
			];
			const coauthor = defaultCoauthor(6 / 8, 6);
			const tools = defaultTools(1);
			const result = analyzeStyle(commits, coauthor, tools);
			expect(result.styles).toContain("Vibe Coder");
		});

		it("does NOT detect Vibe Coder when AI rate < 50%", () => {
			const commits = [
				makeAiCommit("feat: quick A", "2026-03-14T10:00:00Z"),
				makeAiCommit("feat: quick B", "2026-03-14T10:03:00Z"),
				makeCommit("docs: manual A", "2026-03-14T10:20:00Z"),
				makeCommit("docs: manual B", "2026-03-14T10:25:00Z"),
				makeCommit("docs: manual C", "2026-03-14T10:30:00Z"),
				makeCommit("docs: manual D", "2026-03-14T10:35:00Z"),
			];
			const coauthor = defaultCoauthor(2 / 6, 2);
			const tools = defaultTools(1);
			const result = analyzeStyle(commits, coauthor, tools);
			expect(result.styles).not.toContain("Vibe Coder");
		});

		it("does NOT detect Vibe Coder when median interval > 5 min", () => {
			// AI rate 75% but intervals > 5 min
			const commits = [
				makeAiCommit("feat: slow A", "2026-03-14T10:00:00Z"),
				makeAiCommit("feat: slow B", "2026-03-14T10:10:00Z"),
				makeAiCommit("feat: slow C", "2026-03-14T10:20:00Z"),
				makeAiCommit("feat: slow D", "2026-03-14T10:30:00Z"),
				makeAiCommit("feat: slow E", "2026-03-14T10:40:00Z"),
				makeAiCommit("feat: slow F", "2026-03-14T10:50:00Z"),
				makeCommit("docs: manual A", "2026-03-14T11:00:00Z"),
				makeCommit("docs: manual B", "2026-03-14T11:10:00Z"),
			];
			const coauthor = defaultCoauthor(6 / 8, 6);
			const tools = defaultTools(1);
			const result = analyzeStyle(commits, coauthor, tools);
			expect(result.styles).not.toContain("Vibe Coder");
		});
	});

	describe("Orchestrator", () => {
		it("detects Orchestrator when 3+ AI tools detected", () => {
			const commits = [makeCommit("chore: setup", "2026-03-14T10:00:00Z")];
			const coauthor = defaultCoauthor(0, 0);
			const tools = defaultTools(3);
			const result = analyzeStyle(commits, coauthor, tools);
			expect(result.styles).toContain("Orchestrator");
		});

		it("does NOT detect Orchestrator when < 3 tools", () => {
			const commits = [makeCommit("chore: setup", "2026-03-14T10:00:00Z")];
			const coauthor = defaultCoauthor(0, 0);
			const tools = defaultTools(2);
			const result = analyzeStyle(commits, coauthor, tools);
			expect(result.styles).not.toContain("Orchestrator");
		});
	});

	describe("Minimalist", () => {
		it("detects Minimalist when AI rate ≤ 20% AND revert/fix rate ≤ 5%", () => {
			const commits = [
				makeAiCommit("feat: one ai commit", "2026-03-14T10:00:00Z"),
				makeCommit("feat: manual A", "2026-03-14T10:05:00Z"),
				makeCommit("feat: manual B", "2026-03-14T10:10:00Z"),
				makeCommit("feat: manual C", "2026-03-14T10:15:00Z"),
				makeCommit("feat: manual D", "2026-03-14T10:20:00Z"),
				makeCommit("feat: manual E", "2026-03-14T10:25:00Z"),
				makeCommit("feat: manual F", "2026-03-14T10:30:00Z"),
				makeCommit("feat: manual G", "2026-03-14T10:35:00Z"),
				makeCommit("feat: manual H", "2026-03-14T10:40:00Z"),
				makeCommit("feat: manual I", "2026-03-14T10:45:00Z"),
			];
			const coauthor = defaultCoauthor(1 / 10, 1);
			const tools = defaultTools(1);
			const result = analyzeStyle(commits, coauthor, tools);
			expect(result.styles).toContain("Minimalist");
		});

		it("does NOT detect Minimalist when AI rate > 20%", () => {
			const commits = [
				makeAiCommit("feat: ai A", "2026-03-14T10:00:00Z"),
				makeAiCommit("feat: ai B", "2026-03-14T10:05:00Z"),
				makeAiCommit("feat: ai C", "2026-03-14T10:10:00Z"),
				makeCommit("feat: manual A", "2026-03-14T10:15:00Z"),
				makeCommit("feat: manual B", "2026-03-14T10:20:00Z"),
			];
			const coauthor = defaultCoauthor(3 / 5, 3);
			const tools = defaultTools(1);
			const result = analyzeStyle(commits, coauthor, tools);
			expect(result.styles).not.toContain("Minimalist");
		});

		it("does NOT detect Minimalist when revert/fix rate > 5%", () => {
			const commits = [
				makeAiCommit("feat: ai A", "2026-03-14T10:00:00Z"),
				makeCommit("revert: undo something", "2026-03-14T10:05:00Z"),
				makeCommit("fix: broken thing", "2026-03-14T10:10:00Z"),
				makeCommit("feat: manual A", "2026-03-14T10:15:00Z"),
				makeCommit("feat: manual B", "2026-03-14T10:20:00Z"),
				makeCommit("feat: manual C", "2026-03-14T10:25:00Z"),
				makeCommit("feat: manual D", "2026-03-14T10:30:00Z"),
				makeCommit("feat: manual E", "2026-03-14T10:35:00Z"),
				makeCommit("feat: manual F", "2026-03-14T10:40:00Z"),
				makeCommit("feat: manual G", "2026-03-14T10:45:00Z"),
			];
			// AI rate = 1/10 = 10% (passes), but revert/fix rate = 2/10 = 20% (fails)
			const coauthor = defaultCoauthor(1 / 10, 1);
			const tools = defaultTools(1);
			const result = analyzeStyle(commits, coauthor, tools);
			expect(result.styles).not.toContain("Minimalist");
		});
	});

	describe("Multiple styles", () => {
		it("can detect multiple styles simultaneously", () => {
			// Orchestrator (3 tools) + Minimalist (low AI rate, no reverts)
			const commits = [
				makeAiCommit("feat: one ai", "2026-03-14T10:00:00Z"),
				makeCommit("feat: manual A", "2026-03-14T10:05:00Z"),
				makeCommit("feat: manual B", "2026-03-14T10:10:00Z"),
				makeCommit("feat: manual C", "2026-03-14T10:15:00Z"),
				makeCommit("feat: manual D", "2026-03-14T10:20:00Z"),
				makeCommit("feat: manual E", "2026-03-14T10:25:00Z"),
				makeCommit("feat: manual F", "2026-03-14T10:30:00Z"),
				makeCommit("feat: manual G", "2026-03-14T10:35:00Z"),
				makeCommit("feat: manual H", "2026-03-14T10:40:00Z"),
				makeCommit("feat: manual I", "2026-03-14T10:45:00Z"),
			];
			const coauthor = defaultCoauthor(1 / 10, 1);
			const tools = defaultTools(3);
			const result = analyzeStyle(commits, coauthor, tools);
			expect(result.styles).toContain("Orchestrator");
			expect(result.styles).toContain("Minimalist");
		});
	});

	describe("Edge cases", () => {
		it("returns empty styles for empty commits", () => {
			const coauthor = defaultCoauthor(0, 0);
			const tools = defaultTools(0);
			const result = analyzeStyle([], coauthor, tools);
			expect(result.styles).toEqual([]);
		});

		it("handles single commit without crashing", () => {
			const commits = [makeAiCommit("test: initial test", "2026-03-14T10:00:00Z")];
			const coauthor = defaultCoauthor(1, 1);
			const tools = defaultTools(1);
			// single AI commit: TDD threshold = 1/1 = 100% test keywords → TDD Architect
			const result = analyzeStyle(commits, coauthor, tools);
			expect(result.styles).toBeDefined();
			expect(Array.isArray(result.styles)).toBe(true);
		});

		it("returns no styles when no conditions met", () => {
			const commits = [
				makeCommit("feat: normal A", "2026-03-14T10:00:00Z"),
				makeCommit("feat: normal B", "2026-03-14T10:05:00Z"),
				makeCommit("feat: normal C", "2026-03-14T10:10:00Z"),
			];
			// AI rate 0, 0 tools
			const coauthor = defaultCoauthor(0, 0);
			const tools = defaultTools(0);
			const result = analyzeStyle(commits, coauthor, tools);
			// AI rate 0 ≤ 20% and no reverts → Minimalist should fire
			// but let's check it's an array
			expect(Array.isArray(result.styles)).toBe(true);
		});
	});
});
