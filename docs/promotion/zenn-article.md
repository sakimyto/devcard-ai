---
title: "GitHub の Co-Authored-By を解析して「AI活用カード」を自動生成するサービスを作った"
emoji: "🤖"
type: "tech"
topics: ["github", "ai", "cloudflare", "typescript", "svg"]
published: false
---

## はじめに

2020 年ごろ、GitHub プロフィール README に **Stats Card** を貼るのが流行ってましたよね。`anuraghazra/github-readme-stats` の、草の数・スター数・Top Languages・Streak がワッと並んだアレです。

「Top Languages: TypeScript 60% / Python 25% ...」みたいなカードを、自分のプロフィールにちょっと誇らしげに貼って、PR を眺めながら "我ながら良い分布だな" とニヤニヤしていた人も多いはず。

あの **「自分の開発ライフをカードで見せたい」** 気持ちは、AI 時代にもまだ生きてるんじゃないかと思って、AI ツール版を作りました。

その名も `devcard-ai` です。

![AI Dev Card](https://devcard-ai.sakimyto.workers.dev/?user=sakimyto&theme=dark)

```markdown
![AI Dev Card](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME&theme=dark)
```

README にこの 1 行を貼るだけで動きます。

## 何が見えるのか

カードには以下の情報が表示されます。

- **AI ツール比率** — Claude, Copilot, Cursor などのどれをどのくらい使っているか (横棒グラフ)
- **Ship Velocity** — 12 週ぶんの稼働カデンス (スパークライン) + 週あたり AI コミット数
- **用途分類** — feature / bugfix / test / refactor の割合 (ドーナツチャート)
- **使用言語** — リポジトリの主要言語
- **Builder Archetype** — AI Native / Pair Programmer / Delegator / Selective User
- **バッジ** — Multi-Tool / Parallel / TDD with AI / Shipper / Centurion
- **TIER + Verified ✓** — S〜D の総合スコアと、Co-Authored-By 痕跡由来の検証済みマーク

「ツールを並べただけ」のカードだと自己紹介で終わってしまうので、Velocity と Verified を入れることで **採用面でも一応使える** ぐらいの密度にしてあります。

## 仕組み

### 1. Co-Authored-By トレイラの解析

GitHub では AI ツールがコミットを支援すると、コミットメッセージの末尾に `Co-Authored-By` トレイラが付きます。

```
feat: add authentication

Co-Authored-By: Claude <noreply@anthropic.com>
```

これを正規表現でパースして、どのツールのコミットかを特定しています。

```typescript
if (msg.includes('@anthropic.com') || /co-authored-by:.*\bclaude\b/i.test(msg)) return 'claude'
if (msg.includes('@openai.com') || /co-authored-by:.*\bcodex\b/i.test(msg)) return 'codex'
if (/co-authored-by:.*\bcopilot\b/i.test(msg)) return 'copilot'
if (/co-authored-by:.*\bcursor\b/i.test(msg)) return 'cursor'
// ... 11 ツール対応
```

### 2. 用途分類 (Conventional Commits + メッセージ本文の解析)

コミットプレフィックス (`feat:`, `fix:`, `test:` 等) で用途を分類します。

加えて、TDD を回している人は `feat:` の中にテストファイルを含めることが多いので、メッセージ本文に test 系のパス・ファイル名・自然文 ("add tests", "regression tests" 等) が出てきたら `test` に再分類します。Go の `_test.go`、Python の `test_*.py`、JVM の `FooTest.java` 等もカバー。

```typescript
const TEST_FILE_MENTION_PATTERNS = [
  /(?:tests?|__tests__|specs?|e2e)\//i,
  /\.(test|spec)\.\w+/i,
  /_test\.(go|py|rb|rs|ts|tsx|js|jsx)\b/i,
  /\b[A-Z]\w*Test(s)?\.(java|kt|cs|swift)\b/,
  /\b(?:adds?|updates?|fixes?)\s+(?:unit\s+|integration\s+|e2e\s+)?tests?\b/i,
  // ...
]
```

### 3. Ship Velocity モジュール

採用文脈で「今もちゃんと出荷してるか」を見るためのモジュール。直近 12 週を週単位でビン分けして、AI コミット数を sparkline で描画しています。

```
SHIP VELOCITY                         since 2025-06-15
[ 11/12 active weeks ] [ 7.3 AI cmts/wk ] [ 10mo active ]
▁▁▃▂▄▂▃▅▆▄▇▅
last 12 weeks
```

- **稼働週数**: 12 週中、AI コミットがあった週数
- **週あたり AI コミット数**: 稼働週ベースの平均
- **継続期間**: 初 AI コミットからの経過

### 4. Builder Archetype 検出

AI コミットと人間コミットの **交互度 (alternation score)** を算出してパターンを分類しています。

- **AI Native** (AI 率 60% 以上) — ほぼ AI に任せている
- **Pair Programmer** (AI 率 30%以上 + 交互度高) — AI と対話しながら開発
- **Delegator** (AI 率 30% 以上 + 交互度低) — まとめて AI に投げる
- **Selective User** (AI 率 30% 未満) — ピンポイントで AI 活用

ヘッダーに大きくチップで出すので、profile 訪問者が一秒で「あ、この人 AI Native 系か」と認識できる狙い。

### 5. Verified ✓ マーク

「AI 使ってます」と書くのは誰でもできるけど、**Co-Authored-By 付きコミットを履歴に残すのは git 側に痕跡が残る** ので、自己申告とは差が出ます。少なくとも 1 つの既知 AI ツール由来の Co-Authored-By があれば Verified を付けています。

```typescript
const verified = tools.some((t) => t.toolId !== 'unknown' && t.commitCount > 0)
```

完全な耐改ざんではないですが、自己申告との間にはかなりのギャップ。

### 6. SVG 生成

HTML/CSS ではなく **純粋な SVG** でカードを描画しています。理由：

- GitHub の README で `<img>` タグとして直接表示できる
- 外部フォントや JavaScript に依存しない
- レスポンスが軽量 (数 KB)

ドーナツチャートは `stroke-dasharray` と `stroke-dashoffset` で実現しています。

### 7. OGP 対応

X や Slack で URL を貼った時にカード画像がプレビュー表示されるよう、OGP にも対応しました。

- Bot User-Agent を検出 → OGP meta タグ付き HTML を返す (HTML エスケープで XSS 対策)
- `/og` エンドポイント → `@resvg/resvg-wasm` で SVG → PNG 変換

## 技術スタック

| 項目 | 技術 |
|------|------|
| ランタイム | Cloudflare Workers |
| 言語 | TypeScript |
| API | GitHub GraphQL API |
| 認証 | GitHub App (Installation Token) |
| レンダリング | 純 SVG |
| OGP 画像 | @resvg/resvg-wasm |
| テスト | Vitest + Bun |

## 対応 AI ツール (11 種)

| ツール | 検出方法 |
|--------|----------|
| Claude | `@anthropic.com` / `claude` in Co-Authored-By |
| Codex | `@openai.com` / `codex` in Co-Authored-By |
| Copilot | `copilot` in Co-Authored-By / bot login |
| Cursor | `cursor` in Co-Authored-By |
| Windsurf | `windsurf` / `codeium` in Co-Authored-By |
| Aider | `@aider.chat` / `aider` in Co-Authored-By |
| Cody | `cody` / `sourcegraph` in Co-Authored-By |
| Amazon Q | `amazon-q` / `amazonq` in Co-Authored-By |
| Gemini | `@google.com` / `gemini` in Co-Authored-By |
| Devin | bot login (`devin-ai-integration[bot]`) |
| Sweep | bot login (`sweep-ai[bot]`) |

## 使い方

### GitHub README に貼る

```markdown
![AI Dev Card](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME)
```

### パラメータ

| パラメータ | 説明 | デフォルト |
|-----------|------|-----------|
| `user` | GitHub ユーザー名 | (必須) |
| `theme` | `light` / `dark` | `light` |
| `modules` | `toolsBar,velocity,badges,usage` のサブセット | 全部表示 |

### ダークテーマ

```markdown
![AI Dev Card](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME&theme=dark)
```

## おわりに

GitHub プロフィール README に Stats Card を貼っていたあの頃の「自分の開発ライフをカードで残したい」気持ちは、案外今も生きていると思います。違うのは、可視化の対象が **草の数 / スター総数** から **AI とどう協働しているか** に移ってきたこと。

`devcard-ai` で、その AI 時代版を気軽に楽しんでもらえたら嬉しいです。気が向いたら自分のプロフィールに 1 行貼ってみてください。

GitHub: https://github.com/sakimyto/devcard-ai

---

*この記事自体も Claude Code と Co-Authored しながら書きました。*
