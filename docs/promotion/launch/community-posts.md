# Community Posts — Launch

## Hacker News (Show HN)

**Title:** Show HN: AI Builder Passport — verifiable AI-coding credential for GitHub profiles

**Body:**

I built `devcard-ai`, a service that derives an "AI Builder Passport" from your GitHub commit history (Co-Authored-By trailers) and renders it as a pure-SVG card you can drop into your README.

What it surfaces:

- **Ship Velocity** — weeks active, AI commits/week, 12-week cadence sparkline
- **Tool fluency** — which AI coding tools you use and in what mix (Claude / Codex / Copilot / Cursor / Windsurf / Aider / Cody / Amazon Q / Gemini / Devin / Sweep)
- **Builder Archetype** — AI Native vs Pair Programmer vs Delegator vs Selective User
- **TIER S–D** — composite signal across tool breadth, AI commit rate, and recency
- **✓ Verified** — derived from Co-Authored-By trailers, not self-declared

The motivation: as "AI-native engineer" becomes a hollow self-claim in 2026, AI-native teams need verifiable signal at hiring time. The card is meant to read as a credential, not a vanity sticker.

Stack: Cloudflare Workers + GitHub GraphQL API + pure SVG (no JS, no external fonts — renders inline in GitHub READMEs). OGP previews for Twitter/Slack/Discord via @resvg/resvg-wasm.

Try it: https://devcard-ai.sakimyto.workers.dev/?user=sakimyto
Repo: https://github.com/sakimyto/devcard-ai

Happy to take feedback on the rubric (e.g., what other archetypes / tiers belong, what hiring signals are missing).

---

## Reddit r/programming

**Title:** I built an "AI Builder Passport" — verifiable AI-coding credential for GitHub profiles

`devcard-ai` reads your Co-Authored-By commit trailers and renders an SVG card showing:

- Ship velocity (12-week cadence sparkline + AI commits/week)
- Tool attribution across 11 AI coding tools
- Builder archetype (AI Native / Pair Programmer / Delegator / Selective User)
- TIER S–D + ✓ Verified mark (derived from commit trail, not self-declared)

The framing is intentionally hiring-oriented: as "I build with AI" becomes a hollow self-claim, AI-native teams need verifiable signal. One line in your README:

```markdown
![AI Builder Passport](https://devcard-ai.sakimyto.workers.dev/?user=USER&theme=dark)
```

Built with Cloudflare Workers + GitHub GraphQL + pure SVG. Repo: https://github.com/sakimyto/devcard-ai

---

## Reddit r/ClaudeAI

**Title:** AI Builder Passport: a card that proves you actually ship with AI

I made an OSS card that pulls from your GitHub commit history (specifically the `Co-Authored-By: Claude` / Cursor / Codex / etc. trailers) and shows your AI build pattern as a hiring credential.

It detects 11 tools and shows:
- 12-week ship cadence (sparkline)
- Active weeks / AI commits per week
- Builder archetype (AI Native, Pair Programmer, etc.)
- TIER S–D + Verified mark

For Claude Code users specifically: every commit you ship with the default `Co-Authored-By: Claude` trailer counts toward your Velocity and contributes to the Verified mark. Try it on your profile:

```markdown
![AI Builder Passport](https://devcard-ai.sakimyto.workers.dev/?user=USER&theme=dark)
```

Live: https://devcard-ai.sakimyto.workers.dev/
Repo: https://github.com/sakimyto/devcard-ai

---

## Reddit r/cscareerquestions (recruiting angle)

**Title:** A verifiable "AI builder" credential for your GitHub profile (free, OSS)

If you've been getting pushback on "but can you actually build with AI" in interviews, here's an artifact that does the talking for you. devcard-ai pulls from your commit history (Co-Authored-By trailers) and renders a card showing:

- Your ship velocity (12-week cadence — not a one-off snapshot)
- Which AI coding tools you actually use, with proportions
- Your "builder archetype" (AI Native / Pair Programmer / Delegator / Selective)
- A TIER + Verified mark

It reads as a credential rather than a stat dump, which is the point — recruiters can use it as one signal among many. Free, open source.

```markdown
![AI Builder Passport](https://devcard-ai.sakimyto.workers.dev/?user=USER&theme=dark)
```

https://devcard-ai.sakimyto.workers.dev/

---

## Cursor Community Forum

**Title:** AI Builder Passport — show your Cursor usage on your GitHub profile

`devcard-ai` parses Co-Authored-By commit trailers and renders a credential card. Cursor commits (`Co-Authored-By: Cursor`) are detected alongside Claude / Codex / Copilot and 7 others. The card surfaces:

- Tool mix (e.g., Cursor 60% / Claude 40%)
- Ship velocity (12-week sparkline)
- Builder archetype + TIER

One line in your GitHub README:

```markdown
![AI Builder Passport](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME&theme=dark)
```

Live: https://devcard-ai.sakimyto.workers.dev/
Repo: https://github.com/sakimyto/devcard-ai

---

## DEV.to article snippet (intro)

> Self-declared "AI-native engineer" doesn't mean much in 2026. What does mean something is a verifiable trail of shipping with AI.
>
> I built `devcard-ai` — an AI Builder Passport that derives a hiring-grade credential straight from your GitHub commit history (Co-Authored-By trailers). It reads as a passport, not a stat dump.

[full Zenn article in Japanese: ../zenn-article-launch.md]
