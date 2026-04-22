# Community Posts

## Claude Community (Discord / Forum)

**Title:** I built an AI version of the classic GitHub Stats Card

Remember when everyone had a Stats Card on their GitHub profile README around 2020-2022? The `anuraghazra/github-readme-stats` one with grass count, stars, top languages, that streak counter. The whole "make your README a little personal trading card" vibe.

I missed that. So I built **devcard-ai** — the AI coding tool version of the same idea.

It analyzes `Co-Authored-By` trailers in your commits and renders a card showing which AI tools you use and how. 11 tools detected: Claude, Codex, Copilot, Cursor, Windsurf, Aider, Cody, Amazon Q, Gemini, Devin, Sweep.

The card shows:

- Tool attribution ratio (stacked bar)
- 12-week ship cadence (sparkline + AI commits per week)
- Usage breakdown: feature / bugfix / test / refactor (donut)
- Achievement badges: Multi-Tool, Parallel, TDD with AI, Shipper
- Builder Archetype: AI Native / Pair Programmer / Delegator / Selective User
- Verified ✓ mark (derived from your commit trail — non-fakeable)
- TIER S–D + light/dark themes

One line in your README:

```markdown
![AI Dev Card](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME&theme=dark)
```

Built with Cloudflare Workers + GitHub GraphQL API. Pure SVG so it renders directly in GitHub READMEs (no JS, no external fonts).

Try it: https://devcard-ai.sakimyto.workers.dev/

---

## Cursor Community (Forum)

**Title:** devcard-ai — an AI version of the GitHub Stats Card

Made a service that reads `Co-Authored-By` commit trailers to show which AI tools you use. Cursor commits (`Co-Authored-By: Cursor`) are detected alongside Claude, Codex, Copilot and 7 others.

Beyond tool attribution, the card shows:

- 12-week ship cadence sparkline
- Usage categories (feature / bugfix / test / refactor)
- Builder Archetype + TIER + Verified ✓ mark
- Light/dark themes

One line in your GitHub README:

```markdown
![AI Dev Card](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME&theme=dark)
```

Try it: https://devcard-ai.sakimyto.workers.dev/

---

## Reddit r/programming

**Title:** I built an "AI Dev Card" — that classic GitHub Stats Card vibe, but for AI tool usage

Remember the era of putting `anuraghazra/github-readme-stats` cards on every GitHub profile? Top Languages, Streak counter, the whole "my README is my trading card" energy. I built the AI coding version of that. Same vibe, different signal.

It analyzes your Co-Authored-By commit trailers and visualizes which AI tools you use and how.

Supports 11 tools: Claude, Codex, Copilot, Cursor, Windsurf, Aider, Cody, Amazon Q, Gemini, Devin, Sweep.

What it shows:

- Which AI tools you use and in what mix (stacked bar)
- A 12-week ship cadence sparkline (so it doesn't degrade to a stale snapshot)
- Usage categories (feature / bugfix / test / refactor)
- Builder Archetype (AI Native / Pair Programmer / Delegator / Selective User)
- TIER S–D + Verified ✓ mark (derived from commit trailers — non-fakeable)

One line in your README:

```markdown
![AI Dev Card](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME&theme=dark)
```

Built with Cloudflare Workers, GitHub GraphQL API, pure SVG. Repo: https://github.com/sakimyto/devcard-ai

Try it: https://devcard-ai.sakimyto.workers.dev/

---

## Reddit r/ChatGPT / r/ClaudeAI

**Title:** devcard-ai: an AI version of the classic GitHub Stats Card

Remember those GitHub profile READMEs full of Stats Cards a few years back? I missed that aesthetic, so I built the AI tool version.

It analyzes your GitHub commits for `Co-Authored-By` trailers and shows your AI tool usage visually.

Detects Claude, Codex, Copilot, Cursor, Windsurf, Aider, Cody, Amazon Q, Gemini, Devin, and Sweep.

Beyond a tool ratio, it shows your 12-week ship cadence, builder archetype, and a Verified ✓ mark derived from the commit trail.

Add to your GitHub README:

```markdown
![AI Dev Card](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME&theme=dark)
```

https://devcard-ai.sakimyto.workers.dev/

---

## Hacker News (Show HN)

**Title:** Show HN: AI Dev Card — the AI tool version of the classic GitHub Stats Card

A few years back, every other GitHub profile README had `anuraghazra/github-readme-stats` cards on it — grass count, top languages, a streak counter. The whole "my README is a trading card" aesthetic that quietly faded.

I built `devcard-ai` — same energy, but the metric is your AI coding tool usage instead of language stats. It parses Co-Authored-By trailers in your commit history and renders a pure-SVG card you can drop into your README.

What it surfaces:

- Tool attribution across 11 AI coding tools (Claude / Codex / Copilot / Cursor / Windsurf / Aider / Cody / Amazon Q / Gemini / Devin / Sweep)
- 12-week ship cadence sparkline + AI commits per week
- Usage categories (feature / bugfix / test / refactor) and primary languages
- Builder Archetype (AI Native / Pair Programmer / Delegator / Selective User)
- TIER S–D and a Verified ✓ mark derived from the commit trail

Stack: Cloudflare Workers + GitHub GraphQL API + pure SVG (no JS, no external fonts — renders inline in GitHub READMEs). OGP previews via @resvg/resvg-wasm.

Live: https://devcard-ai.sakimyto.workers.dev/?user=sakimyto
Repo: https://github.com/sakimyto/devcard-ai

Happy to take feedback on the rubric (archetypes, tier thresholds, tools to add).
