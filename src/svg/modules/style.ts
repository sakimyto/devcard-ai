import type { StyleAnalysis, StyleType } from "~/analyzers/types";
import type { Theme } from "../themes";
import { svgRect, svgText } from "../utils";

const STYLE_COLORS: Record<StyleType, string> = {
	"TDD Architect": "#2ea44f",
	"Vibe Coder": "#6f42c1",
	Orchestrator: "#0969da",
	Minimalist: "#6e7781",
};

export function renderStyleModule(
	data: StyleAnalysis,
	theme: Theme,
	yOffset: number,
): string {
	const label = svgText(20, 16, "Style", {
		fontSize: 12,
		fill: theme.textSecondary,
	});

	if (data.styles.length === 0) {
		return `
    <g transform="translate(0, ${yOffset})">
      ${label}
      ${svgText(76, 16, "Exploring...", { fontSize: 12, fill: theme.textSecondary })}
    </g>
  `;
	}

	let badgeX = 76;
	const badges = data.styles.map((style) => {
		const color = STYLE_COLORS[style] ?? theme.textSecondary;
		const textWidth = style.length * 7 + 16;
		const badge = `
      ${svgRect(badgeX, 0, textWidth, 22, { fill: color, rx: 11 })}
      ${svgText(badgeX + 8, 15, style, { fontSize: 11, fill: "#ffffff" })}
    `;
		badgeX += textWidth + 8;
		return badge;
	});

	return `
    <g transform="translate(0, ${yOffset})">
      ${label}
      ${badges.join("")}
    </g>
  `;
}
