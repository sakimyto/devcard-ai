export interface Theme {
	bg: string;
	border: string;
	text: string;
	textSecondary: string;
	barBg: string;
	barFill: string;
	accent: string;
	headerBg: string;
	badgeBg: string;
}

export const themes: Record<string, Theme> = {
	light: {
		bg: "#ffffff",
		border: "#e1e4e8",
		text: "#24292e",
		textSecondary: "#586069",
		barBg: "#eaecef",
		barFill: "#6f42c1",
		accent: "#6f42c1",
		headerBg: "#f6f8fa",
		badgeBg: "#ddf4ff",
	},
	dark: {
		bg: "#0d1117",
		border: "#30363d",
		text: "#c9d1d9",
		textSecondary: "#8b949e",
		barBg: "#21262d",
		barFill: "#a371f7",
		accent: "#a371f7",
		headerBg: "#161b22",
		badgeBg: "#1f2937",
	},
};

// SECURITY: Theme is resolved by key lookup only — never accept raw color values
// from user input. All theme values are hardcoded above.
export function getTheme(name: string): Theme {
	return themes[name] ?? themes.light;
}
