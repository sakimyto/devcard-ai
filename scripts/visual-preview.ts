import { mkdirSync, writeFileSync } from 'node:fs'
import type { CardDataV2, Grade } from '../src/analyzers/types'
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
}

// A small but real avatar (GitHub identicon-style PNG) so the medallion renders in the
// visual proof, not a 1×1 pixel. This is a 8×8 checker generated as an opaque PNG.
const AVATAR_FIXTURE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAHElEQVR4nGNkYGD4z0AEYBxVSFBhw6gCyhUCAG1nAgHUdEQnAAAAAElFTkSuQmCC'

const outDir = new URL('../.superpowers/sdd/visual-t6/', import.meta.url).pathname
mkdirSync(outDir, { recursive: true })

// Required proofs: all 5 tiers on dark, plus S/D on light.
const proofs: Array<{ grade: Grade; theme: string; label: string }> = [
  { grade: 'S', theme: 'dark', label: 'card-S-dark' },
  { grade: 'A', theme: 'dark', label: 'card-A-dark' },
  { grade: 'B', theme: 'dark', label: 'card-B-dark' },
  { grade: 'C', theme: 'dark', label: 'card-C-dark' },
  { grade: 'D', theme: 'dark', label: 'card-D-dark' },
  { grade: 'S', theme: 'light', label: 'card-S-light' },
  { grade: 'D', theme: 'light', label: 'card-D-light' },
]
for (const { grade, theme, label } of proofs) {
  const svg = renderCardV2(
    { ...base, stats: { ...base.stats, grade } },
    {
      theme,
    },
  )
  writeFileSync(`${outDir}${label}.svg`, svg)
}

// Boundary stress: 39-char username (max GH login) — checks nameplate vs tier gem.
const longName = 'a'.repeat(39)
writeFileSync(
  `${outDir}card-S-dark-39char.svg`,
  renderCardV2(
    { ...base, username: longName, stats: { ...base.stats, grade: 'S' } },
    {
      theme: 'dark',
    },
  ),
)

// Avatar medallion present — verifies clip/frame and art overlap.
writeFileSync(
  `${outDir}card-A-dark-avatar.svg`,
  renderCardV2({ ...base, avatarDataUri: AVATAR_FIXTURE }, { theme: 'dark' }),
)

// Over-9000 POWER: all axes maxed → gold headline number + full radar.
writeFileSync(
  `${outDir}card-S-dark-over9000.svg`,
  renderCardV2(
    {
      ...base,
      avatarDataUri: AVATAR_FIXTURE,
      stats: {
        ...base.stats,
        grade: 'S',
        velocity: 100,
        diversity: 100,
        consistency: 100,
        synergy: 100,
        range: 100,
        flow: 100,
        power: 10200,
      },
    },
    { theme: 'dark' },
  ),
)

console.log(`wrote ${proofs.length + 3} cards to ${outDir}`)
