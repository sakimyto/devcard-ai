# Community Posts — v3.1 Launch Final（2026-07-10 今夜投下用）

添付画像: `launch-assets/card-sakimyto.png`（縦カード）/ `launch-assets/og-sakimyto.png`（横）

## Hacker News (Show HN) — 22:00-24:00 JST に投下

**Title:** Show HN: Your AI coding style as a Pokémon-style trading card

A few years back, every other GitHub profile README had `anuraghazra/github-readme-stats` cards — grass count, top languages, a streak counter. The whole "my README is a trading card" aesthetic that quietly faded.

I took that literally and built devcard-ai: it reads your commit history and renders an actual trading card of your AI coding style, as pure SVG you can embed with one line of markdown.

The trading-card grammar, played straight:

- Rarity frame by tier — S renders an animated holo border with foil texture and sparkles (SMIL + SVG filters, works inside GitHub's camo-proxied `<img>`), then gold / silver / bronze / common
- POWER at the HP position, calibrated so only the top tier crosses 9000
- A 6-axis radar (VELOCITY / DIVERSITY / SYNERGY / CONSISTENCY / RANGE / FLOW), all from the same 12-week window so the card can never contradict itself
- An element (argmax of your radar), an epithet (The Strategist, The Lone Wolf...), and activated traits — condition-triggered abilities like "Centurion — 215 AI-assisted commits in 12 weeks" written on the card automatically
- Generative art seeded by your username hash, your avatar as a medallion, a 52-week contribution graph, and a card serial

Detection covers 33 AI tools (Claude, Codex, Copilot, Cursor, Cline, DeepSeek, Qwen, v0, Bolt...) across three evidence tiers: committed (trailers/generator markers/bots), assisted (review-style usage in commit bodies — my card shows "Codex x27" because I use Codex as a reviewer and it never leaves a trailer), and equipped (CLAUDE.md / .cursorrules in your repos).

Privacy: public repos by default. Installing the GitHub App with "All repositories" opts you into private-inclusive stats — counts only, never code, never repo names — and the card labels itself `all repos · verified+` so nobody can quietly inflate.

Stack: Cloudflare Workers + GitHub GraphQL (3 parallel queries — the combined one 502s past the gateway limit), KV stale-if-error cache, Analytics Engine, resvg-wasm with subset Inter for the OGP share image. No LLM calls; everything is deterministic and unit-tested (465 tests).

Summon yours: https://devcard.sakimyto.com
Repo: https://github.com/sakimyto/devcard-ai (MIT)

Happy to take feedback on the rubric — tier thresholds, trait pool, tools I've missed.

---

## Reddit r/ClaudeAI

**Title:** I turned my Claude usage into a Pokémon-style trading card (holo frame for S tier)

devcard-ai reads Co-Authored-By trailers and "Generated with Claude Code" markers and summons a full trading card: rarity frame (S = animated holo in your README), epithet, element, 6-axis radar, POWER, activated traits, and a 52-week graph. My loadout says Claude 99% — and "Codex x27" from the assisted tier, because reviewer-style AI usage in commit bodies counts too.

CLAUDE.md in your repos = a Claude "equipped" badge. Install the GitHub App with All repositories and private activity counts in (numbers only, never code) — the card shows `verified+`.

One line of markdown:

```markdown
[![AI Builder Trading Card](https://devcard.sakimyto.com/?user=YOUR_USERNAME&theme=dark)](https://devcard.sakimyto.com/#YOUR_USERNAME)
```

Summon: https://devcard.sakimyto.com — the recently-summoned gallery shows everyone's cards.

---

## Reddit r/cursor

**Title:** devcard-ai — a trading card of your AI coding style (Cursor detected 3 ways)

Cursor users get detected via commit trailers, "Generated with Cursor" markers, and an "equipped" badge for .cursorrules / .cursor/rules. The card: rarity frames, 6-axis radar, POWER, element + epithet, activated traits, 52-week graph.

```markdown
[![AI Builder Trading Card](https://devcard.sakimyto.com/?user=YOUR_USERNAME&theme=dark)](https://devcard.sakimyto.com/#YOUR_USERNAME)
```

https://devcard.sakimyto.com

---

## Reddit r/GithubProfileReadme

**Title:** Pokémon-style AI builder card for your README — S tier gets an animated holo frame

The classic github-readme-stats energy, but a full TCG card: rarity frames that actually animate inside your README, POWER at the HP position, radar stats, element/epithet/traits, your avatar as a medallion, and a 52-week contribution graph. Detects 33 AI coding tools. Light/dark.

```markdown
[![AI Builder Trading Card](https://devcard.sakimyto.com/?user=YOUR_USERNAME&theme=dark)](https://devcard.sakimyto.com/#YOUR_USERNAME)
```

https://devcard.sakimyto.com

---

## Claude Community (Discord / Forum)

**Title:** Your Claude coding style as a holo trading card

Built devcard-ai — summons an AI Builder Trading Card from your GitHub activity: rarity frame by tier (S = animated holo), epithet + element, 6-axis radar, POWER, activated traits, and a Claude "equipped" badge when your repos carry CLAUDE.md. Private repos opt-in via the GitHub App (counts only, never code) → `verified+`.

60 seconds: https://devcard.sakimyto.com

---

## 投下手順（今夜）

1. **22:00-24:00 JST**: Show HN（card-sakimyto.png 添付不可なので本文リンクのみ。https://news.ycombinator.com/submit → Title + URL https://devcard.sakimyto.com、本文は最初のコメントとして投稿）
2. 投下直後: HN のスレ URL を控える（Xで引用するため）
3. **同夜〜翌朝**: Reddit 3板（画像投稿可: card-sakimyto.png を添付）
4. **翌朝**: X 英語（x-post-en.md、card PNG 添付）
5. **翌日夜**: X 日本語（x-post.md）+ Zenn 公開（zenn-article.md を published: true に）
