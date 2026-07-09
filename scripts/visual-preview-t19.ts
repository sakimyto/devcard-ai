import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { Resvg, initWasm } from '@resvg/resvg-wasm'
import type { CardDataV2, Grade } from '../src/analyzers/types'
import { renderCardV2 } from '../src/svg/v2/cardV2'

// Standalone PNG rasterizer for local visual proofs. Unlike the Worker's ogp.ts (which
// imports the wasm/fonts as bundled assets), this reads them from disk and ships a full
// Unicode font so the ›/▲/◆/· marker glyphs render — the subset TTF would drop them.
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

// Bumpy real-looking 52-week activity (oldest → newest): quiet start, mid-year ramp, spikes,
// and a busy current week.
const BUMPY: number[] = [
  2, 0, 4, 1, 6, 3, 0, 8, 5, 2, 11, 4, 0, 7, 3, 9, 14, 6, 2, 0, 12, 18, 7, 4, 21, 9, 3, 15, 28, 11,
  6, 2, 19, 33, 8, 4, 24, 13, 0, 41, 17, 9, 5, 26, 12, 7, 31, 15, 3, 22, 38, 46,
]
const FLAT: number[] = new Array(52).fill(0)
// One dominant week amid small weeks — exercises the sqrt scale (small bars must stay visible).
const SPIKE: number[] = new Array(52).fill(1)
SPIKE[25] = 120

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
  languages: {
    languages: [
      { name: 'TypeScript', color: '#3178c6', repoCount: 5 },
      { name: 'Python', color: '#3572A5', repoCount: 2 },
    ],
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

const AVATAR_FIXTURE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAHElEQVR4nGNkYGD4z0AEYBxVSFBhw6gCyhUCAG1nAgHUdEQnAAAAAElFTkSuQmCC'

const outDir = new URL('../.superpowers/sdd/visual-t19/', import.meta.url).pathname
mkdirSync(outDir, { recursive: true })

function emit(label: string, data: CardDataV2, theme: string): void {
  const svg = renderCardV2(data, { theme })
  writeFileSync(`${outDir}${label}.svg`, svg)
  writeFileSync(`${outDir}${label}.png`, svgToPng(svg))
}

// All 5 tiers on dark (bumpy graph + 2 traits) + S/D on light.
for (const grade of ['S', 'A', 'B', 'C', 'D'] as Grade[]) {
  emit(`${grade}-dark`, { ...base, stats: { ...base.stats, grade } }, 'dark')
}
emit('S-light', { ...base, stats: { ...base.stats, grade: 'S' } }, 'light')
emit('D-light', { ...base, stats: { ...base.stats, grade: 'D' } }, 'light')

// Avatar medallion present (checks art shrink → medallion breathing room).
emit('A-dark-avatar', { ...base, avatarDataUri: AVATAR_FIXTURE }, 'dark')

// Traits variants: 0 traits → flavor line; 1 trait; 2 traits (base).
emit('D-dark-0trait', { ...base, stats: { ...base.stats, grade: 'D' }, traits: [] }, 'dark')
emit('A-dark-1trait', { ...base, traits: [base.traits[0]] }, 'dark')

// Graph edge cases: all-zero (flat min-height bars) + single dominant week (sqrt scale).
emit(
  'C-dark-flat-graph',
  {
    ...base,
    stats: { ...base.stats, grade: 'C' },
    record: { ...base.record, yearTotal: 0, weeklyContributions: FLAT },
  },
  'dark',
)
emit(
  'A-dark-spike-graph',
  { ...base, record: { ...base.record, yearTotal: 172, weeklyContributions: SPIKE } },
  'dark',
)

// 39-char username boundary + avatar + bumpy graph (full-density stress).
emit(
  'S-dark-39char',
  {
    ...base,
    username: 'a'.repeat(39),
    avatarDataUri: AVATAR_FIXTURE,
    stats: { ...base.stats, grade: 'S' },
  },
  'dark',
)

console.log(`wrote proofs to ${outDir}`)
