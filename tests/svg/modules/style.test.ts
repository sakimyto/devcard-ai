import { describe, expect, it } from "vitest";
import type { StyleAnalysis } from "~/analyzers/types";
import { renderStyleModule } from "~/svg/modules/style";
import { themes } from "~/svg/themes";

describe("renderStyleModule", () => {
	it("renders style badges for each style type", () => {
		const data: StyleAnalysis = { styles: ["TDD Architect", "Vibe Coder"] };
		const svg = renderStyleModule(data, themes.light, 0);
		expect(svg).toContain("TDD Architect");
		expect(svg).toContain("Vibe Coder");
	});

	it("applies TDD Architect green color", () => {
		const data: StyleAnalysis = { styles: ["TDD Architect"] };
		const svg = renderStyleModule(data, themes.light, 0);
		expect(svg).toContain("#2ea44f");
	});

	it("applies Vibe Coder purple color", () => {
		const data: StyleAnalysis = { styles: ["Vibe Coder"] };
		const svg = renderStyleModule(data, themes.light, 0);
		expect(svg).toContain("#6f42c1");
	});

	it("applies Orchestrator blue color", () => {
		const data: StyleAnalysis = { styles: ["Orchestrator"] };
		const svg = renderStyleModule(data, themes.light, 0);
		expect(svg).toContain("#0969da");
	});

	it("applies Minimalist gray color", () => {
		const data: StyleAnalysis = { styles: ["Minimalist"] };
		const svg = renderStyleModule(data, themes.light, 0);
		expect(svg).toContain("#6e7781");
	});

	it("shows fallback text when no styles", () => {
		const data: StyleAnalysis = { styles: [] };
		const svg = renderStyleModule(data, themes.light, 0);
		expect(svg).toContain("Exploring...");
	});

	it("respects yOffset for positioning", () => {
		const data: StyleAnalysis = { styles: ["Minimalist"] };
		const svg = renderStyleModule(data, themes.light, 72);
		expect(svg).toContain("translate(0, 72)");
	});

	it("renders SVG group element", () => {
		const data: StyleAnalysis = { styles: ["Orchestrator"] };
		const svg = renderStyleModule(data, themes.light, 0);
		expect(svg).toContain("<g");
		expect(svg).toContain("</g>");
	});

	it("uses theme colors for dark theme", () => {
		const data: StyleAnalysis = { styles: [] };
		const svg = renderStyleModule(data, themes.dark, 0);
		expect(svg).toContain(themes.dark.textSecondary);
	});
});
