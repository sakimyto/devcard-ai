import type { CardDataV2 } from "~/analyzers/types";
import { type Theme, getTheme } from "../themes";
import { svgRect, svgText, wrapText } from "../utils";
import { renderArt } from "./art";
import { renderEmblem } from "./emblem";
import { TIER_GEM_COLORS, renderFrame } from "./frame";

export const CARD_W = 750;
export const CARD_H = 1050;
const PAD = 44;

// Tier gem occupies the top-right corner (left edge at CARD_W - PAD - 92).
// Shrink the nameplate so a max-length (39-char GitHub login) username never
// slides under the gem. Uses an approx bold-glyph advance of 0.58em; short
// names stay at the 42px hero size.
const NAME_MAX_WIDTH = CARD_W - PAD - 92 - 16 - PAD; // 554px, name x=PAD → gem
function nameFontSize(len: number): number {
	const fit = Math.floor(NAME_MAX_WIDTH / (Math.max(1, len) * 0.58));
	return Math.max(20, Math.min(42, fit));
}

function statBar(
	label: string,
	value: number,
	y: number,
	theme: Theme,
): string {
	const barX = PAD + 190;
	const barW = CARD_W - barX - PAD - 64;
	const filled = Math.round((barW * Math.max(0, Math.min(100, value))) / 100);
	return `${svgText(PAD, y + 15, label, { fontSize: 18, fill: theme.textSecondary, fontWeight: "600" })}
${svgRect(barX, y, barW, 18, { fill: theme.barBg, rx: 9 })}
${filled > 0 ? svgRect(barX, y, Math.max(filled, 18), 18, { fill: theme.accent, rx: 9 }) : ""}
${svgText(barX + barW + 16, y + 15, String(value), { fontSize: 20, fill: theme.text, fontWeight: "bold" })}`;
}

function tierGem(
	grade: CardDataV2["stats"]["grade"],
	x: number,
	y: number,
): string {
	const c = TIER_GEM_COLORS[grade];
	const size = 92;
	const half = size / 2;
	return `<g transform="translate(${x} ${y})">
<polygon points="${half},0 ${size},${half} ${half},${size} 0,${half}" fill="${c}" />
<polygon points="${half},8 ${size - 8},${half} ${half},${size - 8} 8,${half}" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2" />
${svgText(half, half + 12, grade, { fontSize: 34, fill: "#ffffff", fontWeight: "bold", anchor: "middle" })}
</g>`;
}

export function renderCardV2(
	data: CardDataV2,
	options: { theme: string },
): string {
	const theme = getTheme(options.theme);
	const { defs, frame } = renderFrame(data.stats.grade, CARD_W, CARD_H);

	// --- name plate ---
	const namePlate = `${svgText(PAD, 84, "AI BUILDER", { fontSize: 16, fill: theme.textSecondary, fontWeight: "600" })}
${svgText(PAD, 128, data.username, { fontSize: nameFontSize(data.username.length), fill: theme.text, fontWeight: "bold" })}`;

	// --- archetype row ---
	const archetypeY = 156;
	const emblem = renderEmblem(
		data.pattern.pattern,
		PAD,
		archetypeY,
		30,
		theme.accent,
	);
	const archetypeLabel = svgText(
		PAD + 40,
		archetypeY + 23,
		data.pattern.pattern,
		{
			fontSize: 22,
			fill: theme.accent,
			fontWeight: "600",
		},
	);
	const verified = data.toolAttribution.verified
		? `${svgText(PAD + 40 + data.pattern.pattern.length * 12 + 24, archetypeY + 23, "✓ verified", { fontSize: 16, fill: theme.textSecondary })}`
		: "";

	// --- art area ---
	const artY = 210;
	const artH = 290;
	const artW = CARD_W - PAD * 2;
	const art = `<clipPath id="artClip"><rect x="${PAD}" y="${artY}" width="${artW}" height="${artH}" rx="18" /></clipPath>
<g clip-path="url(#artClip)"><g transform="translate(${PAD} ${artY})">${renderArt(
		{
			seed: data.seed,
			width: artW,
			height: artH,
			accent: theme.accent,
			bg: theme.headerBg,
		},
	)}</g></g>
<rect x="${PAD}" y="${artY}" width="${artW}" height="${artH}" rx="18" fill="none" stroke="${theme.border}" />`;

	// --- stats ---
	const statsY = 548;
	const stats = `${svgText(PAD, statsY - 18, "STATS", { fontSize: 15, fill: theme.textSecondary, fontWeight: "600" })}
${statBar("VELOCITY", data.stats.velocity, statsY, theme)}
${statBar("DIVERSITY", data.stats.diversity, statsY + 44, theme)}
${statBar("CONSISTENCY", data.stats.consistency, statsY + 88, theme)}`;

	// --- tool loadout ---
	const toolsY = 716;
	const CHIP_ROW_RIGHT = CARD_W - PAD; // 706: chips must not cross this edge
	const toolChips: string[] = [];
	let chipX = PAD;
	for (const t of data.toolAttribution.tools.slice(0, 3)) {
		const label = `${t.toolName} ${Math.round(t.percentage)}%`;
		const cw = 24 + label.length * 11;
		if (chipX + cw > CHIP_ROW_RIGHT) break;
		toolChips.push(`${svgRect(chipX, toolsY, cw, 36, { fill: theme.badgeBg, rx: 18 })}
${svgText(chipX + cw / 2, toolsY + 24, label, { fontSize: 17, fill: theme.text, fontWeight: "600", anchor: "middle" })}`);
		chipX += cw + 12;
	}
	const commitToolIds = new Set(
		data.toolAttribution.tools.map((t) => t.toolId),
	);
	for (const e of data.equipped.equipped
		.filter((e) => !commitToolIds.has(e.toolId))
		.slice(0, 2)) {
		const label = `${e.toolName} · equipped`;
		const cw = 24 + label.length * 10;
		if (chipX + cw > CHIP_ROW_RIGHT) break;
		toolChips.push(`<rect x="${chipX}" y="${toolsY}" width="${cw}" height="36" rx="18" fill="none" stroke="${theme.accent}" stroke-opacity="0.5" stroke-dasharray="4 3" />
${svgText(chipX + cw / 2, toolsY + 24, label, { fontSize: 15, fill: theme.textSecondary, anchor: "middle" })}`);
		chipX += cw + 12;
	}
	const loadout = `${svgText(PAD, toolsY - 14, "LOADOUT", { fontSize: 15, fill: theme.textSecondary, fontWeight: "600" })}
${toolChips.length > 0 ? toolChips.join("\n") : svgText(PAD, toolsY + 24, "no tools detected yet", { fontSize: 16, fill: theme.textSecondary })}`;

	// --- languages ---
	const langY = 812;
	const langItems = data.languages.languages
		.map((l, i) => {
			const x = PAD + i * 180;
			return `<circle cx="${x + 8}" cy="${langY + 18}" r="7" fill="${l.color}" />
${svgText(x + 24, langY + 24, l.name, { fontSize: 18, fill: theme.text })}`;
		})
		.join("\n");
	const langs = `${svgText(PAD, langY, "TYPES", { fontSize: 15, fill: theme.textSecondary, fontWeight: "600" })}
${data.languages.languages.length > 0 ? langItems : svgText(PAD, langY + 24, "—", { fontSize: 16, fill: theme.textSecondary })}`;

	// --- flavor ---
	const flavorY = 900;
	const flavorLines = wrapText(data.flavor, 46, 2);
	const flavor = flavorLines
		.map((line, i) =>
			svgText(CARD_W / 2, flavorY + i * 28, line, {
				fontSize: 19,
				fill: theme.textSecondary,
				anchor: "middle",
			}),
		)
		.join("\n");
	const flavorRule = `<line x1="${PAD + 60}" y1="${flavorY - 30}" x2="${CARD_W - PAD - 60}" y2="${flavorY - 30}" stroke="${theme.border}" stroke-width="1" />`;

	// --- footer ---
	const footer = `${svgText(PAD, CARD_H - 40, `${data.serial} · ${data.issuedYear} · public · 12wk`, { fontSize: 15, fill: theme.textSecondary })}
${svgText(CARD_W - PAD, CARD_H - 40, "devcard-ai", { fontSize: 15, fill: theme.textSecondary, anchor: "end" })}`;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
<defs>${defs}</defs>
${svgRect(0, 0, CARD_W, CARD_H, { fill: theme.bg, rx: 36 })}
${frame}
${namePlate}
${emblem}
${archetypeLabel}
${verified}
${art}
${stats}
${loadout}
${langs}
${flavorRule}
${flavor}
${tierGem(data.stats.grade, CARD_W - PAD - 92, 56)}
${footer}
</svg>`;
}

export function renderPlaceholderCard(
	username: string,
	themeName: string,
): string {
	const theme = getTheme(themeName);
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
${svgRect(0, 0, CARD_W, CARD_H, { fill: theme.bg, rx: 36 })}
<rect x="10" y="10" width="${CARD_W - 20}" height="${CARD_H - 20}" rx="28" fill="none" stroke="${theme.border}" stroke-width="6" stroke-dasharray="10 8" />
${svgText(CARD_W / 2, CARD_H / 2 - 20, "Summoning…", { fontSize: 34, fill: theme.text, fontWeight: "bold", anchor: "middle" })}
${svgText(CARD_W / 2, CARD_H / 2 + 24, `${username}'s card is being drawn`, { fontSize: 18, fill: theme.textSecondary, anchor: "middle" })}
${svgText(CARD_W / 2, CARD_H - 48, "devcard-ai", { fontSize: 15, fill: theme.textSecondary, anchor: "middle" })}
</svg>`;
}
