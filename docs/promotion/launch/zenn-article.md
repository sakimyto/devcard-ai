---
title: "「AIで開発できます」を検証可能にする — devcard-ai を AI Builder Passport にリポジショニングした話"
emoji: "🪪"
type: "tech"
topics: ["github", "ai", "cloudflare", "typescript", "claudecode"]
published: false
---

## TL;DR

GitHub プロフィールに貼るだけで「**この人は本当に AI で出荷しているか**」を一目で示せるカード `devcard-ai` を作って、本日 **AI Builder Passport** としてリポジショニング & デプロイしました。

![AI Builder Passport](https://devcard-ai.sakimyto.workers.dev/?user=sakimyto&theme=dark)

```markdown
![AI Builder Passport](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME&theme=dark)
```

- 本番: https://devcard-ai.sakimyto.workers.dev/
- リポジトリ: https://github.com/sakimyto/devcard-ai

## なぜ作り直したか

元々は GitHub Stats Card の "AI 活用版" として作っていました(`AI Dev Card`)。ツール内訳と Usage カテゴリを表示するだけのおしゃれな統計カードです。

でも世の中は2026年になって、**「AI で開発できます」と書く候補者が当たり前になりすぎ**、書類だけでは差が見えなくなってきた。

採用側が本当に欲しい signal は次のようなもの:

1. **Ship Velocity** — 直近で実際に出荷してるか? 週次カデンスは?
2. **Tool nativeness** — Claude Code / Cursor 系を日常的に使っているか?
3. **仕組み化** — 並列で AI を回せているか?
4. **連続性** — 一発屋ではなく継続的に shipping しているか?
5. **Verifiability** — 自己申告ではなく commit 痕跡で検証できるか?

統計カードからの差分はそのまま **クレデンシャル / バッジ製品としてのリポジショニング** に直結する。そこで `AI Dev Card` から `AI Builder Passport` に変えました。

## 何が変わったか

### Before / After

| 要素 | 旧 (AI Dev Card) | 新 (AI Builder Passport) |
|------|------------------|--------------------------|
| 主軸 | ツール統計の可視化 | 採用クレデンシャル |
| ヘッダー | username + grade | username + Archetype + ✓ Verified + TIER |
| 中央ブロック | TOOLS バー + Usage ドーナツ | TOOLS + **Ship Velocity** + Badges + Usage |
| Velocity | なし | **12 週スパークライン** + 稼働週数 + 週あたりコミット |
| 信頼度 | 自己宣言相当 | **Verified** (Co-Authored-By 痕跡由来) |
| バッジ | Multi-Tool / Centurion / TDD / Streak | + **Parallel Orchestrator** / **Shipper** |

### 新モジュール: SHIP VELOCITY

```
SHIP VELOCITY                       since 2025-06-15
[ 11/12 active weeks ] [ 7.3 AI cmts/wk ] [ 10mo active ]
▁▁▃▂▄▂▃▅▆▄▇▅
last 12 weeks
```

- **稼働週数**: 直近 12 週のうち AI コミットがあった週数
- **週あたり AI コミット数**: 平均ではなく稼働週ベース
- **継続期間**: 初 AI コミットからの経過

これが「今も走ってるか / Pieter Levels 型の出荷力」を1秒で示すパート。

### Verified マーク

`Co-Authored-By: Claude <noreply@anthropic.com>` 等のトレイラがコミット履歴に存在することを根拠に発行。

```typescript
const verified = tools.some((t) => t.toolId !== 'unknown' && t.commitCount > 0)
```

「使ってます」と言うのは誰でもできるが、**git history を後から偽造するのは GitHub 側に痕跡が残る** のでハードルが上がる。完全な耐改ざんではないが、自己申告との間には大きなギャップ。

### Tier + Archetype

- **TIER**: S/A/B/C/D (ツール幅 × AI コミット率 × 最近の活動の合成)
- **Archetype**: AI Native (60%+) / Pair Programmer (30%+ かつ交互度高) / Delegator (30%+ かつまとめ投げ) / Selective User

これで採用側は **「AI Native の TIER S だけ書類選考通す」** 等の filter ができる。

## 実装ハイライト

### 1. 純 SVG にこだわる

`<img>` で GitHub README に直接表示できるよう、HTML/CSS/JS は一切使わず **pure SVG** で生成。

`resvg-wasm` で SVG → PNG 変換も用意して、Twitter / Slack / Discord での OGP プレビューにも対応。

### 2. Edge runtime での hot path 効率

- velocity 計算は AI コミット配列を1パス、O(N)
- 12週スパークラインは fixed-width array
- streak 計算は Set で重複日除去 → O(N + K log K) where K ≤ N

### 3. 時刻注入で deterministic test

```typescript
analyzeVelocity(aiCommits, now: Date = new Date()): VelocityAnalysis
```

`now` を引数化することで、`Date.now()` に依存しない再現可能テストを実現。`new Date('2026-04-22T00:00:00Z')` を固定して境界値テスト (6日 / 7日 / 84日) を書ける。

### 4. Streak は **現在進行形のみ** カウント

採用シグナルとして「2024年に5日連続コミットしたが今は何もしていない」を `5d streak` と表示するのは misleading。最新 AI コミットが今日/昨日でない場合は `0` にフォールバック。

```typescript
const daysSinceMostRecent = (today - sorted[0]) / DAY_MS
if (daysSinceMostRecent > 1) return 0
```

### 5. XSS 対策

OGP HTML では `user` クエリ入力を **escapeHtml で全 interpolation 境界で escape**。

```typescript
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
```

GitHub login は `[A-Za-z0-9-]` だが、入力境界で信頼しない。

## 開発プロセスメモ

t_wada 式 TDD (Red → Green → Refactor) でゴリゴリ。
ポスト開発パイプラインは:

```
simplify → code-review-and-quality → /cso --diff →
テスト品質スイープ → simplify → codex review
```

最後の codex review (gpt-5.4) で 「streak が古い活動を current として表示してしまう」バグを発見、即修正してから push。pipeline の二重三重チェックは費用対効果が高い。

## 使い方

### 基本

```markdown
![AI Builder Passport](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME)
```

### ダークテーマ

```markdown
![AI Builder Passport](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME&theme=dark)
```

### モジュール選択

```markdown
![](https://devcard-ai.sakimyto.workers.dev/?user=USER&modules=toolsBar,velocity,badges,usage)
```

## 対応 AI ツール

Claude / Codex / Copilot / Cursor / Windsurf / Aider / Cody / Amazon Q / Gemini / Devin / Sweep

## おわりに

「AIで開発できます」が単なる言葉だった時代は終わって、これから **検証可能なクレデンシャル** が要る時代になります。devcard-ai はその第一歩。

リポジトリ: https://github.com/sakimyto/devcard-ai

PR・Issue・採用ツール側からの API 連携要望、ぜひお寄せください。

---

*この記事は Claude Opus 4.7 (1M context) と Co-Authored で書きました。*
