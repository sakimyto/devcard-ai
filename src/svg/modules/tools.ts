import type { ToolsAnalysis } from "~/analyzers/types";
import type { Theme } from "../themes";
import { svgRect, svgText } from "../utils";

const TOOL_ICONS: Record<string, string> = {
	claude: "●",
	cursor: "◆",
	copilot: "■",
	"agents-md": "▲",
};

const TOOL_COLORS: Record<string, string> = {
	claude: "#d4a574",
	cursor: "#00b4d8",
	copilot: "#6e7681",
	"agents-md": "#3fb950",
};

const TOOL_BADGE_WIDTHS: Record<string, number> = {
	Claude: 80,
	Cursor: 80,
	Copilot: 82,
	"Agents.md": 100,
};

export function renderToolsModule(
	data: ToolsAnalysis,
	theme: Theme,
	yOffset: number,
): string {
	if (data.tools.length === 0) {
		return `
      <g transform="translate(0, ${yOffset})">
        ${svgText(24, 20, "Tools", { fontSize: 11, fill: theme.textSecondary })}
        ${svgText(90, 20, "None detected", { fontSize: 12, fill: theme.textSecondary })}
      </g>
    `;
	}

	let badgeX = 90;
	const badges = data.tools.map((tool) => {
		const color = TOOL_COLORS[tool.id] ?? theme.accent;
		const icon = TOOL_ICONS[tool.id] ?? "●";
		const textWidth = TOOL_BADGE_WIDTHS[tool.name] ?? tool.name.length * 7.2 + 28;
		const badge = `
      ${svgRect(badgeX, 4, textWidth, 26, { fill: theme.barBg, rx: 13 })}
      ${svgText(badgeX + 10, 22, icon, { fontSize: 10, fill: color })}
      ${svgText(badgeX + 22, 22, tool.name, { fontSize: 12, fill: theme.text })}
    `;
		badgeX += textWidth + 6;
		return badge;
	});

	return `
    <g transform="translate(0, ${yOffset})">
      ${svgText(24, 20, "Tools", { fontSize: 11, fill: theme.textSecondary })}
      ${badges.join("")}
    </g>
  `;
}
