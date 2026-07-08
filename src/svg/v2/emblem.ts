import type { PatternType } from "~/analyzers/types";

// 各紋章は (0,0)-(24,24) の viewBox 前提のパス。呼び出し側が transform で配置する。
const EMBLEM_PATHS: Record<PatternType, string> = {
	"AI Native":
		'<path d="M13 2 L6 14 L11 14 L9 22 L18 9 L12.5 9 Z" fill="{c}" />',
	"Pair Programmer":
		'<circle cx="9" cy="12" r="6" fill="none" stroke="{c}" stroke-width="2.5" /><circle cx="15" cy="12" r="6" fill="none" stroke="{c}" stroke-width="2.5" />',
	Delegator:
		'<path d="M4 12 H12 M12 12 L18 6 M12 12 L18 18 M18 6 l-3 0 m3 0 l0 3 M18 18 l-3 0 m3 0 l0 -3" fill="none" stroke="{c}" stroke-width="2.5" stroke-linecap="round" />',
	"Selective User":
		'<circle cx="12" cy="12" r="8" fill="none" stroke="{c}" stroke-width="2.5" /><circle cx="12" cy="12" r="2.5" fill="{c}" />',
};

export function renderEmblem(
	pattern: PatternType,
	x: number,
	y: number,
	size: number,
	color: string,
): string {
	const scale = size / 24;
	const body = EMBLEM_PATHS[pattern].replaceAll("{c}", color);
	return `<g transform="translate(${x} ${y}) scale(${scale})">${body}</g>`;
}
