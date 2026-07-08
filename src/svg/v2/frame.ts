import type { Grade } from "~/analyzers/types";

const METAL_STOPS: Record<"A" | "B" | "C", [string, string, string]> = {
	A: ["#f5d76e", "#b8860b", "#f5d76e"],
	B: ["#e8edf2", "#8a939e", "#dfe5eb"],
	C: ["#e0955e", "#7a4a1f", "#cd7f32"],
};

export function renderFrame(
	grade: Grade,
	w: number,
	h: number,
): { defs: string; frame: string } {
	const inset = 10;
	const rectAttrs = `x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}" rx="28" fill="none"`;

	if (grade === "S") {
		const defs = `<linearGradient id="holoGrad" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0%" stop-color="#ff6ec7" />
  <stop offset="30%" stop-color="#ffc36e" />
  <stop offset="60%" stop-color="#6ef3ff" />
  <stop offset="100%" stop-color="#a06eff" />
  <animateTransform attributeName="gradientTransform" type="rotate" from="0 0.5 0.5" to="360 0.5 0.5" dur="8s" repeatCount="indefinite" />
</linearGradient>
<linearGradient id="shineGrad" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0%" stop-color="#ffffff" stop-opacity="0" />
  <stop offset="50%" stop-color="#ffffff" stop-opacity="0.35" />
  <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
</linearGradient>
<clipPath id="frameClip"><rect x="0" y="0" width="${w}" height="${h}" rx="36" /></clipPath>`;
		const frame = `<rect ${rectAttrs} stroke="url(#holoGrad)" stroke-width="8" />
<g clip-path="url(#frameClip)">
  <rect x="-260" y="0" width="200" height="${h}" fill="url(#shineGrad)" transform="skewX(-18)">
    <animate attributeName="x" from="-260" to="${w + 260}" dur="5s" repeatCount="indefinite" />
  </rect>
</g>`;
		return { defs, frame };
	}

	if (grade === "A" || grade === "B" || grade === "C") {
		const [s1, s2, s3] = METAL_STOPS[grade];
		const defs = `<linearGradient id="metal${grade}" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0%" stop-color="${s1}" />
  <stop offset="50%" stop-color="${s2}" />
  <stop offset="100%" stop-color="${s3}" />
</linearGradient>`;
		const frame = `<rect ${rectAttrs} stroke="url(#metal${grade})" stroke-width="8" />
<rect x="${inset + 6}" y="${inset + 6}" width="${w - (inset + 6) * 2}" height="${h - (inset + 6) * 2}" rx="24" fill="none" stroke="#ffffff" stroke-opacity="0.15" stroke-width="1" />`;
		return { defs, frame };
	}

	return {
		defs: "",
		frame: `<rect ${rectAttrs} stroke="#6e7681" stroke-width="6" stroke-opacity="0.8" />`,
	};
}

export const TIER_GEM_COLORS: Record<Grade, string> = {
	S: "#a06eff",
	A: "#b8860b",
	B: "#8a939e",
	C: "#cd7f32",
	D: "#6e7681",
};
