# PullCard AI Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename devcard-ai → PullCard AI across code, infra, and launch materials, with permanent 301 back-compat for every deployed badge URL.

**Architecture:** The worker already 301s `*.workers.dev` to the canonical host inside `fetch()`. We add `pullcard.sakimyto.com` as a second custom domain, flip the canonical, and extend the in-worker redirect so both legacy hosts (`devcard-ai.sakimyto.workers.dev`, `devcard.sakimyto.com`) 301 to it. Everything else is brand-string replacement plus asset/material regeneration.

**Tech Stack:** Cloudflare Workers (wrangler), TypeScript, Vitest (`bun run test` — native `bun test` cannot load resvg WASM), Biome.

**Spec:** `docs/superpowers/specs/2026-07-13-pullcard-ai-rename-design.md`

## Global Constraints

- Canonical URL: `https://pullcard.sakimyto.com`. Legacy hosts are never removed; `devcard.sakimyto.com` must keep 301-ing forever (badge back-compat).
- Brand strings: product name **PullCard AI** (short form PullCard), on-card credit text `PullCard AI`, hashtag `#pullcardai`, CTA "Pull your card".
- Worker `name = "devcard-ai"` in wrangler.toml **stays unchanged** (changing it deploys a new Worker and orphans routes). Same for KV binding `DEVCARD_KV` and dataset `devcard_renders` (internal names, invisible).
- Deploy account: `CLOUDFLARE_ACCOUNT_ID=da4df285476cff0b942707a93dcb1954` (zone: nandarona account).
- Known trap: deploy → wait 20s → purge KV card cache → verify (requests during propagation re-cache via the old worker).
- Test/lint gates: `bun run test`, `bun run typecheck`, `bun run lint` all green before every commit.
- Public repo: commit messages in English.

---

### Task 1: Legacy-host 301 redirect to new canonical

**Files:**
- Modify: `api/index.ts:149-155` (redirect block)
- Modify: `wrangler.toml:7-10` (routes)
- Test: `tests/api.test.ts:124-136` (existing workers.dev redirect test)

**Interfaces:**
- Produces: worker responds 301 → `https://pullcard.sakimyto.com<path><query>` for hostnames `devcard-ai.sakimyto.workers.dev` and `devcard.sakimyto.com`; serves normally on `pullcard.sakimyto.com`.

- [ ] **Step 1: Update the redirect test and add the devcard-host case (failing first)**

In `tests/api.test.ts`, replace the existing `workers.dev host → 301` test body and add a sibling:

```ts
it('workers.dev host → 301 to pullcard.sakimyto.com preserving path+query', async () => {
  const res = await worker.fetch(
    new Request('https://devcard-ai.sakimyto.workers.dev/?user=octocat&theme=dark'),
    makeEnv(),
    fakeCtx().ctx,
  )
  expect(res.status).toBe(301)
  expect(res.headers.get('location')).toBe(
    'https://pullcard.sakimyto.com/?user=octocat&theme=dark',
  )
  expect(graphqlMock).not.toHaveBeenCalled()
})

it('legacy devcard.sakimyto.com host → 301 to pullcard.sakimyto.com preserving path+query', async () => {
  const res = await worker.fetch(
    new Request('https://devcard.sakimyto.com/?user=octocat&theme=dark'),
    makeEnv(),
    fakeCtx().ctx,
  )
  expect(res.status).toBe(301)
  expect(res.headers.get('location')).toBe(
    'https://pullcard.sakimyto.com/?user=octocat&theme=dark',
  )
  expect(graphqlMock).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run tests to verify both fail**

Run: `bun run test`
Expected: the two redirect tests FAIL (location still `devcard.sakimyto.com` / no redirect for devcard host).

- [ ] **Step 3: Implement the redirect**

In `api/index.ts`, replace the block at lines 149–155:

```ts
    // 正準ドメイン（pullcard.sakimyto.com）へ 301 集約。旧 devcard.sakimyto.com と
    // workers.dev のバッジ URL は他人の README に永久に残る。camo はリダイレクト追従
    // するので 301 で全部生かす。このブロックは絶対に消さない
    const LEGACY_HOSTS = ['devcard-ai.sakimyto.workers.dev', 'devcard.sakimyto.com']
    if (LEGACY_HOSTS.includes(url.hostname)) {
      url.hostname = 'pullcard.sakimyto.com'
      return Response.redirect(url.toString(), 301)
    }
```

In `wrangler.toml`, replace the routes block (keep the devcard route so legacy requests still reach this worker to be 301'd):

```toml
# 正準ドメインは pullcard.sakimyto.com。devcard.sakimyto.com と workers.dev は
# 旧バッジ埋め込み用に残し、worker 内で 301 集約する（消すと既存バッジが死ぬ）
workers_dev = true
routes = [
  { pattern = "pullcard.sakimyto.com", custom_domain = true },
  { pattern = "devcard.sakimyto.com", custom_domain = true }
]
```

- [ ] **Step 4: Run gates**

Run: `bun run test && bun run typecheck && bun run lint`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add api/index.ts wrangler.toml tests/api.test.ts
git commit -m "feat(domain): make pullcard.sakimyto.com canonical, 301 legacy hosts

devcard.sakimyto.com badge URLs live forever in other people's READMEs;
GitHub camo follows redirects, so a permanent in-worker 301 keeps every
deployed badge rendering."
```

### Task 2: Brand string sweep (code, meta, README)

**Files:**
- Modify: `src/landing.ts` (lines 7, 9, 65, 100, 137), `src/ogp.ts:71`, `src/svg/card.ts:14`, `src/svg/v2/cardV2.ts` (476, 491, 495, 527), `src/svg/v2/ogShare.ts` (61, 74), `package.json:2`, `README.md`, `CLAUDE.md`
- Test: `tests/svg/v2/__snapshots__/` (regenerate), `tests/landing.test.ts`, `tests/ogp.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 (independent strings).
- Produces: every user-visible surface says "PullCard AI"; URLs point at `pullcard.sakimyto.com` and `github.com/sakimyto/pullcard-ai`.

- [ ] **Step 1: Replace brand strings**

Exact replacements (case-sensitive):

| File:line | Old | New |
|---|---|---|
| `src/svg/card.ts:14`, `src/svg/v2/cardV2.ts:495,527`, `src/svg/v2/ogShare.ts:61,74` | SVG text `'devcard-ai'` | `'PullCard AI'` |
| `src/svg/v2/cardV2.ts:476,491` | comments mentioning `devcard-ai` credit | update wording to `PullCard AI` credit |
| `src/ogp.ts:71` | `` `See how ${safeUser} ships with AI — devcard-ai` `` | `` `See how ${safeUser} ships with AI — PullCard AI` `` |
| `src/landing.ts:7,9` | `devcard-ai — AI Builder Trading Card` | `PullCard AI — AI Builder Trading Card` |
| `src/landing.ts:65` | `devcard-ai reads your public GitHub activity` | `PullCard AI reads your public GitHub activity` |
| `src/landing.ts:100` | `github.com/sakimyto/devcard-ai` | `github.com/sakimyto/pullcard-ai` |
| `src/landing.ts:137` | `#devcardai` | `#pullcardai` |
| `package.json:2` | `"name": "devcard-ai"` | `"name": "pullcard-ai"` |
| `README.md` | title `# devcard-ai`; all `devcard.sakimyto.com` URLs; repo URL | `# PullCard AI`; `pullcard.sakimyto.com`; `github.com/sakimyto/pullcard-ai` (keep the `bunx wrangler kv namespace create DEVCARD_KV` line as-is — internal binding) |
| `CLAUDE.md` | the one `devcard` mention | update to PullCard AI / new URLs |

The `cardV2.ts:491` right-margin constant (`- 88`) clears a 15px-font credit; `'PullCard AI'` is 11 chars vs `'devcard-ai'` 10 — after regenerating snapshots, eyeball one rendered card (Step 3) to confirm the rarity mark doesn't collide with the credit. Widen to `- 96` only if it visibly overlaps.

- [ ] **Step 2: Regenerate snapshots and run gates**

Run: `bun run test -- -u && bun run typecheck && bun run lint`
Expected: PASS; snapshot diff shows only the credit-text change (`devcard-ai` → `PullCard AI`). Inspect with `git diff tests/svg/v2/__snapshots__/`.

- [ ] **Step 3: Visual check of one card**

Run: `bunx tsx scripts/visual-preview.ts` (or `bun scripts/visual-preview.ts` if that's how the repo runs it — check the script header) and open the output PNG.
Expected: footer credit reads "PullCard AI", no overlap with the rarity mark.

- [ ] **Step 4: Leftover scan**

Run: `grep -rn -i devcard src/ api/ tests/ README.md CLAUDE.md package.json wrangler.toml | grep -v -E "DEVCARD_KV|devcard_renders|LEGACY_HOSTS|devcard-ai\.sakimyto\.workers\.dev|devcard\.sakimyto\.com"`
Expected: zero lines. (Allowed leftovers: KV binding, AE dataset, legacy hostnames in the redirect/route config.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(brand): rename devcard-ai → PullCard AI across all surfaces

Internal names (worker name, DEVCARD_KV, devcard_renders dataset) stay:
they are invisible to users and renaming them risks route/data orphaning."
```

### Task 3: GitHub repo rename + push + CI

**Files:** none (GitHub + git remote operation)

**Interfaces:**
- Produces: repo lives at `github.com/sakimyto/pullcard-ai`; old URL redirects; CI green on main.

- [ ] **Step 1: Rename the repo**

Run: `gh repo rename pullcard-ai --repo sakimyto/devcard-ai --yes`
Expected: `✓ Renamed repository sakimyto/pullcard-ai`

- [ ] **Step 2: Update the local remote**

Run: `git remote set-url origin https://github.com/sakimyto/pullcard-ai.git && git remote -v`
Expected: origin points at pullcard-ai.

- [ ] **Step 3: Also update the repo description**

Run: `gh repo edit sakimyto/pullcard-ai --description "PullCard AI — pull your AI coding style as a holographic trading card for your GitHub profile"`

- [ ] **Step 4: Push and watch CI**

Run: `git push origin main && gh run watch --repo sakimyto/pullcard-ai --exit-status`
Expected: CI success. On failure: `gh run view --log-failed`, diagnose, fix, re-push (max 3 tries per workflow rules).

### Task 4: Deploy + production verification

**Files:** none (deploy + curl verification)

**Interfaces:**
- Consumes: Tasks 1–3 merged and pushed.
- Produces: acceptance criteria 1–2 of the spec verified in production.

- [ ] **Step 1: Deploy**

Run: `CLOUDFLARE_ACCOUNT_ID=da4df285476cff0b942707a93dcb1954 bunx wrangler deploy`
Expected: deploy succeeds and lists both custom domains (`pullcard.sakimyto.com`, `devcard.sakimyto.com`). First deploy provisions the new custom domain; DNS/cert can take a minute.

- [ ] **Step 2: Wait out propagation, then purge the card cache**

Run: `sleep 20`, then find the cache key prefix (check `api/index.ts` for the KV cache key format, e.g. `grep -n 'kv' api/index.ts src/*.ts | grep -i key`) and delete the cached entries for `sakimyto`:
`bunx wrangler kv key list --binding DEVCARD_KV --remote | grep -i sakimyto` → delete each matching **cache** key (do NOT delete `gallery:u:*` keys — that's the summon gallery data) with `bunx wrangler kv key delete --binding DEVCARD_KV --remote "<key>"`.

- [ ] **Step 3: Verify acceptance criteria**

```bash
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" "https://pullcard.sakimyto.com/?user=sakimyto&theme=dark"
# expect: 200 image/svg+xml
curl -s "https://pullcard.sakimyto.com/?user=sakimyto&theme=dark" | grep -c "PullCard AI"
# expect: >= 1
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "https://devcard.sakimyto.com/?user=sakimyto&theme=dark"
# expect: 301 https://pullcard.sakimyto.com/?user=sakimyto&theme=dark
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "https://devcard-ai.sakimyto.workers.dev/?user=sakimyto"
# expect: 301 https://pullcard.sakimyto.com/?user=sakimyto
curl -s -o /dev/null -w "%{http_code}\n" -L "https://devcard.sakimyto.com/?user=sakimyto&theme=dark"
# expect: 200 (redirect target renders)
```

Expected: all as annotated. If the new domain 404s/525s, wait 60s (cert provisioning) and retry before diagnosing.

### Task 5: Regenerate launch assets

**Files:**
- Modify: `docs/promotion/launch-assets/card-sakimyto.svg`, `card-sakimyto.png`, `og-sakimyto.png`, `tiers.html`, `tier-comparison.png`

**Interfaces:**
- Consumes: Task 4 (production serves PullCard-branded output).

- [ ] **Step 1: Re-fetch the real card + OG from production**

```bash
curl -s "https://pullcard.sakimyto.com/?user=sakimyto&theme=dark" > docs/promotion/launch-assets/card-sakimyto.svg
```

Find the PNG endpoint: `api/index.ts` renders PNG via `svgToPng(svg, 1200)` around line 184 — check the route/param that triggers it (`sed -n '170,195p' api/index.ts`) and fetch `card-sakimyto.png` and `og-sakimyto.png` through it. If PNG is OG-only, convert the card SVG locally using the resvg pattern from `scripts/visual-preview-t19.ts` (initWasm with `node_modules/@resvg/resvg-wasm/index_bg.wasm`, `new Resvg(svg, ...)`, `.render().asPng()`).

- [ ] **Step 2: Update tiers.html brand strings and regenerate tier-comparison.png**

Replace `devcard`/`devcard-ai` strings in `docs/promotion/launch-assets/tiers.html` with PullCard AI equivalents. Regenerate the PNG the same way it was originally made — check `git log --follow docs/promotion/launch-assets/tier-comparison.png` for a hint; if it was a browser screenshot, flag this step back to the orchestrator to take the screenshot (browser tooling lives in the main session).

- [ ] **Step 3: Verify pixels**

Open `card-sakimyto.png` and `og-sakimyto.png`, confirm the credit reads "PullCard AI" and nothing is clipped.

- [ ] **Step 4: Commit**

```bash
git add docs/promotion/launch-assets/
git commit -m "docs(promo): regenerate launch assets with PullCard AI branding"
```

### Task 6: Promotion copy update

**Files:**
- Modify: `docs/promotion/community-posts.md`, `x-post-en.md`, `x-post.md`, `zenn-article.md`, `product-hunt.md`, `LAUNCH.md`

**Interfaces:**
- Consumes: brand decisions (Global Constraints). No code dependency.

- [ ] **Step 1: Name + URL replacement in all six files**

- `devcard-ai` / `devcard` product mentions → `PullCard AI` (first mention per document), `PullCard` (subsequent)
- `devcard.sakimyto.com` → `pullcard.sakimyto.com`
- `github.com/sakimyto/devcard-ai` → `github.com/sakimyto/pullcard-ai`
- `#devcardai` → `#pullcardai`
- LAUNCH.md Show HN title → `Show HN: PullCard – Pull your AI coding style as a holographic trading card` (short form: avoids "AI … AI" repetition; keep the existing note that "Pokémon" stays out of the title)

- [ ] **Step 2: Add the codecard.dev differentiation line**

In `community-posts.md`, in the Show HN body section (and Reddit r/ClaudeAI section), add one line:

```text
Unlike session-stats cards (e.g. codecard.dev), PullCard reads your actual GitHub commit history and detects AI usage with 3-layer evidence — committed / assisted / equipped — then renders it as a rarity-tiered holo card.
```

- [ ] **Step 3: Leftover scan on promotion docs**

Run: `grep -rn -i devcard docs/promotion/ | grep -v launch-assets`
Expected: zero lines (or only intentional "formerly devcard-ai" notes if any were added deliberately).

- [ ] **Step 4: Commit and push**

```bash
git add docs/promotion/
git commit -m "docs(promo): PullCard AI launch copy + codecard.dev differentiation"
git push origin main
```

---

## Out of scope / manual follow-ups (owner)

- GitHub App display name "devcard-ai" rename (Settings → Developer settings) — optional, non-blocking.
- `pullcard.ai` registration / `pullcard.com` purchase — optional, non-blocking.
- Profile README badge (`sakimyto/sakimyto`) — old URL keeps working via 301; update to the new URL at leisure.
- The actual launch posting (Show HN etc.) is manual per LAUNCH.md.
