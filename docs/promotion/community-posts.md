# Community Posts

## Claude Community (Discord / Forum)

**Title:** I built a GitHub card that visualizes your AI coding tools usage

I made a service called **devcard-ai** that analyzes `Co-Authored-By` trailers in your commits and generates a visual card showing which AI tools you use and how.

It detects 11 tools including Claude, Codex, Copilot, Cursor, Windsurf, Aider, Cody, Amazon Q, Gemini, Devin, and Sweep.

The card shows:
- Tool attribution ratio (stacked bar)
- Usage breakdown: feature / bugfix / test / refactor (donut chart)
- Achievement badges (Multi-Tool Master, TDD with AI, Streak, Centurion)
- Collaboration pattern (AI Native, Pair Programmer, Delegator, Selective User)

Add it to your GitHub profile README with one line:

```markdown
![AI Dev Card](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME)
```

Built with Cloudflare Workers + GitHub GraphQL API. The card is pure SVG so it renders directly in GitHub READMEs.

Try it: https://devcard-ai.sakimyto.workers.dev/

---

## Cursor Community (Forum)

**Title:** devcard-ai — Visualize your AI coding tools on GitHub

Made a service that reads `Co-Authored-By` commit trailers to show which AI tools you use. Cursor is fully supported alongside Claude, Copilot, Codex, and 7 others.

One-line setup for your GitHub README:

```markdown
![AI Dev Card](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME)
```

Features:
- Detects Cursor via `Co-Authored-By: Cursor` in commit messages
- Shows tool ratio, usage categories, badges, and collaboration pattern
- Light/dark theme support

Try it: https://devcard-ai.sakimyto.workers.dev/

---

## Reddit r/programming

**Title:** I built an "AI Dev Card" — like GitHub Stats Card but for AI tool usage

Remember the GitHub Stats Card that shows your contribution stats? I made an AI version that analyzes your Co-Authored-By commit trailers and visualizes which AI tools you use.

Supports 11 tools: Claude, Codex, Copilot, Cursor, Windsurf, Aider, Cody, Amazon Q, Gemini, Devin, Sweep.

What it shows:
- Which AI tools you use and in what ratio
- What you use AI for (features, bugfixes, tests, refactoring)
- Achievement badges (Multi-Tool, TDD with AI, Streak, etc.)
- Your collaboration pattern with AI

One line in your README:
```markdown
![AI Dev Card](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME)
```

Built with Cloudflare Workers, GitHub GraphQL API, pure SVG rendering.

Try it: https://devcard-ai.sakimyto.workers.dev/

---

## Reddit r/ChatGPT / r/ClaudeAI

**Title:** devcard-ai: See which AI coding tools you actually use (from your Git history)

Built a card generator that analyzes your GitHub commits for `Co-Authored-By` trailers and shows your AI tool usage visually.

It detects Claude, Codex, Copilot, Cursor, Windsurf, Aider, Cody, Amazon Q, Gemini, Devin, and Sweep.

Add to your GitHub README:
```markdown
![AI Dev Card](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME)
```

https://devcard-ai.sakimyto.workers.dev/
