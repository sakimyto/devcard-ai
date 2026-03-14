import { describe, expect, it } from "vitest";
import { renderScoreModule } from "~/svg/modules/score";
import { themes } from "~/svg/themes";

describe("renderScoreModule", () => {
	it("renders grade badge", () => {
		const svg = renderScoreModule(
			{
				grade: "S",
				points: 90,
				breakdown: {
					hasAiConfig: true,
					multipleTools: true,
					activeAiCommits: true,
					recentActivity: true,
				},
			},
			themes.light,
			0,
		);
		expect(svg).toContain("S");
		expect(svg).toContain("AI Readiness");
	});

	it("renders D grade", () => {
		const svg = renderScoreModule(
			{
				grade: "D",
				points: 5,
				breakdown: {
					hasAiConfig: false,
					multipleTools: false,
					activeAiCommits: false,
					recentActivity: false,
				},
			},
			themes.dark,
			0,
		);
		expect(svg).toContain("D");
	});
});
