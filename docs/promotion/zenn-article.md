---
title: "GitHub の Co-Authored-By を解析して「AI活用カード」を自動生成するサービスを作った"
emoji: "🤖"
type: "tech"
topics: ["github", "ai", "cloudflare", "typescript", "svg"]
published: false
---

## はじめに

GitHub Stats Card を覚えていますか？ README に貼るだけで草の数やスター数が表示されるアレです。

あのノリで **「自分がどのAIツールをどう活用しているか」** を可視化するカードを作りました。

![AI Dev Card](https://devcard-ai.sakimyto.workers.dev/?user=sakimyto)

```markdown
![AI Dev Card](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME)
```

README にこの1行を貼るだけで動きます。

## 何が見えるのか

カードには以下の情報が表示されます：

- **AIツール比率** — Claude, Copilot, Cursor などのどれをどのくらい使っているか（横棒グラフ）
- **用途分類** — feature / bugfix / test / refactor の割合（ドーナツチャート）
- **使用言語** — リポジトリの主要言語（トップ3）
- **コラボパターン** — AI Native / Pair Programmer / Delegator / Selective User
- **グレード** — S〜D の総合スコア

## 仕組み

### 1. Co-Authored-By トレイラーの解析

GitHub では AI ツールがコミットを支援すると、コミットメッセージの末尾に `Co-Authored-By` トレイラーが付きます。

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
// ... 11ツール対応
```

### 2. 用途分類（Conventional Commits + ファイルパス解析）

コミットプレフィックス（`feat:`, `fix:`, `test:` 等）で用途を分類します。

ただし TDD を実践している開発者は `feat:` コミットにテストファイルを含めることが多い。そこで GitHub REST API でコミットのファイル一覧を取得し、テストファイル（`tests/`, `*.test.ts` 等）を含むコミットは `test` に再分類しています。

```typescript
const TEST_FILE_PATTERN = /(?:^|\/)(?:tests?|__tests__|spec)\/|\.(?:test|spec)\.[^/]+$/i
```

### 3. コラボレーションパターン検出

AI コミットと人間コミットの **交互度** を算出し、パターンを分類しています。

- **AI Native** (AI率 60%以上) — ほぼAIに任せている
- **Pair Programmer** (AI率 30%以上 + 交互度高) — AIと対話しながら開発
- **Delegator** (AI率 30%以上 + 交互度低) — まとめてAIに投げる
- **Selective User** (AI率 30%未満) — ピンポイントでAI活用

### 4. SVG 生成

HTML/CSS ではなく **純粋な SVG** でカードを描画しています。理由：

- GitHub の README で `<img>` タグとして直接表示できる
- 外部フォントや JavaScript に依存しない
- レスポンスが軽量（数KB）

ドーナツチャートは `stroke-dasharray` と `stroke-dashoffset` で実現しています。

### 5. OGP 対応

X や Slack で URL を貼った時にカード画像がプレビュー表示されるよう、OGP にも対応しました。

- Bot User-Agent を検出 → OGP meta タグ付き HTML を返す
- `/og` エンドポイント → `@resvg/resvg-wasm` で SVG → PNG 変換

## 技術スタック

| 項目 | 技術 |
|------|------|
| ランタイム | Cloudflare Workers |
| 言語 | TypeScript |
| API | GitHub GraphQL API + REST API |
| 認証 | GitHub App (Installation Token) |
| レンダリング | 純 SVG |
| OGP画像 | @resvg/resvg-wasm |
| テスト | Vitest + Bun |

## 対応AIツール（11種）

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
| `modules` | `toolsBar,usage` | 両方表示 |

### ダークテーマ

```markdown
![AI Dev Card](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME&theme=dark)
```

## おわりに

「AIをどう使っているか」は今後のエンジニアのスキルセットとして重要になっていくと思います。このカードが自分のAI活用スタイルを振り返るきっかけになれば嬉しいです。

GitHub: https://github.com/sakimyto/devcard-ai

---

*この記事自体も Claude と Co-Authored しながら書きました。*
