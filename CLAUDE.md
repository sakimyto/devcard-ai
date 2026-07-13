# PullCard AI (repo: pullcard-ai)

AI coding style trading card generator for GitHub profiles. Canonical URL: https://pullcard.sakimyto.com (legacy devcard.sakimyto.com 301s here — never remove that route).

## Commands
- `bun run test` — run tests (Vitest; loads vitest.config.ts binary loader for wasm/fonts — `bun test` native can't run the resvg pixel test)
- `bun run dev` — local Vercel dev server
- `bun run typecheck` — type check
- `bun run lint` — lint with Biome

## Architecture
- `api/index.ts` — Vercel Edge Function entry
- `src/github/` — GitHub GraphQL client
- `src/analyzers/` — Data analysis (coauthor, tools, score)
- `src/svg/` — SVG card generation
- `src/handler.ts` — Request orchestration

## Rules
- Pure SVG only (no foreignObject, no satori)
- All analyzers are pure functions with typed inputs/outputs
- Tests use fixture data, never hit real GitHub API
