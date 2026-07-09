import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { Resvg, initWasm } from '@resvg/resvg-wasm'
import type { CardDataV2, Grade, LanguageAnalysisV2 } from '../src/analyzers/types'
import { renderCardV2 } from '../src/svg/v2/cardV2'

// Standalone PNG rasterizer for local visual proofs (mirrors visual-preview-t20).
const wasmBytes = readFileSync('node_modules/@resvg/resvg-wasm/index_bg.wasm')
const fontBytes = new Uint8Array(readFileSync('/Library/Fonts/Arial Unicode.ttf'))
await initWasm(wasmBytes)

function svgToPng(svg: string): Uint8Array {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 750 },
    font: {
      fontBuffers: [fontBytes],
      defaultFontFamily: 'Arial Unicode MS',
      loadSystemFonts: false,
    },
  })
  return resvg.render().asPng()
}

const BUMPY: number[] = [
  2, 0, 4, 1, 6, 3, 0, 8, 5, 2, 11, 4, 0, 7, 3, 9, 14, 6, 2, 0, 12, 18, 7, 4, 21, 9, 3, 15, 28, 11,
  6, 2, 19, 33, 8, 4, 24, 13, 0, 41, 17, 9, 5, 26, 12, 7, 31, 15, 3, 22, 38, 46,
]

const base: CardDataV2 = {
  username: 'sakimyto',
  stats: {
    velocity: 82,
    diversity: 60,
    consistency: 74,
    synergy: 71,
    range: 58,
    flow: 46,
    points: 73,
    grade: 'A',
    power: 6426,
    aiCommitsInWindow: 120,
    activeWeeks: 9,
  },
  toolAttribution: {
    tools: [
      { toolId: 'claude', toolName: 'Claude', commitCount: 84, percentage: 70 },
      { toolId: 'cursor', toolName: 'Cursor', commitCount: 36, percentage: 30 },
    ],
    assisted: [{ toolId: 'codex', toolName: 'Codex', count: 8 }],
    totalAiCommits: 120,
    verified: true,
  },
  equipped: { equipped: [{ toolId: 'codex', toolName: 'Codex', repoCount: 2 }] },
  usage: {
    categories: [
      { category: 'feature', count: 60, percentage: 50 },
      { category: 'refactor', count: 30, percentage: 25 },
      { category: 'bugfix', count: 18, percentage: 15 },
      { category: 'test', count: 12, percentage: 10 },
    ],
    totalCommits: 120,
  },
  // Real sakimyto ratio (measured via gh api graphql, Task 21 validation).
  languages: {
    languages: [
      { name: 'TypeScript', color: '#3178c6', percentage: 34 },
      { name: 'HTML', color: '#e34c26', percentage: 18 },
      { name: 'CSS', color: '#563d7c', percentage: 17 },
      { name: 'SCSS', color: '#c6538c', percentage: 12 },
    ],
    othersPercentage: 19,
  },
  pattern: { pattern: 'Pair Programmer', aiRate: 0.5, alternationScore: 0.6 },
  flavor: 'Trades keystrokes with Claude, line for line.',
  serial: '#7F3A',
  seed: 987654321,
  issuedYear: 2026,
  avatarDataUri: null,
  record: {
    exp: 1284,
    commits: 214,
    prs: 32,
    reviews: 18,
    issues: 6,
    inclPrivate: true,
    currentStreak: 23,
    longestStreak: 31,
    yearTotal: 3218,
    weeklyContributions: BUMPY,
  },
  element: { id: 'lumen', label: 'Lumen', color: '#a371f7' },
  epithet: 'The Ascendant',
  traits: [
    { id: 'unbroken', name: 'Unbroken', proof: '23-day commit streak, still alive' },
    { id: 'centurion', name: 'Centurion', proof: '120 AI-assisted commits in 12 weeks' },
  ],
}

const outDir = new URL('../.superpowers/sdd/visual-t21/', import.meta.url).pathname
mkdirSync(outDir, { recursive: true })

function emit(label: string, languages: LanguageAnalysisV2, theme: string, grade: Grade): void {
  const svg = renderCardV2({ ...base, languages, stats: { ...base.stats, grade } }, { theme })
  writeFileSync(`${outDir}${label}.svg`, svg)
  writeFileSync(`${outDir}${label}.png`, svgToPng(svg))
}

// Language-count variations (the core of this task's TYPES rewrite).
emit('sakimyto-real-dark', base.languages, 'dark', 'A') // 4 langs + others (real ratio)
emit('sakimyto-real-light', base.languages, 'light', 'A')
emit(
  'one-lang-dark',
  { languages: [{ name: 'TypeScript', color: '#3178c6', percentage: 96 }], othersPercentage: 4 },
  'dark',
  'S',
)
emit(
  'three-lang-dark',
  {
    languages: [
      { name: 'TypeScript', color: '#3178c6', percentage: 62 },
      { name: 'Python', color: '#3572A5', percentage: 21 },
      { name: 'Shell', color: '#89e051', percentage: 9 },
    ],
    othersPercentage: 8,
  },
  'dark',
  'B',
)
emit(
  'four-lang-even-dark',
  {
    languages: [
      { name: 'TypeScript', color: '#3178c6', percentage: 26 },
      { name: 'Rust', color: '#dea584', percentage: 25 },
      { name: 'Go', color: '#00add8', percentage: 24 },
      { name: 'Python', color: '#3572A5', percentage: 23 },
    ],
    othersPercentage: 2,
  },
  'dark',
  'A',
)
emit('zero-lang-dark', { languages: [], othersPercentage: 0 }, 'dark', 'D')
emit('zero-lang-light', { languages: [], othersPercentage: 0 }, 'light', 'D')

console.log(`wrote proofs to ${outDir}`)
