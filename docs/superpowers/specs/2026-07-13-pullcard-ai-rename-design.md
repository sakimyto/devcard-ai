# PullCard AI — Rename Design (devcard-ai → pullcard-ai)

Date: 2026-07-13
Status: Approved direction, pre-implementation

## Why rename

- "DevCard" is an established daily.dev product with the identical placement (a card
  embedded in your GitHub profile README), plus devcard.link and other same-name projects.
  Launching on HN/Reddit as "devcard-ai" invites "how is this different from daily.dev's
  DevCard?" as the first impression and forfeits all search traffic for the name.
- Renaming is cheap only before launch. The launch posts (Show HN, Reddit, X, Zenn,
  Product Hunt) are ready but not yet published, so this is the last cheap moment.
- A 3-round collision sweep (GitHub repos / npm / existing products / .com·.dev·.ai
  domains, 19 candidates) eliminated gitdex, gitcard, codecard, holocard, buildercard,
  trainercard and others as taken or trademark-adjacent. "pullcard" and "pullcardai"
  came back fully clean: no GitHub hits, npm free, no established product, pullcard.ai
  and pullcardai.com unregistered.

## Brand decisions

| Item | Decision |
|---|---|
| Product name | **PullCard AI** (short form: PullCard) |
| Meaning | "pull" = git pull × pulling a card from a booster pack |
| Repo | `sakimyto/pullcard-ai` (rename in place; GitHub auto-redirects) |
| Canonical URL | `pullcard.sakimyto.com` |
| CTA | "Pull your card" |
| HN title | `Show HN: PullCard – Pull your AI coding style as a holographic trading card` (short form to avoid "AI … AI" repetition in the title; body uses PullCard AI) |
| npm | Not published (service, not a package). Name is free if ever needed. |

## Scope

### 1. Infra (backward compatibility is the hard requirement)

- Rename GitHub repo `devcard-ai` → `pullcard-ai`. GitHub redirects old repo URLs.
- Add worker route `pullcard.sakimyto.com/*`; make it canonical in all copy and metadata.
- **Keep `devcard.sakimyto.com` alive as a 301** to the new host, preserving path and
  query. Existing profile READMEs embed the old badge URL; GitHub's camo image proxy
  follows redirects, so 301 keeps every deployed badge rendering. Never remove this route.
- `*.workers.dev` already 301s to the canonical host — repoint its target.
- KV namespace, D1-less setup, and Analytics Engine dataset keep their internal names
  (no data migration).

### 2. Code and rendered surfaces

- Replace brand strings: LP title/OG meta, card SVG branding, `package.json` name,
  README. The wrangler `name` (Worker name) stays unchanged: changing it deploys a
  brand-new Worker and orphans the existing routes, and the name is invisible to users.
- Regenerate `docs/promotion/launch-assets/` PNGs (card, OG, tier comparison) since the
  old name is baked into the pixels.

### 3. Promotion materials (`docs/promotion/`)

- Replace name + canonical URL across community-posts.md, x-post-en.md, x-post.md,
  zenn-article.md, product-hunt.md, LAUNCH.md.
- Add one differentiation line vs codecard.dev (discovered during the sweep; it renders
  AI coding *session stats* as a card): PullCard AI detects AI usage from your actual
  GitHub commit history with 3-layer evidence (committed / assisted / equipped) and
  renders rarity-tiered holo cards — not self-reported session stats.

### 4. Manual tasks (owner)

- Rename the GitHub App display name "devcard-ai" (Settings → Developer settings).
  Optional, not launch-blocking.
- Optionally register `pullcard.ai` / buy `pullcard.com` (HugeDomains listing). Not
  launch-blocking; canonical stays on sakimyto.com either way.

## Non-goals

- No feature changes, no scoring/detection changes, no npm publish.
- Old domain is never decommissioned.

## Acceptance criteria

1. `https://pullcard.sakimyto.com/?user=sakimyto&theme=dark` returns the SVG card with
   PullCard branding.
2. `https://devcard.sakimyto.com/?user=sakimyto&theme=dark` returns 301 to the same
   path/query on the new host, and the redirect target renders (badge back-compat).
3. Repo renamed; `git remote` updated; CI green on main.
4. `grep -ri devcard` over src/ and docs/promotion/ returns only intentional legacy
   references (the 301 route and rename notes).
5. Launch assets PNGs regenerated with the new name.

## Risks

- **Badge breakage** is the only irreversible harm → mitigated by the permanent 301
  route and acceptance criterion 2.
- Cloudflare route propagation: deploy → wait 20s → purge KV → verify (known trap:
  requests during propagation can re-cache via the old worker).
- Camo caches aggressively; old badges may show stale name for a while. Cosmetic only.
