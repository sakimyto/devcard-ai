# devcard-ai

AI Dev Card for your GitHub profile. Shows what AI tools you use, how you use them, and in what languages.

[![AI Dev Card](https://devcard-ai.sakimyto.workers.dev/?user=sakimyto&theme=dark)](https://devcard-ai.sakimyto.workers.dev/?user=sakimyto)

## Add to your README

Copy this into your GitHub profile README and replace `YOUR_USERNAME`:

```markdown
[![AI Dev Card](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME&theme=dark)](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME)
```

<details>
<summary>Light theme</summary>

```markdown
[![AI Dev Card](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME&theme=light)](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME)
```

</details>

## What it shows

| Section | Description |
|---------|-------------|
| **Tools** | Which AI tools you use (Claude, Copilot, Cursor, etc.) detected from `Co-Authored-By` trailers |
| **Usage** | What you use AI for — Feature, Bug Fix, Test, Refactor — from conventional commit prefixes |
| **Languages** | Your top 3 programming languages across repos |
| **Pattern** | Your collaboration style: AI Native, Pair Programmer, Delegator, or Selective User |
| **Grade** | S/A/B/C/D score based on tool diversity, AI activity, and recent commits |

> Based on latest activity across your repositories.

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `user` | GitHub username (required) | - |
| `theme` | `light` or `dark` | `light` |

## Self-hosting

1. Fork this repo
2. Create a GitHub App with `Repository contents: read` permission
3. Install the App on your account
4. Deploy to Cloudflare Workers:

```bash
bun install
cp .env.example .env  # Set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_INSTALLATION_ID
bunx wrangler deploy
```

## Development

```bash
bun install
bun test
bun run dev
```

## License

MIT
