import { describe, expect, it } from 'vitest'
import type { CardDataV2 } from '~/analyzers/types'
import { renderCardV2, renderPlaceholderCard } from '~/svg/v2/cardV2'

// A deterministic 52-week "bumpy" activity sample (oldest → newest) with one dominant
// spike at the tail — exercises the sqrt scale and the current-week highlight.
const BUMPY_52 = Array.from({ length: 52 }, (_, i) => (i % 5 === 0 ? 0 : 2 + (i % 7)))
BUMPY_52[51] = 40 // current week spike

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
      yearTotal: 3480,
      weeklyContributions: BUMPY_52,
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
    expect(svg).toContain('No.7F3A')
    expect(svg).toContain('S1 ’26')
    expect(svg).toContain('public 12wk')
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
    for (const m of svg.matchAll(/<rect x="(\d+)" y="696" width="(\d+)"/g)) {
      expect(Number(m[1]) + Number(m[2])).toBeLessThanOrEqual(706)
    }
  })
})

describe('renderCardV2 RECORD strip', () => {
  it('renders the RECORD strip: EXP (comma-grouped), commit/pr/review counts, streak', () => {
    const svg = renderCardV2(makeData(), { theme: 'dark' })
    expect(svg).toContain('>EXP<')
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
          yearTotal: 0,
          weeklyContributions: new Array(52).fill(0),
        },
      }),
      { theme: 'light' },
    )
    expect(svg).toContain('>EXP<')
    expect(svg).not.toContain('NaN')
    expect(svg).not.toContain('undefined')
  })
})

describe('renderCardV2 CONTRIBUTIONS graph (v2.7)', () => {
  // Bar rects are the only <rect> carrying a fill-opacity attribute in the card.
  const BAR_RE =
    /<rect x="[0-9.]+" y="[0-9.]+" width="[0-9.]+" height="([0-9.]+)" rx="1" fill="[^"]*" fill-opacity="[0-9.]+"/g
  const barHeights = (svg: string): number[] => [...svg.matchAll(BAR_RE)].map((m) => Number(m[1]))

  it('renders the section label + comma-grouped yearly total', () => {
    const svg = renderCardV2(makeData({ record: { ...makeData().record, yearTotal: 3480 } }), {
      theme: 'dark',
    })
    expect(svg).toContain('CONTRIBUTIONS · 1y')
    expect(svg).toContain('3,480 total')
  })

  it('renders exactly 52 bars', () => {
    const svg = renderCardV2(makeData(), { theme: 'dark' })
    expect(barHeights(svg)).toHaveLength(52)
  })

  it('uses toFixed(2) coordinates for golden stability', () => {
    const svg = renderCardV2(makeData(), { theme: 'dark' })
    // Every bar rect x/width is rendered with exactly two decimals.
    for (const m of svg.matchAll(
      /<rect x="([0-9.]+)" y="([0-9.]+)" width="([0-9.]+)" height="([0-9.]+)" rx="1" fill="[^"]*" fill-opacity/g,
    )) {
      for (const coord of [m[1], m[2], m[3], m[4]]) {
        expect(coord).toMatch(/^\d+\.\d{2}$/)
      }
    }
  })

  it('an all-zero year renders a flat row of minimum-height bars (no NaN)', () => {
    const svg = renderCardV2(
      makeData({
        record: { ...makeData().record, yearTotal: 0, weeklyContributions: new Array(52).fill(0) },
      }),
      { theme: 'light' },
    )
    const heights = barHeights(svg)
    expect(heights).toHaveLength(52)
    expect(heights.every((h) => h === 4)).toBe(true)
    expect(svg).not.toContain('NaN')
    expect(svg).toContain('0 total')
  })

  it('sqrt scaling keeps small weeks visible next to one dominant week (not linear crush)', () => {
    const weekly = new Array(52).fill(1)
    weekly[25] = 100 // one dominant week mid-series (not the current-week slot)
    const svg = renderCardV2(
      makeData({ record: { ...makeData().record, weeklyContributions: weekly } }),
      { theme: 'dark' },
    )
    const heights = barHeights(svg)
    // sqrt(1)/sqrt(100)=0.1 → h≈6.8; a linear scale would give ≈4.28 (crushed to the floor).
    const smallBars = heights.filter((h) => h > 4 && h < 32)
    expect(smallBars.length).toBeGreaterThan(0)
    expect(Math.min(...smallBars)).toBeGreaterThan(6) // proves sqrt, not linear
  })

  it('marks the current (rightmost) week with a full-opacity bar + 1px outline ring', () => {
    const svg = renderCardV2(makeData(), { theme: 'dark' })
    // Exactly one bar at full opacity (the current week).
    const full = [...svg.matchAll(/fill-opacity="1(?:\.00)?"/g)]
    expect(full.length).toBe(1)
    // And exactly one hollow accent ring (fill="none" stroke width 1) in the graph band.
    const rings = [
      ...svg.matchAll(
        /<rect x="[0-9.]+" y="[0-9.]+" width="[0-9.]+" height="[0-9.]+" rx="1" fill="none" stroke="[^"]*" stroke-width="1"/g,
      ),
    ]
    expect(rings.length).toBe(1)
  })

  it('no longer draws the removed flavor divider rule', () => {
    // The old <line> divider above the flavor block is gone now that the graph separates content.
    const svg = renderCardV2(makeData({ traits: [] }), { theme: 'dark' })
    expect(svg).not.toMatch(/<line x1="104"/) // PAD+60 divider start
  })
})

describe('renderCardV2 ELEMENT + EPITHET + TRAITS (v2.6)', () => {
  it('shows the epithet on the archetype row (not the raw pattern label)', () => {
    const svg = renderCardV2(makeData({ epithet: 'The Overseer' }), { theme: 'dark' })
    expect(svg).toContain('The Overseer')
    // The archetype row no longer prints the PatternType class label.
    expect(svg).not.toContain('>Pair Programmer<')
  })

  it('renders the element energy mark with a radial-gradient token, label, and element color', () => {
    const svg = renderCardV2(
      makeData({ element: { id: 'blaze', label: 'Blaze', color: '#f4652f' } }),
      { theme: 'dark' },
    )
    expect(svg).toContain('Blaze')
    expect(svg).toContain('#f4652f') // element color drives the energy radial gradient
    expect(svg).toContain('url(#energyGrad)') // token filled with the radial energy gradient
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

describe('renderCardV2 Pokémon-grammar polish (v2.8)', () => {
  it('renders POWER at the HP position (nameplate label + number), not in the STATS header', () => {
    const svg = renderCardV2(makeData({ stats: { ...makeData().stats, power: 6426 } }), {
      theme: 'dark',
    })
    // POWER label + number both right-aligned at the plate inner edge (x=572).
    expect(svg).toContain('<text x="572" y="84"')
    expect(svg).toMatch(/<text x="572" y="128"[^>]*font-size="32"[^>]*>6,426<\/text>/)
    // The old STATS-header POWER (font-size 30 headline) is gone.
    expect(svg).not.toContain('font-size="30"')
  })

  it('keeps the gold POWER + glow halo past 9000 at the HP position', () => {
    const over = renderCardV2(makeData({ stats: { ...makeData().stats, power: 9420 } }), {
      theme: 'dark',
    })
    expect(over).toContain('9,420')
    expect(over).toContain('#f0b429') // gold
    expect(over).toContain('filter="url(#powerGlow)"') // glow halo only when gold
    const under = renderCardV2(makeData({ stats: { ...makeData().stats, power: 8999 } }), {
      theme: 'dark',
    })
    expect(under).not.toContain('filter="url(#powerGlow)"')
  })

  it('renders the card-number footer as No.<serial> · S1 ’YY · public 12wk', () => {
    const svg = renderCardV2(makeData({ serial: '#7F3A', issuedYear: 2026 }), { theme: 'dark' })
    expect(svg).toContain('No.7F3A · S1 ’26 · public 12wk')
    expect(svg).not.toContain('#7F3A') // the # is dropped in the No. form
  })

  it('renders the tier rarity mark (D● C◆ B★ A★★ S★★★, S holo)', () => {
    const marks: Record<string, string> = { S: '★★★', A: '★★', B: '★', C: '◆', D: '●' }
    for (const [grade, mark] of Object.entries(marks)) {
      const svg = renderCardV2(makeData({ stats: { ...makeData().stats, grade: grade as 'S' } }), {
        theme: 'dark',
      })
      expect(svg).toContain(`>${mark}</text>`)
    }
    // S rarity is filled with the holo rainbow; lower tiers use the flat tier color.
    const s = renderCardV2(makeData({ stats: { ...makeData().stats, grade: 'S' } }), {
      theme: 'dark',
    })
    expect(s).toContain('url(#rarityHolo)')
    const d = renderCardV2(makeData({ stats: { ...makeData().stats, grade: 'D' } }), {
      theme: 'dark',
    })
    expect(d).not.toContain('url(#rarityHolo)')
  })

  it('pulls the trait proof headline number to the right (damage-number position)', () => {
    const svg = renderCardV2(
      makeData({
        traits: [
          { id: 'unbroken', name: 'Unbroken', proof: '23-day commit streak, still alive' },
          { id: 'centurion', name: 'Centurion', proof: '120 AI-assisted commits in 12 weeks' },
        ],
      }),
      { theme: 'dark' },
    )
    // N-day → "23d", first-number-wins → "120" (not "12w" from the trailing "12 weeks").
    expect(svg).toMatch(/<text x="706"[^>]*text-anchor="end"[^>]*>23d<\/text>/)
    expect(svg).toMatch(/<text x="706"[^>]*text-anchor="end"[^>]*>120<\/text>/)
  })

  it('omits the right damage number for a numberless trait proof', () => {
    const svg = renderCardV2(
      makeData({
        traits: [{ id: 'ironhand', name: 'Iron hand', proof: 'Ships mostly bare-handed' }],
      }),
      { theme: 'dark' },
    )
    expect(svg).toContain('◆ Iron hand')
    // No right-aligned damage number is emitted for this line.
    expect(svg).not.toMatch(/<text x="706"[^>]*text-anchor="end"[^>]*font-size="22"/)
  })

  it('renders the art window double frame (tier-colored inner metal line)', () => {
    const svg = renderCardV2(makeData({ stats: { ...makeData().stats, grade: 'A' } }), {
      theme: 'dark',
    })
    // Inner frame inset 4px from the art rect (x=48, y=214) in the A-tier gem color.
    expect(svg).toContain('<rect x="48" y="214"')
    expect(svg).toContain('#b8860b') // A-tier gem color on the inner metal line
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
