import type { HeatmapAnalysis } from "~/analyzers/types";
import type { Theme } from "../themes";
import { svgText } from "../utils";

const CELL_SIZE = 12;
const CELL_GAP = 2;
const HEATMAP_START_X = 90;

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
		const x = HEATMAP_START_X + hour * (CELL_SIZE + CELL_GAP);
		if (count === 0) {
			return `<rect x="${x}" y="6" width="${CELL_SIZE}" height="${CELL_SIZE}" fill="${theme.barBg}" rx="2" />`;
		}
		const opacity = intensityOpacity(count, max);
		return `<rect x="${x}" y="6" width="${CELL_SIZE}" height="${CELL_SIZE}" fill="${theme.barFill}" opacity="${opacity}" rx="2" />`;
	});

	const peakLabel = `Peak ${String(data.peakHour).padStart(2, "0")}:00`;

	return `
    <g transform="translate(0, ${yOffset})">
      ${svgText(24, 18, "Activity", { fontSize: 11, fill: theme.textSecondary })}
      ${cells.join("\n      ")}
      ${svgText(24, 34, peakLabel, { fontSize: 9, fill: theme.textSecondary })}
    </g>
  `;
}
