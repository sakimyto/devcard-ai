export interface Theme {
  // LP のテーマ選択に出る表示名
  label: string
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

// AI ツールのブランド色はテーマに依存しない（Claude のオレンジはどの配色でも Claude のオレンジ）。
// テーマごとに複製すると、ツールを1つ足すたびにテーマ数ぶんの同じ編集が要る。
const TOOL_COLORS: Record<string, [string, string]> = {
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
}

// テーマ1件を書くのに必要な最小限。barFill は指定が無ければ accent と同じ
// （既存の light / dark はどちらも一致していた）。
interface Palette {
  label: string
  bg: string
  border: string
  text: string
  textSecondary: string
  barBg: string
  accent: string
  headerBg: string
  badgeBg: string
  barFill?: string
  usage: { feature: string; bugfix: string; test: string; refactor: string }
}

function theme(p: Palette): Theme {
  return {
    label: p.label,
    bg: p.bg,
    border: p.border,
    text: p.text,
    textSecondary: p.textSecondary,
    barBg: p.barBg,
    barFill: p.barFill ?? p.accent,
    accent: p.accent,
    headerBg: p.headerBg,
    badgeBg: p.badgeBg,
    toolColors: TOOL_COLORS,
    usageColors: p.usage,
  }
}

// エンジニアが自分のエディタ配色を選べるようにするのが目的。各配色は元テーマの
// 公式パレットから bg / border / text / accent を引いている。
// キーはそのまま ?theme= の値になるので、追加・改名は URL 互換性の変更にあたる。
export const themes = {
  light: theme({
    label: 'Light',
    bg: '#ffffff',
    border: '#e1e4e8',
    text: '#24292e',
    textSecondary: '#586069',
    barBg: '#eaecef',
    accent: '#6f42c1',
    headerBg: '#f6f8fa',
    badgeBg: '#ddf4ff',
    usage: { feature: '#2ea043', bugfix: '#cf222e', test: '#9a6700', refactor: '#0969da' },
  }),
  dark: theme({
    label: 'Dark',
    bg: '#0d1117',
    border: '#30363d',
    text: '#c9d1d9',
    textSecondary: '#8b949e',
    barBg: '#21262d',
    accent: '#a371f7',
    headerBg: '#161b22',
    badgeBg: '#1f2937',
    usage: { feature: '#3fb950', bugfix: '#f47067', test: '#d29922', refactor: '#58a6ff' },
  }),
  dracula: theme({
    label: 'Dracula',
    bg: '#282a36',
    border: '#44475a',
    text: '#f8f8f2',
    textSecondary: '#6272a4',
    barBg: '#44475a',
    accent: '#bd93f9',
    headerBg: '#21222c',
    badgeBg: '#44475a',
    usage: { feature: '#50fa7b', bugfix: '#ff5555', test: '#f1fa8c', refactor: '#8be9fd' },
  }),
  nord: theme({
    label: 'Nord',
    bg: '#2e3440',
    border: '#434c5e',
    text: '#eceff4',
    textSecondary: '#81a1c1',
    barBg: '#3b4252',
    accent: '#88c0d0',
    headerBg: '#272c36',
    badgeBg: '#434c5e',
    usage: { feature: '#a3be8c', bugfix: '#bf616a', test: '#ebcb8b', refactor: '#81a1c1' },
  }),
  gruvbox: theme({
    label: 'Gruvbox',
    bg: '#282828',
    border: '#504945',
    text: '#ebdbb2',
    textSecondary: '#a89984',
    barBg: '#3c3836',
    accent: '#fabd2f',
    headerBg: '#1d2021',
    badgeBg: '#504945',
    usage: { feature: '#b8bb26', bugfix: '#fb4934', test: '#fabd2f', refactor: '#83a598' },
  }),
  'tokyo-night': theme({
    label: 'Tokyo Night',
    bg: '#1a1b26',
    border: '#292e42',
    text: '#c0caf5',
    textSecondary: '#565f89',
    barBg: '#24283b',
    accent: '#7aa2f7',
    headerBg: '#16161e',
    badgeBg: '#292e42',
    usage: { feature: '#9ece6a', bugfix: '#f7768e', test: '#e0af68', refactor: '#7dcfff' },
  }),
  catppuccin: theme({
    label: 'Catppuccin',
    bg: '#1e1e2e',
    border: '#45475a',
    text: '#cdd6f4',
    textSecondary: '#a6adc8',
    barBg: '#313244',
    accent: '#cba6f7',
    headerBg: '#181825',
    badgeBg: '#45475a',
    usage: { feature: '#a6e3a1', bugfix: '#f38ba8', test: '#f9e2af', refactor: '#89b4fa' },
  }),
  'one-dark': theme({
    label: 'One Dark',
    bg: '#282c34',
    border: '#3e4451',
    text: '#abb2bf',
    textSecondary: '#7f848e',
    barBg: '#3e4451',
    accent: '#61afef',
    headerBg: '#21252b',
    badgeBg: '#3e4451',
    usage: { feature: '#98c379', bugfix: '#e06c75', test: '#e5c07b', refactor: '#61afef' },
  }),
  monokai: theme({
    label: 'Monokai',
    bg: '#272822',
    border: '#49483e',
    text: '#f8f8f2',
    textSecondary: '#a6a28c',
    barBg: '#3e3d32',
    accent: '#f92672',
    headerBg: '#1e1f1c',
    badgeBg: '#49483e',
    usage: { feature: '#a6e22e', bugfix: '#f92672', test: '#e6db74', refactor: '#66d9ef' },
  }),
  'solarized-dark': theme({
    label: 'Solarized Dark',
    bg: '#002b36',
    border: '#073642',
    text: '#93a1a1',
    textSecondary: '#657b83',
    barBg: '#073642',
    accent: '#268bd2',
    headerBg: '#00212b',
    badgeBg: '#073642',
    usage: { feature: '#859900', bugfix: '#dc322f', test: '#b58900', refactor: '#2aa198' },
  }),
  'solarized-light': theme({
    label: 'Solarized Light',
    bg: '#fdf6e3',
    border: '#eee8d5',
    text: '#586e75',
    textSecondary: '#93a1a1',
    barBg: '#eee8d5',
    accent: '#268bd2',
    headerBg: '#f5efdc',
    badgeBg: '#eee8d5',
    usage: { feature: '#859900', bugfix: '#dc322f', test: '#b58900', refactor: '#2aa198' },
  }),
  synthwave: theme({
    label: 'Synthwave',
    bg: '#262335',
    border: '#423a5a',
    text: '#ffffff',
    textSecondary: '#b6a0d8',
    barBg: '#34294f',
    accent: '#ff7edb',
    headerBg: '#1e1b2e',
    badgeBg: '#423a5a',
    usage: { feature: '#72f1b8', bugfix: '#fe4450', test: '#fede5d', refactor: '#36f9f6' },
  }),
  matrix: theme({
    label: 'Matrix',
    bg: '#000000',
    border: '#00451a',
    text: '#00ff41',
    textSecondary: '#00a028',
    barBg: '#002d00',
    accent: '#00ff41',
    headerBg: '#001505',
    badgeBg: '#00451a',
    usage: { feature: '#00ff41', bugfix: '#ff2d55', test: '#b6ff00', refactor: '#00d4ff' },
  }),
} satisfies Record<string, Theme>

export type CardTheme = keyof typeof themes
export const CARD_THEMES = Object.keys(themes) as readonly CardTheme[]

// SECURITY: Theme is resolved by key lookup only — never accept raw color values
// from user input. All theme values are hardcoded above. 型で正規化済みを保証しているが、
// 万一のキャストミスでも色が undefined にならないよう light へ落とす。
export function getTheme(name: CardTheme): Theme {
  // `??` だけだと '__proto__' や 'constructor' が継承プロパティを truthy で返して素通りし、
  // 全色が undefined のカードになる。到達経路は塞いであるが、フォールバック自体を穴の無い形にする
  return Object.hasOwn(themes, name) ? themes[name] : themes.light
}
