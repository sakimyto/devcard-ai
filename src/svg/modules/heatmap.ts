import type { HeatmapAnalysis } from "~/analyzers/types";
import type { Theme } from "../themes";
import { svgText } from "../utils";

const CELL_WIDTH = 8;
const CELL_HEIGHT = 14;
const CELL_GAP = 2;
const HEATMAP_START_X = 76;

function intensityOpacity(count: number, max: number): number {
	if (max === 0 || count === 0) return 0;
	const ratio = count / max;
	if (ratio >= 0.75) return 1;
	if (ratio >= 0.5) return 0.65;
	if (ratio >= 0.25) return 0.35;
	return 0.15;
}

export function renderHeatmapModule(
	data: HeatmapAnalysis,
	theme: Theme,
	yOffset: number,
): string {
	const max = Math.max(...data.hourly, 1);
	const cells = data.hourly.map((count, hour) => {
		const x = HEATMAP_START_X + hour * (CELL_WIDTH + CELL_GAP);
		if (count === 0) {
			return `<rect x="${x}" y="4" width="${CELL_WIDTH}" height="${CELL_HEIGHT}" fill="${theme.barBg}" rx="2" />`;
		}
		const opacity = intensityOpacity(count, max);
		return `<rect x="${x}" y="4" width="${CELL_WIDTH}" height="${CELL_HEIGHT}" fill="${theme.barFill}" opacity="${opacity}" rx="2" />`;
	});

	const peakLabel = `Peak: ${String(data.peakHour).padStart(2, "0")}:00`;
	const peakX = HEATMAP_START_X + 24 * (CELL_WIDTH + CELL_GAP) + 4;

	return `
    <g transform="translate(0, ${yOffset})">
      ${svgText(20, 16, "Activity", { fontSize: 12, fill: theme.textSecondary })}
      ${cells.join("\n      ")}
      ${svgText(peakX, 15, peakLabel, { fontSize: 10, fill: theme.textSecondary })}
    </g>
  `;
}
