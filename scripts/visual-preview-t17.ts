import { mkdirSync, writeFileSync } from 'node:fs'
import type { CardDataV2 } from '../src/analyzers/types'
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
  record: {
    exp: 2847,
    commits: 412,
    prs: 63,
    reviews: 128,
    issues: 21,
    inclPrivate: true,
    currentStreak: 12,
    longestStreak: 34,
  },
  flavor: 'Trades keystrokes with Claude, line for line.',
  serial: '#7F3A',
  seed: 987654321,
  issuedYear: 2026,
  avatarDataUri: null,
}

const AVATAR_FIXTURE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAHElEQVR4nGNkYGD4z0AEYBxVSFBhw6gCyhUCAG1nAgHUdEQnAAAAAElFTkSuQmCC'

const outDir = new URL('../.superpowers/sdd/visual-t17/', import.meta.url).pathname
mkdirSync(outDir, { recursive: true })

// S-dark: full record with incl.private
writeFileSync(
  `${outDir}card-S-dark.svg`,
  renderCardV2({ ...base, stats: { ...base.stats, grade: 'S' } }, { theme: 'dark' }),
)
// A-dark with avatar
writeFileSync(
  `${outDir}card-A-avatar.svg`,
  renderCardV2({ ...base, avatarDataUri: AVATAR_FIXTURE }, { theme: 'dark' }),
)
// D-light: no incl.private, current streak 0 → best fallback
writeFileSync(
  `${outDir}card-D-light.svg`,
  renderCardV2(
    {
      ...base,
      stats: { ...base.stats, grade: 'D' },
      record: { ...base.record, inclPrivate: false, currentStreak: 0, longestStreak: 9 },
    },
    { theme: 'light' },
  ),
)
// Zero-record: everything 0, streak hidden (degraded strip)
writeFileSync(
  `${outDir}card-zero-record.svg`,
  renderCardV2(
    {
      ...base,
      stats: { ...base.stats, grade: 'C' },
      record: {
        exp: 0,
        commits: 0,
        prs: 0,
        reviews: 0,
        issues: 0,
        inclPrivate: false,
        currentStreak: 0,
        longestStreak: 0,
      },
    },
    { theme: 'dark' },
  ),
)

console.log(`wrote cards to ${outDir}`)
