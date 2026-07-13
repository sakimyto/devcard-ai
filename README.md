# PullCard AI

Your AI coding style, as a trading card. Rarity frame, archetype, stats — generated from your public GitHub activity and embedded with one line of markdown.

[![AI Builder Trading Card](https://pullcard.sakimyto.com/?user=sakimyto&theme=dark)](https://pullcard.sakimyto.com/#sakimyto)

## Add to your README

Copy this into your GitHub profile README and replace `YOUR_USERNAME`:

```markdown
[![AI Builder Trading Card](https://pullcard.sakimyto.com/?user=YOUR_USERNAME&theme=dark)](https://pullcard.sakimyto.com/#YOUR_USERNAME)
```

<details>
<summary>Light theme</summary>

```markdown
[![AI Builder Trading Card](https://pullcard.sakimyto.com/?user=YOUR_USERNAME&theme=light)](https://pullcard.sakimyto.com/#YOUR_USERNAME)
```

</details>

Or visit the [card builder](https://pullcard.sakimyto.com/) — summon, copy, paste. Done in 60 seconds.

## The card

| Element | Description |
|---------|-------------|
| **Rarity frame** | Your tier decides the frame: S = animated holo, A = gold, B = silver, C = bronze, D = common |
| **Archetype** | Your collaboration class: AI Native, Pair Programmer, Delegator, or Selective User |
| **Generative art** | A geometric artwork seeded by your username — unique to you, reproducible forever |
| **Stats** | VELOCITY (commit cadence), DIVERSITY (tools × usage spread), CONSISTENCY (active weeks) — each 0-100 |
| **Loadout** | AI tools detected from commit evidence (`Co-Authored-By`, generator markers, bots), plus `equipped` badges from config files like `CLAUDE.md` / `.cursorrules` |
| **Serial** | Card number derived from your username hash |

> All stats come from **public repositories, last 12 weeks** (`public · 12wk` on the card). Every metric shares the same window, so the card never contradicts itself.

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `user` | GitHub username (required) | - |
| `theme` | `light` or `dark` | `light` |

## Self-hosting

1. Fork this repo
2. Create a GitHub App with `Repository contents: read` permission
3. Install the App on your account
4. Create the KV namespace and update `wrangler.toml` with its id: `bunx wrangler kv namespace create DEVCARD_KV`
5. Deploy to Cloudflare Workers:

```bash
bun install
cp .env.example .env  # Set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_INSTALLATION_ID
bunx wrangler deploy
```

## Development

```bash
bun install
bun run test
bun run dev
```

## License

MIT
