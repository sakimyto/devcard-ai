import { describe, expect, it, vi } from "vitest";
import { fetchUserData } from "~/github/client";

describe("fetchUserData", () => {
	it("returns parsed user data for valid username", async () => {
		const mockGraphql = vi.fn().mockResolvedValue({
			user: {
				login: "testuser",
				repositories: {
					nodes: [
						{
							name: "my-repo",
							pushedAt: "2026-03-14T00:00:00Z",
							defaultBranchRef: {
								target: {
									history: {
										nodes: [
											{
												oid: "abc123",
												message:
													"feat: add feature\n\nCo-Authored-By: Claude <noreply@anthropic.com>",
												committedDate: "2026-03-14T00:00:00Z",
												author: { user: { login: "testuser" } },
											},
										],
										totalCount: 1,
									},
								},
							},
							claudeMd: { id: "abc" },
							agentsMd: null,
							cursorrules: null,
							cursorrulesDir: null,
							githubCopilot: null,
							claudeDir: { id: "def" },
							primaryLanguage: { name: 'TypeScript', color: '#3178c6' },
						},
					],
				},
			},
		});

		const result = await fetchUserData(
			"testuser",
			mockGraphql,
			"2026-04-15T12:00:00.000Z",
		);

		expect(result).not.toBeNull();
		expect(result?.login).toBe("testuser");
		expect(result?.repositories.nodes).toHaveLength(1);
		expect(mockGraphql).toHaveBeenCalledOnce();
		expect(mockGraphql).toHaveBeenCalledWith(expect.any(String), {
			login: "testuser",
			since: "2026-04-15T12:00:00.000Z",
		});
	});

	it("returns null for non-existent user", async () => {
		const mockGraphql = vi.fn().mockResolvedValue({ user: null });
		const result = await fetchUserData(
			"nonexistent",
			mockGraphql,
			"2026-04-15T12:00:00.000Z",
		);
		expect(result).toBeNull();
	});
});
