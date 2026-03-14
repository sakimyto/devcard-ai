import type { GitHubRepo } from "~/github/types";
import type { DetectedTool, ToolsAnalysis } from "./types";

interface ToolDefinition {
	id: string;
	name: string;
	detect: (repo: GitHubRepo) => boolean;
}

const TOOL_DEFINITIONS: ToolDefinition[] = [
	{
		id: "claude",
		name: "Claude Code",
		detect: (repo) => repo.claudeMd !== null || repo.claudeDir !== null,
	},
	{
		id: "cursor",
		name: "Cursor",
		detect: (repo) => repo.cursorrules !== null || repo.cursorrulesDir !== null,
	},
	{
		id: "copilot",
		name: "GitHub Copilot",
		detect: (repo) => repo.githubCopilot !== null,
	},
	{
		id: "agents-md",
		name: "AGENTS.md",
		detect: (repo) => repo.agentsMd !== null,
	},
];

export function analyzeTools(repos: GitHubRepo[]): ToolsAnalysis {
	const counts = new Map<string, number>();

	for (const repo of repos) {
		for (const tool of TOOL_DEFINITIONS) {
			if (tool.detect(repo)) {
				counts.set(tool.id, (counts.get(tool.id) ?? 0) + 1);
			}
		}
	}

	const tools: DetectedTool[] = TOOL_DEFINITIONS.filter((t) =>
		counts.has(t.id),
	).map((t) => ({
		id: t.id,
		name: t.name,
		repoCount: counts.get(t.id) ?? 0,
	}));

	return { tools };
}
