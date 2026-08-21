# Community Posts — v3.2 Launch Final（テーマ13種 + glow 4種に合わせて全面改稿）

添付画像: `launch-assets/card-sakimyto.png`（縦カード）/ `launch-assets/theme-grid.png`（テーマ比較）/ `launch-assets/og-sakimyto.png`（横）

> **重要**: レアリティ／ティア（S/A/B/D）は製品から削除済み。見た目は**ランクではなくユーザーの選択**（13テーマ × 4 glow）。旧原稿の "S tier gets a holo frame" 系の文言は使わない。

## Hacker News (Show HN) — 22:00-24:00 JST に投下

**Title:** Show HN: PullCard – Your AI coding style as a trading card, in your editor's theme

A few years back, every other GitHub profile README had `anuraghazra/github-readme-stats` cards — grass count, top languages, a streak counter. The whole "my README is a trading card" aesthetic that quietly faded.

I took that literally and built PullCard AI: it reads your commit history and renders an actual trading card of your AI coding style, as pure SVG you can embed with one line of markdown.

The part I kept fighting with was the frame. Early versions assigned you a rarity tier — S got the holo border, everyone else got silver or bronze. It looked great in screenshots and felt bad in practice: a card on your own profile that quietly tells visitors you rank below someone else is not a thing you want to embed. So the rank is gone. The finish is now yours to pick:

- **13 themes**, taken from the editor palettes people actually work in — Dracula, Nord, Gruvbox, Tokyo Night, Catppuccin, One Dark, Monokai, Solarized (light/dark), Synthwave, Matrix, plus plain light/dark
- **4 glows** — Clean, Soft, Neon, and an animated Holo border with foil texture and sparkles (SMIL + SVG filters, works inside GitHub's camo-proxied `<img>`)

Everything else is measured, not chosen:

- POWER at the HP position, calibrated so the number goes gold past 9000
- A 6-axis radar (VELOCITY / DIVERSITY / SYNERGY / CONSISTENCY / RANGE / FLOW), all from the same 12-week window so the card can never contradict itself
- An element (argmax of your radar), an epithet (The Strategist, The Lone Wolf...), and activated traits — condition-triggered abilities like "Centurion — 215 AI-assisted commits in 12 weeks" written on the card automatically
- Generative art seeded by your username hash, your avatar as a medallion, a 52-week contribution graph, and a card serial

Detection covers 33 AI tools (Claude, Codex, Copilot, Cursor, Cline, DeepSeek, Qwen, v0, Bolt...) across three evidence tiers: committed (trailers/generator markers/bots), assisted (review-style usage in commit bodies — my card shows "Codex x27" because I use Codex as a reviewer and it never leaves a trailer), and equipped (CLAUDE.md / .cursorrules in your repos).

Unlike session-stats cards (e.g. codecard.dev), PullCard reads your actual GitHub commit history and detects AI usage with 3-layer evidence — committed / assisted / equipped.

Privacy: public repos by default. Installing the GitHub App with "All repositories" opts you into private-inclusive stats — counts only, never code, never repo names — and the card labels itself `all repos · verified+` so nobody can quietly inflate. The "Recently summoned" gallery on the homepage is opt-in for the same reason: anyone can render anyone's card, but you only get *listed* after installing the App on your own account, and uninstalling drops you off without a removal request.

Stack: Cloudflare Workers + GitHub GraphQL (3 parallel queries — the combined one 502s past the gateway limit), KV stale-if-error cache, Analytics Engine, resvg-wasm with subset Inter for the OGP share image. One implementation detail I got wrong first: the cache key included theme and glow, so 52 appearance combinations meant up to 52 GraphQL round-trips for the same person. The analysis result is now cached per user and the appearance is rendered on the way out — 1 upstream fetch, any look. No LLM calls; everything is deterministic and unit-tested (494 tests).

Summon yours: https://pullcard.sakimyto.com
Repo: https://github.com/sakimyto/pullcard-ai (MIT)

Happy to take feedback on the rubric — trait pool, radar weighting, themes and tools I've missed.

---

## Reddit r/ClaudeAI

**Title:** I turned my Claude usage into a Pokémon-style trading card (pick your editor's theme)

PullCard reads Co-Authored-By trailers and "Generated with Claude Code" markers and summons a full trading card: epithet, element, 6-axis radar, POWER, activated traits, and a 52-week graph. My loadout says Claude 99% — and "Codex x27" from the assisted tier, because reviewer-style AI usage in commit bodies counts too. It's your real commit history with 3-layer evidence, not self-reported session stats.

The look is yours: 13 editor themes (Dracula, Nord, Tokyo Night, Catppuccin, Gruvbox, Monokai, Solarized, Synthwave, Matrix...) × 4 finishes, including an animated holo border that actually animates inside your README. No rarity tier, no rank — your card doesn't tell visitors where you place.

CLAUDE.md in your repos = a Claude "equipped" badge. Install the GitHub App with All repositories and private activity counts in (numbers only, never code) — the card shows `verified+`.

One line of markdown:

```markdown
[![AI Builder Trading Card](https://pullcard.sakimyto.com/?user=YOUR_USERNAME&theme=dracula&glow=holo)](https://pullcard.sakimyto.com/?theme=dracula&glow=holo#YOUR_USERNAME)
```

Summon: https://pullcard.sakimyto.com — install the App and you also show up in the opt-in gallery on the homepage.

---

## Reddit r/cursor

**Title:** PullCard AI — a trading card of your AI coding style (Cursor detected 3 ways)

Cursor users get detected via commit trailers, "Generated with Cursor" markers, and an "equipped" badge for .cursorrules / .cursor/rules. The card: 6-axis radar, POWER, element + epithet, activated traits, 52-week graph — and you pick the finish from 13 editor themes × 4 glows, so it can match whatever you have Cursor themed as.

```markdown
[![AI Builder Trading Card](https://pullcard.sakimyto.com/?user=YOUR_USERNAME&theme=tokyo-night&glow=neon)](https://pullcard.sakimyto.com/?theme=tokyo-night&glow=neon#YOUR_USERNAME)
```

https://pullcard.sakimyto.com

---

## Reddit r/GithubProfileReadme

**Title:** Pokémon-style AI builder card for your README — now in 13 editor themes (Dracula, Nord, Tokyo Night...)

The classic github-readme-stats energy, but a full TCG card: POWER at the HP position, radar stats, element/epithet/traits, your avatar as a medallion, and a 52-week contribution graph. Detects 33 AI coding tools.

Pick the palette you actually work in — Dracula, Nord, Gruvbox, Tokyo Night, Catppuccin, One Dark, Monokai, Solarized, Synthwave, Matrix, light, dark — and one of 4 finishes, including a holo border that animates inside your README.

```markdown
[![AI Builder Trading Card](https://pullcard.sakimyto.com/?user=YOUR_USERNAME&theme=nord&glow=soft)](https://pullcard.sakimyto.com/?theme=nord&glow=soft#YOUR_USERNAME)
```

https://pullcard.sakimyto.com

---

## Claude Community (Discord / Forum)

**Title:** Your Claude coding style as a trading card, in your editor's theme

Built PullCard AI — summons an AI Builder Trading Card from your GitHub activity: epithet + element, 6-axis radar, POWER, activated traits, and a Claude "equipped" badge when your repos carry CLAUDE.md. 13 editor themes × 4 finishes, so it matches your setup. Private repos opt-in via the GitHub App (counts only, never code) → `verified+`.

60 seconds: https://pullcard.sakimyto.com

---

## 投下手順（今夜）

1. **22:00-24:00 JST**: Show HN（画像添付不可なので本文リンクのみ。https://news.ycombinator.com/submit → Title + URL https://pullcard.sakimyto.com、本文は最初のコメントとして投稿）
2. 投下直後: HN のスレ URL を控える（Xで引用するため）
3. **同夜〜翌朝**: Reddit 3板（画像投稿可: r/GithubProfileReadme は theme-grid.png、他は card-sakimyto.png を添付）
4. **翌朝**: X 英語（x-post-en.md、theme-grid.png 添付）
5. **翌日夜**: X 日本語（x-post.md）+ Zenn 公開（zenn-article.md を published: true に）
