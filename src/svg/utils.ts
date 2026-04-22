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

export function pillWidth(label: string, opts: { extra?: number } = {}): number {
	return PILL_PAD_X * 2 + label.length * PILL_CHAR_WIDTH + (opts.extra ?? 0);
}

export function renderPill(
	x: number,
	y: number,
	label: string,
	opts: {
		width?: number;
		height?: number;
		fill: string;
		textColor: string;
		fontSize?: number;
		fontWeight?: string;
		rx?: number;
	},
): string {
	const h = opts.height ?? 18;
	const w = opts.width ?? pillWidth(label);
	const rx = opts.rx ?? h / 2;
	const fontSize = opts.fontSize ?? 10;
	return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${opts.fill}" rx="${rx}" />
${svgText(x + w / 2, y + h - 5, label, { fontSize, fill: opts.textColor, fontWeight: opts.fontWeight ?? 'normal', anchor: 'middle' })}`;
}
