import type { CardDataV2 } from '~/analyzers/types'

// カード描画・共有画像・worker ルーティングが共有する CardDataV2 の正本フィクスチャ。
// 各テストが自前のコピーを持つと、CardDataV2 にフィールドが増えるたびに同じ修正を
// 何箇所にも入れることになり、片方だけ古いまま気づかれない。
// A deterministic 52-week "bumpy" activity sample (oldest → newest) with one dominant
// spike at the tail — exercises the sqrt scale and the current-week highlight.
const BUMPY_52 = Array.from({ length: 52 }, (_, i) => (i % 5 === 0 ? 0 : 2 + (i % 7)))
BUMPY_52[51] = 40 // current week spike

export function makeCardData(over: Partial<CardDataV2> = {}): CardDataV2 {
  return {
    username: 'testuser',
    stats: {
      velocity: 82,
      diversity: 60,
      consistency: 74,
      synergy: 65,
      range: 50,
      flow: 40,
      power: 6307,
      aiCommitsInWindow: 120,
      activeWeeks: 9,
    },
    toolAttribution: {
      tools: [
        {
          toolId: 'claude',
          toolName: 'Claude',
          commitCount: 84,
          percentage: 70,
        },
        {
          toolId: 'cursor',
          toolName: 'Cursor',
          commitCount: 36,
          percentage: 30,
        },
      ],
      assisted: [],
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
        { name: 'TypeScript', color: '#3178c6', percentage: 62 },
        { name: 'Python', color: '#3572A5', percentage: 21 },
        { name: 'Shell', color: '#89e051', percentage: 9 },
      ],
      othersPercentage: 8,
    },
    pattern: { pattern: 'Pair Programmer', aiRate: 0.5, alternationScore: 0.6 },
    record: {
      exp: 1240,
      commits: 210,
      prs: 18,
      reviews: 34,
      issues: 9,
      inclPrivate: false,
      currentStreak: 7,
      longestStreak: 15,
      yearTotal: 3480,
      weeklyContributions: [...BUMPY_52],
    },
    element: { id: 'lumen', label: 'Lumen', color: '#a371f7' },
    epithet: 'The Symbiont',
    traits: [],
    flavor: 'Trades keystrokes with Claude, line for line.',
    serial: '#7F3A',
    seed: 12345,
    issuedYear: 2026,
    avatarDataUri: null,
    includesPrivate: false,
    ...over,
  }
}

// 1×1 transparent PNG — a fixed, safe data URI for avatar rendering assertions.
export const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC'
