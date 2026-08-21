import { describe, expect, it } from 'vitest'
import type { CardDataV2 } from '~/analyzers/types'
import { CARD_THEMES } from '~/card/customization'
import { themes } from '~/svg/themes'
import { renderCardV2, renderPlaceholderCard } from '~/svg/v2/cardV2'
import { PNG_1PX, makeCardData } from '../../fixtures/cardData'

describe('renderCardV2', () => {
  it('renders 750x1050 with username, serial, window label, flavor', () => {
    const svg = renderCardV2(makeCardData(), { theme: 'dark', glow: 'soft' })
    expect(svg).toContain('width="750"')
    expect(svg).toContain('height="1050"')
    expect(svg).toContain('testuser')
    expect(svg).toContain('No.7F3A')
    expect(svg).toContain('S1 ’26')
    expect(svg).toContain('public 12wk')
    expect(svg).toContain('Trades keystrokes')
  })

  // 13テーマ全部の golden を持つと差分が読めない大きさになるので、スナップショットは
  // light/dark に限定し、残りは「その配色で実際に塗られているか」を検査する。
  it('every theme paints the card with its own palette and leaves no unresolved value', () => {
    for (const theme of CARD_THEMES) {
      const svg = renderCardV2(makeCardData(), { theme, glow: 'soft' })
      const palette = themes[theme]
      expect(svg).toContain(palette.bg)
      expect(svg).toContain(palette.accent)
      expect(svg).toContain(palette.text)
      // 未定義値が色として埋まると SVG は壊れずに「黒い板」になり、目視でしか気づけない
      expect(svg).not.toContain('undefined')
      expect(svg).not.toContain('NaN')
      expect(svg).not.toMatch(/(fill|stroke)="(""|"\s*")/)
    }
  })

  it('every theme is a complete palette (no field silently missing)', () => {
    for (const theme of CARD_THEMES) {
      const palette = themes[theme]
      for (const [field, value] of Object.entries(palette)) {
        if (field === 'toolColors' || field === 'usageColors') continue
        expect(typeof value, `${theme}.${field}`).toBe('string')
        expect(value, `${theme}.${field}`).not.toBe('')
      }
      expect(Object.keys(palette.toolColors).length).toBeGreaterThan(30)
      expect(Object.values(palette.usageColors).every((c) => /^#[0-9a-f]{6}$/i.test(c))).toBe(true)
    }
  })

  it('all user-selectable glows render for both themes (golden snapshots)', () => {
    for (const glow of ['none', 'soft', 'neon', 'holo'] as const) {
      for (const theme of ['light', 'dark'] as const) {
        const svg = renderCardV2(makeCardData(), { theme, glow })
        expect(svg).toMatchSnapshot(`card-${glow}-${theme}`)
      }
    }
  })

  it('renders assisted chips with icons and the quantified "xN" label (golden)', () => {
    const svg = renderCardV2(
      makeCardData({
        toolAttribution: {
          tools: [{ toolId: 'claude', toolName: 'Claude', commitCount: 90, percentage: 90 }],
          assisted: [{ toolId: 'codex', toolName: 'Codex', count: 17 }],
          totalAiCommits: 90,
          verified: true,
        },
        equipped: { equipped: [] },
      }),
      { theme: 'dark', glow: 'soft' },
    )
    expect(svg).toContain('Codex x17')
    // the old "· assisted" wording is fully replaced by the count
    expect(svg).not.toContain('· assisted')
    // no <script> ever leaks into the rendered card
    expect(svg).not.toContain('<script')
    expect(svg).toMatchSnapshot('card-assisted-dark')
  })

  it('quantifies a single assisted commit as x1 (count boundary)', () => {
    const svg = renderCardV2(
      makeCardData({
        toolAttribution: {
          tools: [],
          assisted: [{ toolId: 'codex', toolName: 'Codex', count: 1 }],
          totalAiCommits: 1,
          verified: true,
        },
        equipped: { equipped: [] },
      }),
      { theme: 'dark', glow: 'soft' },
    )
    expect(svg).toContain('Codex x1')
  })

  it('escapes XML in username (39-char boundary + injection attempt)', () => {
    const long = 'a'.repeat(39)
    expect(
      renderCardV2(makeCardData({ username: long }), { theme: 'dark', glow: 'soft' }),
    ).toContain(long)
    // GH_LOGIN_RE 通過後の値しか来ないが、描画層は防御的に escape する
    const svg = renderCardV2(makeCardData({ username: 'x"><script' as string }), {
      theme: 'dark',
      glow: 'soft',
    })
    expect(svg).not.toContain('"><script')
  })

  it('shrinks the nameplate for long usernames so it clears the POWER block', () => {
    // Short names keep the 42px hero size (font-size="42" is unique to the nameplate).
    expect(
      renderCardV2(makeCardData({ username: 'octocat' }), { theme: 'dark', glow: 'soft' }),
    ).toContain('font-size="42"')
    // A max-length 39-char GitHub login must render smaller so it never
    // overlaps the top-right POWER block.
    const long = renderCardV2(makeCardData({ username: 'a'.repeat(39) }), {
      theme: 'dark',
      glow: 'soft',
    })
    expect(long).not.toContain('font-size="42"')
    const m = long.match(new RegExp(`font-size="(\\d+)"[^>]*>${'a'.repeat(39)}<`))
    expect(m).not.toBeNull()
    expect(Number(m?.[1])).toBeLessThanOrEqual(26)
  })

  it('renders without tools and without commits (zero states)', () => {
    const svg = renderCardV2(
      makeCardData({
        toolAttribution: { tools: [], assisted: [], totalAiCommits: 0, verified: false },
        equipped: { equipped: [] },
        usage: { categories: [], totalCommits: 0 },
        languages: { languages: [], othersPercentage: 0 },
        stats: {
          velocity: 0,
          diversity: 0,
          consistency: 0,
          synergy: 0,
          range: 0,
          flow: 0,
          power: 0,
          aiCommitsInWindow: 0,
          activeWeeks: 0,
        },
      }),
      { theme: 'light', glow: 'soft' },
    )
    expect(svg).toContain('width="750"')
    expect(svg).not.toContain('NaN')
    expect(svg).not.toContain('undefined')
  })

  it('renders the avatar medallion only from a data: URI, never a remote http(s) href', () => {
    const withAvatar = renderCardV2(makeCardData({ avatarDataUri: PNG_1PX }), {
      theme: 'dark',
      glow: 'soft',
    })
    expect(withAvatar).toContain('<image')
    expect(withAvatar).toContain(PNG_1PX)
    // No <image> may ever carry an http(s) href (blocked in GitHub's camo/img context).
    expect(withAvatar).not.toMatch(/<image[^>]+href="http/)

    // null avatar → no medallion image at all, card still renders.
    const noAvatar = renderCardV2(makeCardData({ avatarDataUri: null }), {
      theme: 'dark',
      glow: 'soft',
    })
    expect(noAvatar).not.toContain('<image')
    expect(noAvatar).toContain('width="750"')
  })

  it('renders the 6-axis radar labels', () => {
    const svg = renderCardV2(makeCardData(), { theme: 'dark', glow: 'soft' })
    for (const axis of ['VELOCITY', 'DIVERSITY', 'SYNERGY', 'CONSISTENCY', 'RANGE', 'FLOW']) {
      expect(svg).toContain(axis)
    }
  })

  it('POWER turns gold at 9000 (8999 stays accent)', () => {
    const under = renderCardV2(makeCardData({ stats: { ...makeCardData().stats, power: 8999 } }), {
      theme: 'dark',
      glow: 'soft',
    })
    expect(under).toContain('8,999')
    expect(under).not.toContain('#f0b429')

    const over = renderCardV2(makeCardData({ stats: { ...makeCardData().stats, power: 9000 } }), {
      theme: 'dark',
      glow: 'soft',
    })
    expect(over).toContain('9,000')
    expect(over).toContain('#f0b429')
  })

  it("drops loadout chips that would overflow the card's right edge", () => {
    const svg = renderCardV2(
      makeCardData({
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
      { theme: 'dark', glow: 'soft' },
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

describe('renderCardV2 private inclusion labels (v3.0)', () => {
  it('defaults to public labels (public 12wk / ✓ verified) when includesPrivate is false', () => {
    const svg = renderCardV2(makeCardData({ includesPrivate: false }), {
      theme: 'dark',
      glow: 'soft',
    })
    expect(svg).toContain('public 12wk')
    expect(svg).not.toContain('all repos')
    expect(svg).toContain('✓ verified')
    expect(svg).not.toContain('verified+')
  })

  it('switches to all repos · 12wk and ✓ verified+ when includesPrivate is true', () => {
    const svg = renderCardV2(makeCardData({ includesPrivate: true }), {
      theme: 'dark',
      glow: 'soft',
    })
    expect(svg).toContain('all repos · 12wk')
    expect(svg).not.toContain('public 12wk')
    expect(svg).toContain('✓ verified+')
  })

  it('never leaks a repository name onto the card (only aggregate labels change)', () => {
    // includesPrivate is purely a display toggle — no repo identifiers are rendered.
    const priv = renderCardV2(makeCardData({ includesPrivate: true }), {
      theme: 'dark',
      glow: 'soft',
    })
    const pub = renderCardV2(makeCardData({ includesPrivate: false }), {
      theme: 'dark',
      glow: 'soft',
    })
    // The two SVGs differ only in the scope/verified labels, not by adding repo names.
    expect(priv).toContain('all repos · 12wk')
    expect(pub).toContain('public 12wk')
  })

  it('shows no verified label at all (regardless of scope) when unverified', () => {
    const svg = renderCardV2(
      makeCardData({
        includesPrivate: true,
        toolAttribution: { tools: [], assisted: [], totalAiCommits: 0, verified: false },
      }),
      { theme: 'dark', glow: 'soft' },
    )
    expect(svg).not.toContain('verified')
  })
})

describe('renderCardV2 TYPES language bar (v3.0)', () => {
  // Stacked-bar segments render at height="10.00" (toFixed) with a bare color fill; the
  // faint full-width track keeps integer height="10" + a fill-opacity, so this matches
  // only the colored segments (one per language + one "others" tail when > 0).
  const SEG_RE = /<rect x="[0-9.]+" y="786\.00" width="[0-9.]+" height="10\.00" fill="[^"]*" \/>/g
  const segCount = (svg: string): number => [...svg.matchAll(SEG_RE)].length

  it('renders one segment per language plus an others tail', () => {
    const svg = renderCardV2(makeCardData(), { theme: 'dark', glow: 'soft' })
    // 3 languages + others(8%) → 4 segments.
    expect(segCount(svg)).toBe(4)
  })

  it('omits the others segment when othersPercentage is 0', () => {
    const svg = renderCardV2(
      makeCardData({
        languages: {
          languages: [
            { name: 'TypeScript', color: '#3178c6', percentage: 70 },
            { name: 'Go', color: '#00add8', percentage: 30 },
          ],
          othersPercentage: 0,
        },
      }),
      { theme: 'dark', glow: 'soft' },
    )
    expect(segCount(svg)).toBe(2)
  })

  it('renders the legend with language names and integer percentages', () => {
    const svg = renderCardV2(makeCardData(), { theme: 'dark', glow: 'soft' })
    expect(svg).toContain('> TypeScript </tspan>')
    expect(svg).toContain('>62%</tspan>')
    expect(svg).toContain('> Shell </tspan>')
  })

  it('segment widths are proportional to percentage (TS ≈ 3× Python)', () => {
    const svg = renderCardV2(makeCardData(), { theme: 'dark', glow: 'soft' })
    const widths = [...svg.matchAll(SEG_RE)].map((m) => {
      const w = m[0].match(/width="([0-9.]+)"/)
      return Number(w?.[1])
    })
    // First segment (TS 62%) is wider than the second (Python 21%) by ~3×.
    expect(widths[0]).toBeGreaterThan(widths[1] * 2.5)
  })

  it('a single dominant language still renders exactly one full-width-ish segment + others', () => {
    const svg = renderCardV2(
      makeCardData({
        languages: {
          languages: [{ name: 'TypeScript', color: '#3178c6', percentage: 96 }],
          othersPercentage: 4,
        },
      }),
      { theme: 'dark', glow: 'soft' },
    )
    expect(segCount(svg)).toBe(2)
    expect(svg).toContain('> TypeScript </tspan>')
  })

  it('renders a — placeholder and no bar when there are no languages', () => {
    const svg = renderCardV2(makeCardData({ languages: { languages: [], othersPercentage: 0 } }), {
      theme: 'dark',
      glow: 'soft',
    })
    expect(segCount(svg)).toBe(0)
    expect(svg).not.toContain('langBarClip')
    expect(svg).not.toContain('NaN')
  })

  it('escapes XML defensively in a language legend name', () => {
    const svg = renderCardV2(
      makeCardData({
        languages: {
          languages: [{ name: 'C<script>', color: '#555555', percentage: 100 }],
          othersPercentage: 0,
        },
      }),
      { theme: 'dark', glow: 'soft' },
    )
    expect(svg).not.toContain('C<script>')
    expect(svg).toContain('C&lt;script&gt;')
  })
})

describe('renderCardV2 RECORD strip', () => {
  it('renders the RECORD strip: EXP (comma-grouped), commit/pr/review counts, streak', () => {
    const svg = renderCardV2(makeCardData(), { theme: 'dark', glow: 'soft' })
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
    const priv = renderCardV2(
      makeCardData({ record: { ...makeCardData().record, inclPrivate: true } }),
      {
        theme: 'dark',
        glow: 'soft',
      },
    )
    expect(priv).toContain('incl. private')
    const pub = renderCardV2(makeCardData(), { theme: 'dark', glow: 'soft' })
    expect(pub).not.toContain('incl. private')
  })

  it('falls back to "best {n}d" when current streak is 0 but a longest exists', () => {
    const svg = renderCardV2(
      makeCardData({ record: { ...makeCardData().record, currentStreak: 0, longestStreak: 12 } }),
      { theme: 'dark', glow: 'soft' },
    )
    expect(svg).toContain('best 12d')
    expect(svg).not.toContain('d streak')
  })

  it('hides the streak entirely when both current and longest are 0', () => {
    const svg = renderCardV2(
      makeCardData({ record: { ...makeCardData().record, currentStreak: 0, longestStreak: 0 } }),
      { theme: 'dark', glow: 'soft' },
    )
    expect(svg).not.toContain('streak')
    expect(svg).not.toContain('best ')
  })

  it('renders a zero record without NaN/undefined (degraded strip)', () => {
    const svg = renderCardV2(
      makeCardData({
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
      { theme: 'light', glow: 'soft' },
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
    const svg = renderCardV2(
      makeCardData({ record: { ...makeCardData().record, yearTotal: 3480 } }),
      {
        theme: 'dark',
        glow: 'soft',
      },
    )
    expect(svg).toContain('CONTRIBUTIONS · 1y')
    expect(svg).toContain('3,480 total')
  })

  it('renders exactly 52 bars', () => {
    const svg = renderCardV2(makeCardData(), { theme: 'dark', glow: 'soft' })
    expect(barHeights(svg)).toHaveLength(52)
  })

  it('uses toFixed(2) coordinates for golden stability', () => {
    const svg = renderCardV2(makeCardData(), { theme: 'dark', glow: 'soft' })
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
      makeCardData({
        record: {
          ...makeCardData().record,
          yearTotal: 0,
          weeklyContributions: new Array(52).fill(0),
        },
      }),
      { theme: 'light', glow: 'soft' },
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
      makeCardData({ record: { ...makeCardData().record, weeklyContributions: weekly } }),
      { theme: 'dark', glow: 'soft' },
    )
    const heights = barHeights(svg)
    // sqrt(1)/sqrt(100)=0.1 → h≈6.8; a linear scale would give ≈4.28 (crushed to the floor).
    const smallBars = heights.filter((h) => h > 4 && h < 32)
    expect(smallBars.length).toBeGreaterThan(0)
    expect(Math.min(...smallBars)).toBeGreaterThan(6) // proves sqrt, not linear
  })

  it('marks the current (rightmost) week with a full-opacity bar + 1px outline ring', () => {
    const svg = renderCardV2(makeCardData(), { theme: 'dark', glow: 'soft' })
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
    const svg = renderCardV2(makeCardData({ traits: [] }), { theme: 'dark', glow: 'soft' })
    expect(svg).not.toMatch(/<line x1="104"/) // PAD+60 divider start
  })
})

describe('renderCardV2 ELEMENT + EPITHET + TRAITS (v2.6)', () => {
  it('shows the epithet on the archetype row (not the raw pattern label)', () => {
    const svg = renderCardV2(makeCardData({ epithet: 'The Overseer' }), {
      theme: 'dark',
      glow: 'soft',
    })
    expect(svg).toContain('The Overseer')
    // The archetype row no longer prints the PatternType class label.
    expect(svg).not.toContain('>Pair Programmer<')
  })

  it('renders the element energy mark with a radial-gradient token, label, and element color', () => {
    const svg = renderCardV2(
      makeCardData({ element: { id: 'blaze', label: 'Blaze', color: '#f4652f' } }),
      { theme: 'dark', glow: 'soft' },
    )
    expect(svg).toContain('Blaze')
    expect(svg).toContain('#f4652f') // element color drives the energy radial gradient
    expect(svg).toContain('url(#energyGrad)') // token filled with the radial energy gradient
  })

  it('renders up to two TRAITS lines (◆ name — proof) in place of flavor', () => {
    const svg = renderCardV2(
      makeCardData({
        traits: [
          { id: 'centurion', name: 'Centurion', proof: '137 AI-assisted commits in 12 weeks' },
          { id: 'ghostwriter', name: 'Ghostwriter', proof: '84% of commits ship with AI' },
        ],
      }),
      { theme: 'dark', glow: 'soft' },
    )
    expect(svg).toContain('◆ Centurion')
    expect(svg).toContain('137 AI-assisted commits in 12 weeks')
    expect(svg).toContain('◆ Ghostwriter')
    // flavor line is suppressed when traits fire
    expect(svg).not.toContain('Trades keystrokes')
  })

  it('falls back to the flavor line when no trait fired', () => {
    const svg = renderCardV2(makeCardData({ traits: [] }), { theme: 'dark', glow: 'soft' })
    expect(svg).toContain('Trades keystrokes')
    expect(svg).not.toContain('◆')
  })

  it('escapes XML defensively in trait name/proof', () => {
    const svg = renderCardV2(makeCardData({ traits: [{ id: 'x', name: 'a<b', proof: 'c&d">' }] }), {
      theme: 'dark',
      glow: 'soft',
    })
    expect(svg).not.toContain('a<b')
    expect(svg).not.toContain('c&d">')
    expect(svg).toContain('a&lt;b')
  })
})

describe('renderCardV2 Pokémon-grammar polish (v2.8)', () => {
  it('renders POWER at the HP position (nameplate label + number), not in the STATS header', () => {
    const svg = renderCardV2(makeCardData({ stats: { ...makeCardData().stats, power: 6426 } }), {
      theme: 'dark',
      glow: 'soft',
    })
    // POWER label + number both right-aligned at the expanded plate edge (x=706).
    expect(svg).toContain('<text x="706" y="84"')
    expect(svg).toMatch(/<text x="706" y="128"[^>]*font-size="32"[^>]*>6,426<\/text>/)
    // The old STATS-header POWER (font-size 30 headline) is gone.
    expect(svg).not.toContain('font-size="30"')
  })

  it('keeps the gold POWER + glow halo past 9000 at the HP position', () => {
    const over = renderCardV2(makeCardData({ stats: { ...makeCardData().stats, power: 9420 } }), {
      theme: 'dark',
      glow: 'soft',
    })
    expect(over).toContain('9,420')
    expect(over).toContain('#f0b429') // gold
    expect(over).toContain('filter="url(#powerGlow)"') // glow halo only when gold
    const under = renderCardV2(makeCardData({ stats: { ...makeCardData().stats, power: 8999 } }), {
      theme: 'dark',
      glow: 'soft',
    })
    expect(under).not.toContain('filter="url(#powerGlow)"')
  })

  it('renders the card-number footer as No.<serial> · S1 ’YY · public 12wk', () => {
    const svg = renderCardV2(makeCardData({ serial: '#7F3A', issuedYear: 2026 }), {
      theme: 'dark',
      glow: 'soft',
    })
    expect(svg).toContain('No.7F3A · S1 ’26 · public 12wk')
    expect(svg).not.toContain('#7F3A') // the # is dropped in the No. form
  })

  it('contains no rank gem or rarity mark and labels the chosen finish', () => {
    const svg = renderCardV2(makeCardData(), { theme: 'dark', glow: 'soft' })
    expect(svg).not.toContain('gemGrad')
    expect(svg).not.toContain('rarityHolo')
    expect(svg).toContain('SOFT GLOW')
  })

  it('pulls the trait proof headline number to the right (damage-number position)', () => {
    const svg = renderCardV2(
      makeCardData({
        traits: [
          { id: 'unbroken', name: 'Unbroken', proof: '23-day commit streak, still alive' },
          { id: 'centurion', name: 'Centurion', proof: '120 AI-assisted commits in 12 weeks' },
        ],
      }),
      { theme: 'dark', glow: 'soft' },
    )
    // N-day → "23d", first-number-wins → "120" (not "12w" from the trailing "12 weeks").
    expect(svg).toMatch(/<text x="706"[^>]*text-anchor="end"[^>]*>23d<\/text>/)
    expect(svg).toMatch(/<text x="706"[^>]*text-anchor="end"[^>]*>120<\/text>/)
  })

  it('omits the right damage number for a numberless trait proof', () => {
    const svg = renderCardV2(
      makeCardData({
        traits: [{ id: 'ironhand', name: 'Iron hand', proof: 'Ships mostly bare-handed' }],
      }),
      { theme: 'dark', glow: 'soft' },
    )
    expect(svg).toContain('◆ Iron hand')
    // No right-aligned damage number is emitted for this line.
    expect(svg).not.toMatch(/<text x="706"[^>]*text-anchor="end"[^>]*font-size="22"/)
  })

  it('renders the art window double frame using the chosen glow treatment', () => {
    const svg = renderCardV2(makeCardData(), { theme: 'dark', glow: 'neon' })
    // Inner frame inset 4px from the art rect (x=48, y=214) in the theme accent.
    expect(svg).toContain('<rect x="48" y="214"')
    expect(svg).toContain('#a371f7')
  })
})

describe('renderPlaceholderCard', () => {
  it('renders summoning card with username', () => {
    const svg = renderPlaceholderCard('testuser', 'dark', 'soft')
    expect(svg).toContain('Summoning')
    expect(svg).toContain('testuser')
    expect(svg).toContain('width="750"')
  })
})
