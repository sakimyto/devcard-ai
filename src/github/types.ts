export interface GitHubUser {
	login: string;
	repositories: {
		nodes: GitHubRepo[];
	};
}

export interface GitHubRepo {
	name: string;
	pushedAt: string;
	defaultBranchRef: {
		target: {
			history: {
				nodes: GitHubCommit[];
				totalCount: number;
			};
		};
	} | null;
	claudeMd: FileCheck | null;
	agentsMd: FileCheck | null;
	cursorrules: FileCheck | null;
	cursorrulesDir: FileCheck | null;
	githubCopilot: FileCheck | null;
	claudeDir: FileCheck | null;
}

interface FileCheck {
	id: string;
}

export interface GitHubCommit {
	message: string;
	committedDate: string;
	author: {
		user: { login: string } | null;
	};
}

export interface GitHubQueryResponse {
	user: GitHubUser | null;
}
