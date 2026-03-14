import type { CoauthorAnalysis } from "~/analyzers/types";
import type { Theme } from "../themes";
import { svgRect, svgText } from "../utils";

export function renderCoauthorModule(
	data: CoauthorAnalysis,
	theme: Theme,
	yOffset: number,
): string {
	const pct = Math.round(data.rate * 100);
	const barWidth = 160;
	const fillWidth = Math.round(barWidth * data.rate);

	return `
    <g transform="translate(0, ${yOffset})">
      ${svgText(20, 16, "AI Co-Authored", { fontSize: 12, fill: theme.textSecondary })}
      ${svgText(310, 16, `${pct}%`, { fontSize: 14, fill: theme.text, fontWeight: "bold", anchor: "end" })}
      ${svgRect(145, 4, barWidth, 14, { fill: theme.barBg, rx: 7 })}
      ${svgRect(145, 4, fillWidth, 14, { fill: theme.barFill, rx: 7 })}
    </g>
  `;
}
