export interface Theme {
  bg: string
  border: string
  text: string
  textSecondary: string
  barBg: string
  barFill: string
  accent: string
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
  },
  dark: {
    bg: '#0d1117',
    border: '#30363d',
    text: '#c9d1d9',
    textSecondary: '#8b949e',
    barBg: '#21262d',
    barFill: '#a371f7',
    accent: '#a371f7',
  },
}

export function getTheme(name: string): Theme {
  return themes[name] ?? themes.light
}
