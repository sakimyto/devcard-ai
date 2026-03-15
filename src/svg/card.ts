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

const DEFAULT_MODULES = ["tools", "coauthor", "score"];
const CARD_WIDTH = 340;
const MODULE_HEIGHT = 36;
const HEADER_HEIGHT = 56;
const PADDING_BOTTOM = 16;
const FOOTER_HEIGHT = 20;

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
		yOffset += MODULE_HEIGHT;
	}

	const cardHeight = yOffset + PADDING_BOTTOM + FOOTER_HEIGHT;

	// Gradient separator line (dashed accent)
	const separatorY = HEADER_HEIGHT - 4;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${cardHeight}" viewBox="0 0 ${CARD_WIDTH} ${cardHeight}">
  <defs>
    <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${theme.headerBg}" />
      <stop offset="100%" stop-color="${theme.bg}" />
    </linearGradient>
    <linearGradient id="sepGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.8" />
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0" />
    </linearGradient>
  </defs>

  <!-- Card background -->
  ${svgRect(0, 0, CARD_WIDTH, cardHeight, { fill: theme.bg, rx: 10 })}

  <!-- Outer border (double-line effect: slightly offset inner) -->
  <rect x="1" y="1" width="${CARD_WIDTH - 2}" height="${cardHeight - 2}" fill="none" stroke="${theme.border}" stroke-width="2" rx="9" />
  <rect x="3.5" y="3.5" width="${CARD_WIDTH - 7}" height="${cardHeight - 7}" fill="none" stroke="${theme.border}" stroke-width="0.5" rx="7" opacity="0.5" />

  <!-- Colored header bar -->
  <rect x="2" y="2" width="${CARD_WIDTH - 4}" height="${HEADER_HEIGHT - 8}" fill="url(#headerGrad)" rx="8" />

  <!-- Username with robot emoji -->
  ${svgText(20, 30, "🤖 " + data.username, { fontSize: 16, fill: theme.text, fontWeight: "bold" })}
  ${svgText(20, 46, "devcard", { fontSize: 9, fill: theme.textSecondary })}

  <!-- Stylish gradient separator -->
  <line x1="20" y1="${separatorY}" x2="${CARD_WIDTH - 20}" y2="${separatorY}" stroke="url(#sepGrad)" stroke-width="1.5" />

  ${modulesSvg.join("\n")}
  ${svgText(CARD_WIDTH / 2, cardHeight - 8, "Powered by devcard-ai", { fontSize: 9, fill: theme.textSecondary, anchor: "middle" })}
</svg>`;
}

export function renderErrorCard(message: string, themeName: string): string {
	const theme = getTheme(themeName);
	const height = 80;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${height}" viewBox="0 0 ${CARD_WIDTH} ${height}">
  ${svgRect(0, 0, CARD_WIDTH, height, { fill: theme.bg, rx: 8 })}
  <rect x="0.5" y="0.5" width="${CARD_WIDTH - 1}" height="${height - 1}" fill="none" stroke="${theme.border}" rx="8" />
  ${svgText(CARD_WIDTH / 2, 35, message, { fontSize: 14, fill: theme.textSecondary, anchor: "middle" })}
  ${svgText(CARD_WIDTH / 2, 58, "devcard-ai", { fontSize: 10, fill: theme.textSecondary, anchor: "middle" })}
</svg>`;
}
