import type { ToolsAnalysis } from "~/analyzers/types";
import type { Theme } from "../themes";
import { svgRect, svgText } from "../utils";

const TOOL_COLORS: Record<string, string> = {
	claude: "#d4a574",
	cursor: "#00b4d8",
	copilot: "#6e7681",
	"agents-md": "#3fb950",
};

export function renderToolsModule(
	data: ToolsAnalysis,
	theme: Theme,
	yOffset: number,
): string {
	if (data.tools.length === 0) {
		return `
      <g transform="translate(0, ${yOffset})">
        ${svgText(24, 22, "Tools", { fontSize: 11, fill: theme.textSecondary })}
        ${svgText(90, 22, "None detected", { fontSize: 12, fill: theme.textSecondary })}
      </g>
    `;
	}

	let badgeX = 90;
	const badges = data.tools.map((tool) => {
		const color = TOOL_COLORS[tool.id] ?? theme.accent;
		const textWidth = tool.name.length * 7.5 + 20;
		const badge = `
      ${svgRect(badgeX, 4, textWidth, 26, { fill: theme.barBg, rx: 13 })}
      <rect x="${badgeX}" y="4" width="4" height="26" fill="${color}" rx="2" />
      ${svgText(badgeX + 12, 22, tool.name, { fontSize: 12, fill: theme.text })}
    `;
		badgeX += textWidth + 8;
		return badge;
	});

	return `
    <g transform="translate(0, ${yOffset})">
      ${svgText(24, 22, "Tools", { fontSize: 11, fill: theme.textSecondary })}
      ${badges.join("")}
    </g>
  `;
}
