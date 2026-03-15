import { analyzeCoauthor } from "./analyzers/coauthor";
import { analyzeHeatmap } from "./analyzers/heatmap";
import { analyzeScore } from "./analyzers/score";
import { analyzeStyle } from "./analyzers/style";
import { analyzeTools } from "./analyzers/tools";
import type { CardData } from "./analyzers/types";
import { fetchUserData } from "./github/client";
import type { GitHubCommit, GitHubQueryResponse } from "./github/types";
import { renderCard, renderErrorCard } from "./svg/card";

export interface RequestParams {
	user: string;
	modules: string[];
	theme: string;
}

export interface HandlerResult {
	svg: string;
	status: number;
}

type GraphqlFn = (
	query: string,
	variables: Record<string, unknown>,
) => Promise<GitHubQueryResponse>;

export async function handleRequest(
	params: RequestParams,
	graphql: GraphqlFn,
): Promise<HandlerResult> {
	const { user, modules, theme } = params;

	if (!user) {
		return {
			svg: renderErrorCard("User parameter required", theme),
			status: 200,
		};
	}

	try {
		const userData = await fetchUserData(user, graphql);

		if (!userData) {
			return { svg: renderErrorCard("User not found", theme), status: 200 };
		}

		const repos = userData.repositories.nodes;

		if (repos.length === 0) {
			return { svg: renderErrorCard("No public repos", theme), status: 200 };
		}

		const allCommits: GitHubCommit[] = repos.flatMap(
			(r) => r.defaultBranchRef?.target.history.nodes ?? [],
		);

		const hasRecentActivity = repos.some((r) => {
			const pushed = new Date(r.pushedAt);
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
			return pushed >= thirtyDaysAgo;
		});

		const coauthor = analyzeCoauthor(allCommits);
		const tools = analyzeTools(repos);

		if (coauthor.aiCommits === 0 && tools.tools.length === 0) {
			return {
				svg: renderErrorCard("No AI activity detected yet", theme),
				status: 200,
			};
		}

		const score = analyzeScore(coauthor, tools, hasRecentActivity);
		const style = analyzeStyle(allCommits, coauthor, tools);
		const heatmap = analyzeHeatmap(allCommits);

		const cardData: CardData = {
			username: userData.login,
			coauthor,
			tools,
			score,
			style,
			heatmap,
		};

		const svg = renderCard(cardData, { theme, modules });
		return { svg, status: 200 };
	} catch (error) {
		console.error("handleRequest error:", error);
		return {
			svg: renderErrorCard("Temporarily unavailable", theme),
			status: 200,
		};
	}
}
