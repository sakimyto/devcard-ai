import type { StyleAnalysis, StyleType } from "~/analyzers/types";
import type { Theme } from "../themes";
import { svgRect, svgText } from "../utils";

const STYLE_COLORS: Record<StyleType, string> = {
	"TDD Architect": "#2ea44f",
	"Vibe Coder": "#8b5cf6",
	Orchestrator: "#58a6ff",
	Minimalist: "#8b949e",
};

export function renderStyleModule(
	data: StyleAnalysis,
	theme: Theme,
	yOffset: number,
): string {
	if (data.styles.length === 0) {
		return `
    <g transform="translate(0, ${yOffset})">
      ${svgText(24, 20, "Style", { fontSize: 11, fill: theme.textSecondary })}
      ${svgText(90, 20, "Exploring...", { fontSize: 12, fill: theme.textSecondary })}
    </g>
  `;
	}

	let badgeX = 90;
	const badges = data.styles.map((style) => {
		const color = STYLE_COLORS[style] ?? theme.textSecondary;
		const textWidth = style.length * 7.5 + 20;
		const badge = `
      ${svgRect(badgeX, 4, textWidth, 26, { fill: color, rx: 13 })}
      ${svgText(badgeX + 10, 22, style, { fontSize: 12, fill: "#ffffff", fontWeight: "bold" })}
    `;
		badgeX += textWidth + 8;
		return badge;
	});

	return `
    <g transform="translate(0, ${yOffset})">
      ${svgText(24, 22, "Style", { fontSize: 11, fill: theme.textSecondary })}
      ${badges.join("")}
    </g>
  `;
}
