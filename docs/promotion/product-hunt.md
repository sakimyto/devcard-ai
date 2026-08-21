# Product Hunt キット（Reddit/X の初動を見てから投下・16:01 JST 開始）

## 基本情報

- **Name:** PullCard AI
- **Tagline（60字以内）:** Your GitHub, as a trading card in your editor's theme
- **代替 tagline 案:** Turn your AI coding style into a collectible card
- **Topics:** Developer Tools, GitHub, Artificial Intelligence, Design Tools
- **First comment（メーカーコメント）:** 下記
- **URL:** https://pullcard.sakimyto.com

## Description（PH 説明・260字前後）

PullCard AI reads your GitHub activity and mints a Pokémon-style trading card of how you build with AI — a 6-axis radar, POWER, an element and epithet, and condition-triggered traits written on the card automatically. You pick the finish: 13 editor themes (Dracula, Nord, Tokyo Night, Catppuccin, Monokai, Solarized, Matrix…) × 4 glows, including a holo border that animates right inside your README. Detects 33 AI tools across commit evidence, and opts into private-repo stats via the GitHub App (counts only, never code). One line of markdown. No signup.

## First comment（メーカー投稿）

Hey PH 👋 Maker here.

Remember when every GitHub profile had a stats card — grass count, top languages, that streak counter? I missed that "my README is a trading card" era, so I built the AI-coding version and took the trading-card part literally.

Drop in a username and you get a card: a 6-axis radar from a single 12-week window so it never contradicts itself, POWER that goes gold past 9000, plus an element, an epithet (The Strategist, The Lone Wolf…), and traits that trigger from your real data — "Centurion — 215 AI-assisted commits in 12 weeks" appears on its own.

Early versions assigned you a rarity tier and gave the holo border to S only. It photographed well and felt bad to embed — a card on your own profile shouldn't quietly tell visitors you rank below someone else. So the rank is gone and the finish is yours: 13 themes lifted from the editor palettes people actually work in (Dracula, Nord, Gruvbox, Tokyo Night, Catppuccin, One Dark, Monokai, Solarized, Synthwave, Matrix, light, dark) × 4 glows, holo included, animating right inside GitHub's image proxy.

It detects 33 AI tools across three evidence tiers — including reviewer-style usage that leaves no commit trailer (my own card reads "Codex x27"). Install the GitHub App with All repositories and private activity counts in — numbers only, never code, never repo names — and the card labels itself `verified+`.

All pure SVG, deterministic, no LLM calls, 494 tests. The gallery on the homepage fills with the cards of people who installed the App — opt-in by construction, since only you can install it on your own account.

Would love your take on the rubric — the trait pool, radar weighting, themes and tools I've missed.

## ギャラリー画像（4-5枚）

1. **theme-grid.png** — 主要テーマの横並び（Dracula / Nord / Tokyo Night / Matrix…。「自分の配色がある」が一目で伝わる主力）
2. **card-sakimyto.png** — 実カード1枚（全要素が見える縦カード）✅ 作成済み
3. **og-sakimyto.png** — 横長サマリー ✅ 作成済み
4. **（要作成）gallery-screenshot.png** — LP の召喚ギャラリーが埋まった状態（Reddit/X で流入後に撮る = social proof が最大化する。PH 投下前に更新）
5. **（任意）holo.gif** — ホロ仕上げのアニメ録画

## 投下タイミングの判断

- Reddit/X で **distinct 召喚ユーザーが 30-50 人**を超え、ギャラリーが埋まってから投下（ギャラリー画面が最強の social proof になる）
- 16:01 JST（PH の日付切替）直後に投下、日本の夕方〜夜で初動テコ入れしやすい
- ハンター不要（セルフ投稿可）。既存フォロワーが薄いので、Reddit/X/HN で作った初動を PH に流し込む設計
