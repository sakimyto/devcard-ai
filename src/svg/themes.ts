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
	toolColors: Record<string, [string, string]>
	usageColors: {
		feature: string
		bugfix: string
		test: string
		refactor: string
	}
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
		toolColors: {
			claude: ['#d4a574', '#c4956a'],
			codex: ['#10a37f', '#0d8c6d'],
			copilot: ['#6e7681', '#5a6069'],
			cursor: ['#00b4d8', '#0096b7'],
			devin: ['#a371f7', '#8957e5'],
			sweep: ['#3fb950', '#2ea043'],
			unknown: ['#8b949e', '#6e7681'],
		},
		usageColors: {
			feature: '#2ea043',
			bugfix: '#cf222e',
			test: '#9a6700',
			refactor: '#0969da',
		},
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
		toolColors: {
			claude: ['#d4a574', '#c4956a'],
			codex: ['#10a37f', '#0d8c6d'],
			copilot: ['#6e7681', '#5a6069'],
			cursor: ['#00b4d8', '#0096b7'],
			devin: ['#a371f7', '#8957e5'],
			sweep: ['#3fb950', '#2ea043'],
			unknown: ['#8b949e', '#6e7681'],
		},
		usageColors: {
			feature: '#3fb950',
			bugfix: '#f47067',
			test: '#d29922',
			refactor: '#58a6ff',
		},
	},
};

// SECURITY: Theme is resolved by key lookup only — never accept raw color values
// from user input. All theme values are hardcoded above.
export function getTheme(name: string): Theme {
	return themes[name] ?? themes.light;
}
