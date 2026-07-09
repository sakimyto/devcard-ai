# Community Posts — v2 Trading Card Edition

## Hacker News (Show HN) — 最優先

**Title:** Show HN: Your AI coding style as a trading card, from Co-Authored-By trailers

A few years back, every other GitHub profile README had `anuraghazra/github-readme-stats` cards — grass count, top languages, a streak counter. The whole "my README is a trading card" aesthetic that quietly faded.

I took that literally and built devcard-ai: it reads your public commit history and renders an actual trading card of your AI coding style, as pure SVG you can embed with one line of markdown.

The trading-card grammar:

- Rarity frame decided by your tier — S renders an animated holo border (SMIL, works inside GitHub's camo-proxied `<img>`), then gold / silver / bronze / common
- Archetype class: AI Native / Pair Programmer / Delegator / Selective User (from AI-commit ratio + how you interleave human and AI commits)
- Stats: VELOCITY / DIVERSITY / CONSISTENCY (0-100). Every metric shares the same 12-week public window, so the card can't contradict itself
- Generative geometric art seeded by your username hash — deterministic, unique per user
- A card serial derived from the same hash

Detection goes beyond `Co-Authored-By:` trailers: generator markers ("Generated with Claude Code" etc.), bot authors, and "equipped" badges when your repos carry CLAUDE.md / AGENTS.md / .cursorrules / copilot-instructions.

Stack: Cloudflare Workers + GitHub GraphQL (`history(since:)` for the window), KV stale-if-error cache, Analytics Engine, @resvg/resvg-wasm with subset Inter fonts for the 1200×630 OGP share image. No LLM calls anywhere — everything is deterministic.

Live: https://devcard.sakimyto.com/#sakimyto
Repo: https://github.com/sakimyto/devcard-ai

Honest limitation: it only sees public repos, so private-heavy builders (me included — I grade a C) rank lower than their real activity. An opt-in OAuth "Verified+" mode that counts private contribution numbers (never code) is the planned v2.x.

Happy to take feedback on the rubric — archetype boundaries, tier thresholds, tools to add.

---

## Reddit r/ClaudeAI

**Title:** I turned your Claude coding habits into a trading card for your GitHub README

devcard-ai reads Co-Authored-By trailers and "Generated with Claude Code" markers in your public commits and summons an AI Builder Trading Card: rarity frame (S tier = animated holo), archetype (AI Native / Pair Programmer / Delegator / Selective User), VELOCITY / DIVERSITY / CONSISTENCY stats from a 12-week window, and generative art unique to your username.

If your repos carry a CLAUDE.md, the card shows a Claude "equipped" badge even beyond the commit evidence.

One line in your README:

```markdown
[![AI Builder Trading Card](https://devcard.sakimyto.com/?user=YOUR_USERNAME&theme=dark)](https://devcard.sakimyto.com/#YOUR_USERNAME)
```

Summon: https://devcard.sakimyto.com — feedback on the tier rubric welcome.

---

## Reddit r/cursor

**Title:** devcard-ai — a trading card of your AI coding style (Cursor detected via commit evidence + .cursorrules)

Cursor users get detected two ways: commit evidence (Co-Authored-By / generator markers) and an "equipped" badge if your repos carry .cursorrules or .cursor/rules. The card shows rarity frame, archetype, 12-week stats, and generative art seeded by your username.

```markdown
[![AI Builder Trading Card](https://devcard.sakimyto.com/?user=YOUR_USERNAME&theme=dark)](https://devcard.sakimyto.com/#YOUR_USERNAME)
```

https://devcard.sakimyto.com

---

## Reddit r/GithubProfileReadme

**Title:** AI Builder Trading Card — rarity frames, archetypes and stats from your commit history

The classic github-readme-stats energy, but as a full trading card for the AI coding era. S-tier cards get an animated holo frame that actually animates inside your README. Every stat comes from the same public 12-week window. Light/dark themes.

```markdown
[![AI Builder Trading Card](https://devcard.sakimyto.com/?user=YOUR_USERNAME&theme=dark)](https://devcard.sakimyto.com/#YOUR_USERNAME)
```

https://devcard.sakimyto.com

---

## Claude Community (Discord / Forum)

**Title:** Your Claude coding style as a trading card

Built devcard-ai — it summons an AI Builder Trading Card from your public GitHub activity: rarity frame by tier (S = animated holo), archetype class, VELOCITY / DIVERSITY / CONSISTENCY, generative art unique to your username, and a Claude "equipped" badge when your repos carry CLAUDE.md.

Pure SVG, one line of markdown, 60 seconds: https://devcard.sakimyto.com

---

## 投下順序（戦略文書の行動4）

1. Show HN（平日 US 朝 = JST 22-24時 が初速最良）
2. Reddit r/ClaudeAI → r/cursor → r/GithubProfileReadme（同日〜翌日、コピペでなく各 sub の文体に合わせ済み）
3. X 英語（HN/Reddit の反応を引用できるとなお良い）
4. 24-48h 後: X 日本語 + Zenn 公開
5. Product Hunt は初速が付いた場合のみ
