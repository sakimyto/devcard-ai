import type { CardData } from "~/analyzers/types";
import { renderCoauthorModule } from "./modules/coauthor";
import { renderHeatmapModule } from "./modules/heatmap";
import { renderScoreModule } from "./modules/score";
import { renderStyleModule } from "./modules/style";
import { renderToolsModule } from "./modules/tools";
import { getTheme } from "./themes";
import { svgRect, svgText } from "./utils";

export interface CardOptions {
	theme: string;
	modules: string[];
}

const DEFAULT_MODULES = ["style", "tools", "coauthor", "heatmap"];
const CARD_WIDTH = 400;
const HEADER_HEIGHT = 72;
const PADDING_BOTTOM = 12;
const FOOTER_HEIGHT = 24;

// Module heights vary by content type
const MODULE_HEIGHTS: Record<string, number> = {
	style: 40,
	tools: 40,
	coauthor: 48,
	score: 40,
	heatmap: 50,
};

const GRADE_COLORS: Record<string, string> = {
	S: "#a371f7",
	A: "#3fb950",
	B: "#58a6ff",
	C: "#d29922",
	D: "#6e7781",
};

export function renderCard(data: CardData, options: CardOptions): string {
	const theme = getTheme(options.theme);
	const modules =
		options.modules.length > 0 ? options.modules : DEFAULT_MODULES;

	const modulesSvg: string[] = [];
	let yOffset = HEADER_HEIGHT;

	for (const mod of modules) {
		switch (mod) {
			case "tools":
				modulesSvg.push(renderToolsModule(data.tools, theme, yOffset));
				break;
			case "coauthor":
				modulesSvg.push(renderCoauthorModule(data.coauthor, theme, yOffset));
				break;
			case "score":
				modulesSvg.push(renderScoreModule(data.score, theme, yOffset));
				break;
			case "style":
				modulesSvg.push(renderStyleModule(data.style, theme, yOffset));
				break;
			case "heatmap":
				modulesSvg.push(renderHeatmapModule(data.heatmap, theme, yOffset));
				break;
		}
		yOffset += MODULE_HEIGHTS[mod] ?? 40;
	}

	const cardHeight = yOffset + PADDING_BOTTOM + FOOTER_HEIGHT;

	const gradeColor = GRADE_COLORS[data.score.grade] ?? theme.textSecondary;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${cardHeight}" viewBox="0 0 ${CARD_WIDTH} ${cardHeight}">
  <defs>
    <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${theme.headerBg}" />
      <stop offset="100%" stop-color="${theme.bg}" />
    </linearGradient>
    <linearGradient id="sepGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.6" />
      <stop offset="50%" stop-color="${theme.accent}" stop-opacity="0.15" />
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0" />
    </linearGradient>
  </defs>

  <!-- Card background -->
  ${svgRect(0, 0, CARD_WIDTH, cardHeight, { fill: theme.bg, rx: 12 })}

  <!-- Border -->
  <rect x="0.5" y="0.5" width="${CARD_WIDTH - 1}" height="${cardHeight - 1}" fill="none" stroke="${theme.border}" stroke-width="1" rx="12" />

  <!-- Header background -->
  <rect x="1" y="1" width="${CARD_WIDTH - 2}" height="${HEADER_HEIGHT - 8}" fill="url(#headerGrad)" rx="11" />

  <!-- Username -->
  ${svgText(24, 34, data.username, { fontSize: 18, fill: theme.text, fontWeight: "bold" })}
  ${svgText(24, 52, "AI Dev Card", { fontSize: 10, fill: theme.textSecondary })}

  <!-- Grade badge (top-right) -->
  <rect x="${CARD_WIDTH - 52}" y="10" width="38" height="38" fill="${gradeColor}" rx="10" />
  <rect x="${CARD_WIDTH - 52}" y="10" width="38" height="38" fill="none" stroke="#ffffff" stroke-width="0.5" stroke-opacity="0.2" rx="10" />
  ${svgText(CARD_WIDTH - 33, 36, data.score.grade, { fontSize: 22, fill: "#ffffff", fontWeight: "bold", anchor: "middle" })}

  <!-- Separator -->
  <line x1="24" y1="${HEADER_HEIGHT - 4}" x2="${CARD_WIDTH - 24}" y2="${HEADER_HEIGHT - 4}" stroke="url(#sepGrad)" stroke-width="1" />

  ${modulesSvg.join("\n")}

  <!-- Footer -->
  ${svgText(CARD_WIDTH / 2, cardHeight - 10, "devcard-ai", { fontSize: 9, fill: theme.textSecondary, anchor: "middle" })}
</svg>`;
}

export function renderErrorCard(message: string, themeName: string): string {
	const theme = getTheme(themeName);
	const height = 80;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${height}" viewBox="0 0 ${CARD_WIDTH} ${height}">
  ${svgRect(0, 0, CARD_WIDTH, height, { fill: theme.bg, rx: 12 })}
  <rect x="0.5" y="0.5" width="${CARD_WIDTH - 1}" height="${height - 1}" fill="none" stroke="${theme.border}" rx="12" />
  ${svgText(CARD_WIDTH / 2, 35, message, { fontSize: 14, fill: theme.textSecondary, anchor: "middle" })}
  ${svgText(CARD_WIDTH / 2, 58, "devcard-ai", { fontSize: 10, fill: theme.textSecondary, anchor: "middle" })}
</svg>`;
}
