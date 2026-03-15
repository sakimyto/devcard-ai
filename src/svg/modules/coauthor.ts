import type { CoauthorAnalysis } from "~/analyzers/types";
import type { Theme } from "../themes";
import { svgRect, svgText } from "../utils";

export function renderCoauthorModule(
	data: CoauthorAnalysis,
	theme: Theme,
	yOffset: number,
): string {
	const pct = Math.round(data.rate * 100);
	const barWidth = 200;
	const fillWidth = Math.max(Math.round(barWidth * data.rate), data.rate > 0 ? 4 : 0);

	return `
    <g transform="translate(0, ${yOffset})">
      ${svgText(24, 22, "AI Co-Authored", { fontSize: 11, fill: theme.textSecondary })}
      ${svgText(370, 22, `${pct}%`, { fontSize: 14, fill: theme.text, fontWeight: "bold", anchor: "end" })}
      ${svgRect(150, 10, barWidth, 16, { fill: theme.barBg, rx: 8 })}
      ${svgRect(150, 10, fillWidth, 16, { fill: theme.barFill, rx: 8 })}
    </g>
  `;
}
