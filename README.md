# devcard-ai

AI coding style trading cards for your GitHub profile. Auto-generated from your public activity.

![Example Card](https://devcard-ai.sakimyto.workers.dev/api?user=sakimyto&theme=dark)

## Usage

Add this to your GitHub profile README:

```markdown
![AI Dev Card](https://devcard-ai.sakimyto.workers.dev/api?user=YOUR_USERNAME)
```

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `user` | GitHub username (required) | - |
| `modules` | Comma-separated: `tools`, `coauthor`, `score` | `tools,coauthor,score` |
| `theme` | `light` or `dark` | `light` |

## Examples

Dark theme, tools only:

```markdown
![AI Dev Card](https://devcard-ai.sakimyto.workers.dev/api?user=YOUR_USERNAME&theme=dark&modules=tools)
```

Score and co-author rate:

```markdown
![AI Dev Card](https://devcard-ai.sakimyto.workers.dev/api?user=YOUR_USERNAME&modules=score,coauthor)
```

## What it detects

- **Tools**: Claude Code (CLAUDE.md), Cursor (.cursorrules), GitHub Copilot (.github/copilot), AGENTS.md
- **AI Co-Authored**: Commits with `Co-Authored-By` trailers from known AI tools, `[AI]` tags, known AI bot authors
- **AI Readiness Score**: S/A/B/C/D grade based on AI config presence, tool diversity, and commit activity

> Note: Only publicly detectable AI activity is shown. Detection coverage varies by tool.

## Self-hosting

1. Fork this repo
2. Create a GitHub App with `Repository contents: read` permission
3. Install the App on your own account to get an Installation ID
4. Deploy to Vercel with environment variables from `.env.example`:
   - `GITHUB_APP_ID`
   - `GITHUB_APP_PRIVATE_KEY`
   - `GITHUB_APP_INSTALLATION_ID`

## Development

```bash
bun install
bun test
bun run dev
```

## License

MIT
