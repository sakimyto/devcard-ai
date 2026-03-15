import type { CoauthorAnalysis } from "~/analyzers/types";
import type { Theme } from "../themes";
import { svgRect, svgText } from "../utils";

export function renderCoauthorModule(
	data: CoauthorAnalysis,
	theme: Theme,
	yOffset: number,
): string {
	const pct = Math.round(data.rate * 100);
	const barX = 150;
	const barWidth = 190;
	const fillWidth = Math.max(
		Math.round(barWidth * data.rate),
		data.rate > 0 ? 6 : 0,
	);
	const countLabel = `${data.aiCommits} / ${data.totalCommits} commits`;

	return `
    <g transform="translate(0, ${yOffset})">
      ${svgText(24, 20, "AI Co-Authored", { fontSize: 11, fill: theme.textSecondary })}
      ${svgRect(barX, 8, barWidth, 14, { fill: theme.barBg, rx: 7 })}
      ${svgRect(barX, 8, fillWidth, 14, { fill: theme.barFill, rx: 7 })}
      ${svgText(barX + barWidth + 8, 20, `${pct}%`, { fontSize: 13, fill: theme.text, fontWeight: "bold" })}
      ${svgText(barX, 36, countLabel, { fontSize: 9, fill: theme.textSecondary })}
    </g>
  `;
}
