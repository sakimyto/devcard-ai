export interface Theme {
  bg: string
  border: string
  text: string
  textSecondary: string
  barBg: string
  barFill: string
  accent: string
  headerBg: string
  badgeBg: string
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
    bg: '#ffffff',
    border: '#e1e4e8',
    text: '#24292e',
    textSecondary: '#586069',
    barBg: '#eaecef',
    barFill: '#6f42c1',
    accent: '#6f42c1',
    headerBg: '#f6f8fa',
    badgeBg: '#ddf4ff',
    toolColors: {
      claude: ['#d4a574', '#c4956a'],
      codex: ['#10a37f', '#0d8c6d'],
      copilot: ['#6e7681', '#5a6069'],
      cursor: ['#00b4d8', '#0096b7'],
      windsurf: ['#00c8ff', '#00a3d9'],
      aider: ['#e06c75', '#c75b64'],
      cody: ['#ff5543', '#e04433'],
      amazonq: ['#ff9900', '#e68a00'],
      gemini: ['#4285f4', '#3574d4'],
      devin: ['#a371f7', '#8957e5'],
      sweep: ['#3fb950', '#2ea043'],
      // Task 23: 世界の AI ツール（各社ブランド近似色。light/dark 同値）
      deepseek: ['#4d6bfe', '#4d6bfe'],
      qwen: ['#615ced', '#615ced'],
      kimi: ['#6e56cf', '#6e56cf'],
      mistral: ['#ff7000', '#ff7000'],
      grok: ['#5c5c5c', '#5c5c5c'],
      cline: ['#1e88e5', '#1e88e5'],
      roo: ['#6c5ce7', '#6c5ce7'],
      continue: ['#3b82f6', '#3b82f6'],
      zed: ['#084ccf', '#084ccf'],
      junie: ['#ff318c', '#ff318c'],
      amp: ['#e5484d', '#e5484d'],
      openhands: ['#d4a017', '#d4a017'],
      goose: ['#16a085', '#16a085'],
      kiro: ['#a855f7', '#a855f7'],
      trae: ['#e5326b', '#e5326b'],
      augment: ['#2563eb', '#2563eb'],
      jules: ['#34a853', '#34a853'],
      replit: ['#f26207', '#f26207'],
      v0: ['#444444', '#444444'],
      bolt: ['#1389fd', '#1389fd'],
      lovable: ['#ff4d8d', '#ff4d8d'],
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
    bg: '#0d1117',
    border: '#30363d',
    text: '#c9d1d9',
    textSecondary: '#8b949e',
    barBg: '#21262d',
    barFill: '#a371f7',
    accent: '#a371f7',
    headerBg: '#161b22',
    badgeBg: '#1f2937',
    toolColors: {
      claude: ['#d4a574', '#c4956a'],
      codex: ['#10a37f', '#0d8c6d'],
      copilot: ['#6e7681', '#5a6069'],
      cursor: ['#00b4d8', '#0096b7'],
      windsurf: ['#00c8ff', '#00a3d9'],
      aider: ['#e06c75', '#c75b64'],
      cody: ['#ff5543', '#e04433'],
      amazonq: ['#ff9900', '#e68a00'],
      gemini: ['#4285f4', '#3574d4'],
      devin: ['#a371f7', '#8957e5'],
      sweep: ['#3fb950', '#2ea043'],
      // Task 23: 世界の AI ツール（各社ブランド近似色。light/dark 同値）
      deepseek: ['#4d6bfe', '#4d6bfe'],
      qwen: ['#615ced', '#615ced'],
      kimi: ['#6e56cf', '#6e56cf'],
      mistral: ['#ff7000', '#ff7000'],
      grok: ['#5c5c5c', '#5c5c5c'],
      cline: ['#1e88e5', '#1e88e5'],
      roo: ['#6c5ce7', '#6c5ce7'],
      continue: ['#3b82f6', '#3b82f6'],
      zed: ['#084ccf', '#084ccf'],
      junie: ['#ff318c', '#ff318c'],
      amp: ['#e5484d', '#e5484d'],
      openhands: ['#d4a017', '#d4a017'],
      goose: ['#16a085', '#16a085'],
      kiro: ['#a855f7', '#a855f7'],
      trae: ['#e5326b', '#e5326b'],
      augment: ['#2563eb', '#2563eb'],
      jules: ['#34a853', '#34a853'],
      replit: ['#f26207', '#f26207'],
      v0: ['#444444', '#444444'],
      bolt: ['#1389fd', '#1389fd'],
      lovable: ['#ff4d8d', '#ff4d8d'],
      unknown: ['#8b949e', '#6e7681'],
    },
    usageColors: {
      feature: '#3fb950',
      bugfix: '#f47067',
      test: '#d29922',
      refactor: '#58a6ff',
    },
  },
}

// SECURITY: Theme is resolved by key lookup only — never accept raw color values
// from user input. All theme values are hardcoded above.
export function getTheme(name: string): Theme {
  return themes[name] ?? themes.light
}
