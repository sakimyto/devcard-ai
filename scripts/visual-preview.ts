import { mkdirSync, writeFileSync } from 'node:fs'
import type { CardDataV2 } from '../src/analyzers/types'
import { CARD_THEMES, GLOW_STYLES } from '../src/card/customization'
import { renderCardV2 } from '../src/svg/v2/cardV2'

const base: CardDataV2 = {
  username: 'sakimyto',
  stats: {
    velocity: 82,
    diversity: 60,
    consistency: 74,
    synergy: 71,
    range: 58,
    flow: 46,
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
  equipped: {
    equipped: [{ toolId: 'codex', toolName: 'Codex', repoCount: 2 }],
  },
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
      { name: 'TypeScript', color: '#3178c6', percentage: 68 },
      { name: 'Python', color: '#3572A5', percentage: 24 },
    ],
    othersPercentage: 8,
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
    // Real-looking 52-week activity: quiet start, a mid-year ramp, a couple of spikes,
    // and a busy current week — proves bars don't collapse and the tail highlight reads.
    weeklyContributions: [
      2, 0, 4, 1, 6, 3, 0, 8, 5, 2, 11, 4, 0, 7, 3, 9, 14, 6, 2, 0, 12, 18, 7, 4, 21, 9, 3, 15, 28,
      11, 6, 2, 19, 33, 8, 4, 24, 13, 0, 41, 17, 9, 5, 26, 12, 7, 31, 15, 3, 22, 38, 46,
    ],
  },
  element: { id: 'lumen', label: 'Lumen', color: '#a371f7' },
  epithet: 'The Ascendant',
  traits: [
    { id: 'unbroken', name: 'Unbroken', proof: '23-day commit streak, still alive' },
    { id: 'centurion', name: 'Centurion', proof: '120 AI-assisted commits in 12 weeks' },
  ],
}

// A small but real avatar (GitHub identicon-style PNG) so the medallion renders in the
// visual proof, not a 1×1 pixel. This is a 8×8 checker generated as an opaque PNG.
const AVATAR_FIXTURE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAHElEQVR4nGNkYGD4z0AEYBxVSFBhw6gCyhUCAG1nAgHUdEQnAAAAAElFTkSuQmCC'

const outDir = new URL('../.superpowers/sdd/visual-t6/', import.meta.url).pathname
mkdirSync(outDir, { recursive: true })

// Required proofs: every user-selectable glow on every theme. 一覧を手書きすると、
// 選択肢を足したときに証跡だけ古いまま緑になる。
const proofs = CARD_THEMES.flatMap((theme) =>
  GLOW_STYLES.map((glow) => ({ glow, theme, label: `card-${glow}-${theme}` })),
)
for (const { glow, theme, label } of proofs) {
  const svg = renderCardV2(base, { theme, glow })
  writeFileSync(`${outDir}${label}.svg`, svg)
}

// Boundary stress: 39-char username (max GH login) — checks nameplate vs POWER.
const longName = 'a'.repeat(39)
writeFileSync(
  `${outDir}card-holo-dark-39char.svg`,
  renderCardV2(
    { ...base, username: longName },
    {
      theme: 'dark',
      glow: 'holo',
    },
  ),
)

// Avatar medallion present — verifies clip/frame and art overlap.
writeFileSync(
  `${outDir}card-neon-dark-avatar.svg`,
  renderCardV2({ ...base, avatarDataUri: AVATAR_FIXTURE }, { theme: 'dark', glow: 'neon' }),
)

// Over-9000 POWER: all axes maxed → gold headline number + full radar.
writeFileSync(
  `${outDir}card-holo-dark-over9000.svg`,
  renderCardV2(
    {
      ...base,
      avatarDataUri: AVATAR_FIXTURE,
      stats: {
        ...base.stats,
        velocity: 100,
        diversity: 100,
        consistency: 100,
        synergy: 100,
        range: 100,
        flow: 100,
        power: 10200,
      },
    },
    { theme: 'dark', glow: 'holo' },
  ),
)

console.log(`wrote ${proofs.length + 3} cards to ${outDir}`)
