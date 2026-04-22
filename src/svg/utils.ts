export function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export function svgText(
	x: number,
	y: number,
	content: string,
	opts: {
		fontSize?: number;
		fill?: string;
		fontWeight?: string;
		anchor?: string;
	} = {},
): string {
	const fontSize = opts.fontSize ?? 14;
	const fill = opts.fill ?? "#333";
	const fontWeight = opts.fontWeight ?? "normal";
	const anchor = opts.anchor ?? "start";
	return `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${fill}" font-weight="${fontWeight}" text-anchor="${anchor}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">${escapeXml(content)}</text>`;
}

export function svgRect(
	x: number,
	y: number,
	width: number,
	height: number,
	opts: { fill?: string; rx?: number } = {},
): string {
	const fill = opts.fill ?? "#eee";
	const rx = opts.rx ?? 0;
	return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" rx="${rx}" />`;
}

export const PILL_CHAR_WIDTH = 5.8;
export const PILL_PAD_X = 10;
export const PILL_ICON_WIDTH = 14;

export function pillWidth(label: string, opts: { icon?: boolean } = {}): number {
	const iconAllowance = opts.icon ? PILL_ICON_WIDTH : 0;
	return PILL_PAD_X * 2 + iconAllowance + label.length * PILL_CHAR_WIDTH;
}

// With `icon`, renders left-aligned icon + label; otherwise centered label.
export function renderPill(
	x: number,
	y: number,
	label: string,
	opts: {
		icon?: string;
		width?: number;
		height?: number;
		fill: string;
		textColor: string;
		fontSize?: number;
		fontWeight?: string;
		rx?: number;
	},
): string {
	const hasIcon = opts.icon !== undefined;
	const h = opts.height ?? (hasIcon ? 22 : 18);
	const w = opts.width ?? pillWidth(label, { icon: hasIcon });
	const rx = opts.rx ?? h / 2;
	const fontSize = opts.fontSize ?? 10;
	const rect = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${opts.fill}" rx="${rx}" />`;
	if (hasIcon) {
		const textY = y + h - 7;
		// Emoji icons ignore font-weight by design; only the label honors it.
		return `${rect}
<text x="${x + PILL_PAD_X}" y="${textY}" font-size="${fontSize}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">${escapeXml(opts.icon as string)}</text>
${svgText(x + PILL_PAD_X + PILL_ICON_WIDTH, textY, label, { fontSize, fill: opts.textColor, fontWeight: opts.fontWeight ?? '600' })}`;
	}
	return `${rect}
${svgText(x + w / 2, y + h - 5, label, { fontSize, fill: opts.textColor, fontWeight: opts.fontWeight ?? 'normal', anchor: 'middle' })}`;
}
