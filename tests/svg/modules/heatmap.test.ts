import { describe, expect, it } from "vitest";
import type { HeatmapAnalysis } from "~/analyzers/types";
import { renderHeatmapModule } from "~/svg/modules/heatmap";
import { themes } from "~/svg/themes";

const makeHourly = (peak: number, count: number): number[] => {
	const arr = new Array(24).fill(0);
	arr[peak] = count;
	return arr;
};

describe("renderHeatmapModule", () => {
	it("renders 24 rect elements for the heatmap bar", () => {
		const data: HeatmapAnalysis = {
			hourly: makeHourly(14, 5),
			peakHour: 14,
			totalAiCommits: 5,
		};
		const svg = renderHeatmapModule(data, themes.light, 0);
		const rectCount = (svg.match(/<rect/g) ?? []).length;
		expect(rectCount).toBeGreaterThanOrEqual(24);
	});

	it("shows Activity label", () => {
		const data: HeatmapAnalysis = {
			hourly: makeHourly(9, 3),
			peakHour: 9,
			totalAiCommits: 3,
		};
		const svg = renderHeatmapModule(data, themes.light, 0);
		expect(svg).toContain("Activity");
	});

	it("shows peak hour annotation", () => {
		const data: HeatmapAnalysis = {
			hourly: makeHourly(14, 10),
			peakHour: 14,
			totalAiCommits: 10,
		};
		const svg = renderHeatmapModule(data, themes.light, 0);
		expect(svg).toContain("Peak: 14:00");
	});

	it("respects yOffset for positioning", () => {
		const data: HeatmapAnalysis = {
			hourly: makeHourly(0, 1),
			peakHour: 0,
			totalAiCommits: 1,
		};
		const svg = renderHeatmapModule(data, themes.light, 108);
		expect(svg).toContain("translate(0, 108)");
	});

	it("renders SVG group element", () => {
		const data: HeatmapAnalysis = {
			hourly: makeHourly(20, 7),
			peakHour: 20,
			totalAiCommits: 7,
		};
		const svg = renderHeatmapModule(data, themes.light, 0);
		expect(svg).toContain("<g");
		expect(svg).toContain("</g>");
	});

	it("handles all-zero hourly data gracefully", () => {
		const data: HeatmapAnalysis = {
			hourly: new Array(24).fill(0),
			peakHour: 0,
			totalAiCommits: 0,
		};
		const svg = renderHeatmapModule(data, themes.light, 0);
		expect(svg).toContain("Activity");
	});

	it("uses dark theme colors", () => {
		const data: HeatmapAnalysis = {
			hourly: makeHourly(22, 4),
			peakHour: 22,
			totalAiCommits: 4,
		};
		const svg = renderHeatmapModule(data, themes.dark, 0);
		expect(svg).toContain(themes.dark.barBg);
	});
});
