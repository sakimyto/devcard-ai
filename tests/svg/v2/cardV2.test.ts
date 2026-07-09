import { describe, expect, it } from 'vitest'
import type { CardDataV2 } from '~/analyzers/types'
import { renderCardV2, renderPlaceholderCard } from '~/svg/v2/cardV2'

function makeData(over: Partial<CardDataV2> = {}): CardDataV2 {
  return {
    username: 'testuser',
    stats: {
      velocity: 82,
      diversity: 60,
      consistency: 74,
      synergy: 65,
      range: 50,
      flow: 40,
      points: 73,
      grade: 'A',
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
        { name: 'TypeScript', color: '#3178c6', repoCount: 5 },
        { name: 'Python', color: '#3572A5', repoCount: 2 },
      ],
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
    },
    element: { id: 'lumen', label: 'Lumen', color: '#a371f7' },
    epithet: 'The Symbiont',
    traits: [],
    flavor: 'Trades keystrokes with Claude, line for line.',
    serial: '#7F3A',
    seed: 12345,
    issuedYear: 2026,
    avatarDataUri: null,
    ...over,
  }
}

// 1×1 transparent PNG — a fixed, safe data URI for avatar rendering assertions.
const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC'

describe('renderCardV2', () => {
  it('renders 750x1050 with username, serial, window label, flavor', () => {
    const svg = renderCardV2(makeData(), { theme: 'dark' })
    expect(svg).toContain('width="750"')
    expect(svg).toContain('height="1050"')
    expect(svg).toContain('testuser')
    expect(svg).toContain('#7F3A')
    expect(svg).toContain('public · 12wk')
    expect(svg).toContain('Trades keystrokes')
  })

  it('all five grades render for both themes (golden snapshots)', () => {
    for (const grade of ['S', 'A', 'B', 'C', 'D'] as const) {
      for (const theme of ['light', 'dark']) {
        const svg = renderCardV2(makeData({ stats: { ...makeData().stats, grade } }), { theme })
        expect(svg).toMatchSnapshot(`card-${grade}-${theme}`)
      }
    }
  })

  it('renders assisted chips with icons and the "· assisted" label (golden)', () => {
    const svg = renderCardV2(
      makeData({
        toolAttribution: {
          tools: [{ toolId: 'claude', toolName: 'Claude', commitCount: 90, percentage: 90 }],
          assisted: [{ toolId: 'codex', toolName: 'Codex', count: 8 }],
          totalAiCommits: 90,
          verified: true,
        },
        equipped: { equipped: [] },
      }),
      { theme: 'dark' },
    )
    expect(svg).toContain('· assisted')
    expect(svg).toContain('Codex · assisted')
    // no <script> ever leaks into the rendered card
    expect(svg).not.toContain('<script')
    expect(svg).toMatchSnapshot('card-assisted-dark')
  })

  it('escapes XML in username (39-char boundary + injection attempt)', () => {
    const long = 'a'.repeat(39)
    expect(renderCardV2(makeData({ username: long }), { theme: 'dark' })).toContain(long)
    // GH_LOGIN_RE 通過後の値しか来ないが、描画層は防御的に escape する
    const svg = renderCardV2(makeData({ username: 'x"><script' as string }), {
      theme: 'dark',
    })
    expect(svg).not.toContain('"><script')
  })

  it('shrinks the nameplate for long usernames so it clears the tier gem', () => {
    // Short names keep the 42px hero size (font-size="42" is unique to the nameplate).
    expect(renderCardV2(makeData({ username: 'octocat' }), { theme: 'dark' })).toContain(
      'font-size="42"',
    )
    // A max-length 39-char GitHub login must render smaller so it never
    // overlaps the top-right tier gem.
    const long = renderCardV2(makeData({ username: 'a'.repeat(39) }), {
      theme: 'dark',
    })
    expect(long).not.toContain('font-size="42"')
    const m = long.match(new RegExp(`font-size="(\\d+)"[^>]*>${'a'.repeat(39)}<`))
    expect(m).not.toBeNull()
    expect(Number(m?.[1])).toBeLessThanOrEqual(26)
  })

  it('renders without tools and without commits (zero states)', () => {
    const svg = renderCardV2(
      makeData({
        toolAttribution: { tools: [], assisted: [], totalAiCommits: 0, verified: false },
        equipped: { equipped: [] },
        usage: { categories: [], totalCommits: 0 },
        languages: { languages: [] },
        stats: {
          velocity: 0,
          diversity: 0,
          consistency: 0,
          synergy: 0,
          range: 0,
          flow: 0,
          points: 0,
          grade: 'D',
          power: 0,
          aiCommitsInWindow: 0,
          activeWeeks: 0,
        },
      }),
      { theme: 'light' },
    )
    expect(svg).toContain('width="750"')
    expect(svg).not.toContain('NaN')
    expect(svg).not.toContain('undefined')
  })

  it('renders the avatar medallion only from a data: URI, never a remote http(s) href', () => {
    const withAvatar = renderCardV2(makeData({ avatarDataUri: PNG_1PX }), { theme: 'dark' })
    expect(withAvatar).toContain('<image')
    expect(withAvatar).toContain(PNG_1PX)
    // No <image> may ever carry an http(s) href (blocked in GitHub's camo/img context).
    expect(withAvatar).not.toMatch(/<image[^>]+href="http/)

    // null avatar → no medallion image at all, card still renders.
    const noAvatar = renderCardV2(makeData({ avatarDataUri: null }), { theme: 'dark' })
    expect(noAvatar).not.toContain('<image')
    expect(noAvatar).toContain('width="750"')
  })

  it('renders the 6-axis radar labels', () => {
    const svg = renderCardV2(makeData(), { theme: 'dark' })
    for (const axis of ['VELOCITY', 'DIVERSITY', 'SYNERGY', 'CONSISTENCY', 'RANGE', 'FLOW']) {
      expect(svg).toContain(axis)
    }
  })

  it('POWER turns gold at 9000 (8999 stays accent)', () => {
    const under = renderCardV2(makeData({ stats: { ...makeData().stats, power: 8999 } }), {
      theme: 'dark',
    })
    expect(under).toContain('8,999')
    expect(under).not.toContain('#f0b429')

    const over = renderCardV2(makeData({ stats: { ...makeData().stats, power: 9000 } }), {
      theme: 'dark',
    })
    expect(over).toContain('9,000')
    expect(over).toContain('#f0b429')
  })

  it("drops loadout chips that would overflow the card's right edge", () => {
    const svg = renderCardV2(
      makeData({
        toolAttribution: {
          tools: [
            {
              toolId: 'claude',
              toolName: 'Claude',
              commitCount: 60,
              percentage: 50,
            },
            {
              toolId: 'cursor',
              toolName: 'Cursor',
              commitCount: 60,
              percentage: 50,
            },
          ],
          assisted: [],
          totalAiCommits: 120,
          verified: true,
        },
        equipped: {
          equipped: [
            { toolId: 'codex', toolName: 'Codex', repoCount: 2 },
            { toolId: 'copilot', toolName: 'Copilot', repoCount: 1 },
          ],
        },
      }),
      { theme: 'dark' },
    )
    // Codex fits; the trailing Copilot chip would cross x=706 so it is dropped.
    expect(svg).toContain('Codex · equipped')
    expect(svg).not.toContain('Copilot')
    // No chip rect may start+extend past the content edge (CARD_W - PAD = 706).
    for (const m of svg.matchAll(/<rect x="(\d+)" y="716" width="(\d+)"/g)) {
      expect(Number(m[1]) + Number(m[2])).toBeLessThanOrEqual(706)
    }
  })
})

describe('renderCardV2 RECORD strip', () => {
  it('renders the RECORD strip: EXP (comma-grouped), commit/pr/review counts, streak', () => {
    const svg = renderCardV2(makeData(), { theme: 'dark' })
    expect(svg).toContain('RECORD')
    expect(svg).toContain('EXP')
    expect(svg).toContain('1,240')
    expect(svg).toContain('210c')
    expect(svg).toContain('18pr')
    expect(svg).toContain('34rev')
    expect(svg).toContain('7d streak')
    // issues are intentionally not shown on the strip
    expect(svg).not.toContain('9i')
  })

  it('shows "incl. private" only when inclPrivate is true', () => {
    const priv = renderCardV2(makeData({ record: { ...makeData().record, inclPrivate: true } }), {
      theme: 'dark',
    })
    expect(priv).toContain('incl. private')
    const pub = renderCardV2(makeData(), { theme: 'dark' })
    expect(pub).not.toContain('incl. private')
  })

  it('falls back to "best {n}d" when current streak is 0 but a longest exists', () => {
    const svg = renderCardV2(
      makeData({ record: { ...makeData().record, currentStreak: 0, longestStreak: 12 } }),
      { theme: 'dark' },
    )
    expect(svg).toContain('best 12d')
    expect(svg).not.toContain('d streak')
  })

  it('hides the streak entirely when both current and longest are 0', () => {
    const svg = renderCardV2(
      makeData({ record: { ...makeData().record, currentStreak: 0, longestStreak: 0 } }),
      { theme: 'dark' },
    )
    expect(svg).not.toContain('streak')
    expect(svg).not.toContain('best ')
  })

  it('renders a zero record without NaN/undefined (degraded strip)', () => {
    const svg = renderCardV2(
      makeData({
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
      }),
      { theme: 'light' },
    )
    expect(svg).toContain('RECORD')
    expect(svg).not.toContain('NaN')
    expect(svg).not.toContain('undefined')
  })
})

describe('renderCardV2 ELEMENT + EPITHET + TRAITS (v2.6)', () => {
  it('shows the epithet on the archetype row (not the raw pattern label)', () => {
    const svg = renderCardV2(makeData({ epithet: 'The Overseer' }), { theme: 'dark' })
    expect(svg).toContain('The Overseer')
    // The archetype row no longer prints the PatternType class label.
    expect(svg).not.toContain('>Pair Programmer<')
  })

  it('renders the element chip with glyph, label, and element color', () => {
    const svg = renderCardV2(
      makeData({ element: { id: 'blaze', label: 'Blaze', color: '#f4652f' } }),
      { theme: 'dark' },
    )
    expect(svg).toContain('Blaze')
    expect(svg).toContain('#f4652f') // outline
    expect(svg).toContain('#f4652f26') // 15% tint fill
  })

  it('renders up to two TRAITS lines (◆ name — proof) in place of flavor', () => {
    const svg = renderCardV2(
      makeData({
        traits: [
          { id: 'centurion', name: 'Centurion', proof: '137 AI-assisted commits in 12 weeks' },
          { id: 'ghostwriter', name: 'Ghostwriter', proof: '84% of commits ship with AI' },
        ],
      }),
      { theme: 'dark' },
    )
    expect(svg).toContain('◆ Centurion')
    expect(svg).toContain('137 AI-assisted commits in 12 weeks')
    expect(svg).toContain('◆ Ghostwriter')
    // flavor line is suppressed when traits fire
    expect(svg).not.toContain('Trades keystrokes')
  })

  it('falls back to the flavor line when no trait fired', () => {
    const svg = renderCardV2(makeData({ traits: [] }), { theme: 'dark' })
    expect(svg).toContain('Trades keystrokes')
    expect(svg).not.toContain('◆')
  })

  it('escapes XML defensively in trait name/proof', () => {
    const svg = renderCardV2(makeData({ traits: [{ id: 'x', name: 'a<b', proof: 'c&d">' }] }), {
      theme: 'dark',
    })
    expect(svg).not.toContain('a<b')
    expect(svg).not.toContain('c&d">')
    expect(svg).toContain('a&lt;b')
  })
})

describe('renderPlaceholderCard', () => {
  it('renders summoning card with username', () => {
    const svg = renderPlaceholderCard('testuser', 'dark')
    expect(svg).toContain('Summoning')
    expect(svg).toContain('testuser')
    expect(svg).toContain('width="750"')
  })
})
