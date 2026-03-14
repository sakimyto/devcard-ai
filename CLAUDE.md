# devcard-ai

AI coding style trading card generator for GitHub profiles.

## Commands
- `bun test` — run tests
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
