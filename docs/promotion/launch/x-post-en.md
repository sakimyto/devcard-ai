# X Post (English) — Launch

## A. Short hook (recruiting framing)

"I build with AI" is the new "I know JavaScript."

So I built `devcard-ai` — an **AI Builder Passport** for your GitHub profile.
It reads your Co-Authored-By commit trailers and surfaces:

- Ship Velocity (12-week cadence + AI commits/week)
- Tool fluency (Claude/Codex/Cursor/Copilot/...)
- ✓ Verified (derived from commit trail — non-fakeable)
- TIER + Archetype (AI Native / Pair Programmer / Delegator / Selective)

`![AI Builder Passport](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME&theme=dark)`

https://devcard-ai.sakimyto.workers.dev/

---

## B. Long thread

**1/**
Self-declared "AI-native engineer" no longer means much.
What does mean something: a verifiable trail of shipping with AI.

I built `devcard-ai` — an **AI Builder Passport** for GitHub profiles, derived
straight from Co-Authored-By commit trailers.
https://devcard-ai.sakimyto.workers.dev/?user=sakimyto

**2/**
What recruiters at AI-native teams actually want to see:

- **Ship Velocity** — 12-week cadence + AI commits/week. Are they still shipping?
- **Tool breadth** — Multi-Tool Orchestrator / Parallel use of Claude+Codex+Cursor
- **Builder Archetype** — AI Native vs Pair Programmer vs Delegator vs Selective
- **TIER S–D** — composite signal across tool breadth, AI rate, recency

**3/**
The **✓ Verified** mark is the killer feature.
It's not self-declared — it's derived from Co-Authored-By trailers in
your commit history. Faking it requires forging your own commit trail,
which leaves obvious GitHub-side artifacts.

**4/**
Supports 11 tools today: Claude, Codex, Copilot, Cursor, Windsurf, Aider,
Cody, Amazon Q, Gemini, Devin, Sweep.

One line in your README:
```
![AI Builder Passport](https://devcard-ai.sakimyto.workers.dev/?user=USER&theme=dark)
```

**5/**
Stack: Cloudflare Workers + GitHub GraphQL + pure SVG (no JS, no external
fonts — renders inline in GitHub READMEs). OGP previews for Twitter/Slack/
Discord via @resvg/resvg-wasm SVG→PNG.

GitHub: https://github.com/sakimyto/devcard-ai
