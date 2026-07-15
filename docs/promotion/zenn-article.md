---
title: "GitHub の AI コーディング履歴を「トレカ」にするサービスを作った"
emoji: "🎴"
type: "tech"
topics: ["github", "ai", "cloudflare", "typescript", "svg"]
published: false
---

## はじめに

2020 年ごろ、GitHub プロフィール README に **Stats Card** を貼るのが流行ってましたよね。`anuraghazra/github-readme-stats` の、草の数・スター数・Top Languages・Streak がワッと並んだアレです。

あの「自分の開発ライフをカードで見せたい」気持ちは AI 時代にも生きているはず — と思って AI ツール版を作っていたのですが、途中で気づきました。**カードなら、いっそ本物のトレカにすべきでは？**

というわけで PullCard AI（旧 devcard-ai）v2 は「AI Builder トレーディングカード」です。

[![AI Builder Trading Card](https://pullcard.sakimyto.com/?user=sakimyto&theme=dark)](https://pullcard.sakimyto.com/#sakimyto)

```markdown
[![AI Builder Trading Card](https://pullcard.sakimyto.com/?user=YOUR_USERNAME&theme=dark)](https://pullcard.sakimyto.com/#YOUR_USERNAME)
```

README にこの 1 行を貼るだけ。https://pullcard.sakimyto.com で 60 秒で作れます。

## トレカの文法をどう実装したか

トレカを名乗るからには、トレカの文法を全部入れました。

### レアリティ枠

総合ティア（S/A/B/C/D）がそのままフレームになります。

- **S = Holo**: 虹色グラデーション枠 + シャインスイープが**アニメーションする**。GitHub README の `<img>`（camo プロキシ経由）でも動くよう、SMIL のみで実装
- **A = Gold / B = Silver / C = Bronze / D = Common**

「README の中で動くホロカード」が最大の見せ場です。script も foreignObject も使えない制約下で、`<animateTransform>` と `<animate>` だけで作っています。

### 二つ名（アーキタイプ）

内部で 4 軸（AI 依存度／作業の集中・分散／単発・継続／広さ）からビルダータイプを判定し、**16 種類の「二つ名」**に写像します。さらに図抜けたステータスには特別枠 **The Ascendant** を1つ。

- 例: The Strategist / The Architect / The Maverick / The Lone Wolf / The Summoner …
- **MBTI 的な 4 文字コードは意図的にカードに出しません**。コード（`HDSW` のような内部表現）は計算して即捨て、表に乗るのは二つ名だけ。「HDSW」より「The Strategist」の方がトレカに映えるので

初期版では `Pair Programmer` のような素の分類ラベルを出していましたが、味気ないので二つ名に差し替えました。

### ステータス（6軸レーダー）

- **VELOCITY** — コミット頻度（対数正規化）
- **DIVERSITY** — ツール種類 × 用途（feature/fix/test/refactor）の分散
- **SYNERGY** — 人間コミットと AI コミットの噛み合い
- **CONSISTENCY** — アクティブ週割合
- **RANGE** — 触れている技術・リポジトリの広さ
- **FLOW** — 連続性・リズム

6 本とも 0-100 で、**全て同じ「公開リポジトリ・直近 12 週」窓**から計算します。初期版では指標ごとに集計窓が違い「TIER A なのに 1/12 active weeks」のような矛盾が起きえたので、窓を 1 つに統一しました（GraphQL の `history(since:)` で取得段階から絞っています）。カードにも `public · 12wk` と明記します。

### ジェネラティブアート & シリアル

ユーザー名の FNV-1a ハッシュをシードに、決定論的な幾何学アートを生成します。同じユーザー名なら何度描いても同じ絵、違うユーザー名なら必ず違う絵。カード番号（`#7F3A` みたいなシリアル）も同じハッシュ由来です。

LLM は一切呼んでいません。全部決定論です。

## 検出のしくみ

`Co-Authored-By:` トレーラーだけだと Cursor 系ユーザーを取りこぼすので、3 系統で検出します。

1. **トレーラー** — `Co-Authored-By: Claude <noreply@anthropic.com>` など
2. **生成マーカー** — `Generated with [Claude Code]` などのコミット本文
3. **設定ファイル** — リポジトリに CLAUDE.md / AGENTS.md / .cursorrules / copilot-instructions.md があると「equipped」バッジ（コミット実績の%とは混ぜず、装備品として別表示）

検出テーブルは 1 モジュールに集約し、「AI コミット判定されたのにツール帰属が unknown」というドリフトが起きない構造にしています（fixture 全件に期待ツールを付けた契約テストで固定）。

## インフラ

- **Cloudflare Workers** + GitHub GraphQL API（GitHub App 認証）
- **KV の stale-if-error キャッシュ**（fresh 1h / stale 24h）— GitHub API が枯れたら stale を供給、それも無ければ「Summoning…」プレースホルダ（エラー画像は出さない）
- **OGP シェア画像**は 1200×630 横長を `@resvg/resvg-wasm` で PNG 化。Workers にはフォントが無いので **Inter のサブセット（9.5KB×2）を同梱**して fontBuffers に渡しています。これを忘れると「文字が全部消えた画像」が X に流れます（実際に v1 で起きていました）
- **Analytics Engine** で「レンダリングされた distinct ユーザー数」を計測（スター数より正直な KPI）

## ハマりどころ

1. **octokit は存在しないユーザーで `user: null` を返さない** — GraphqlResponseError（`errors[].type === 'NOT_FOUND'`）を投げます。これを正規化しないと 404 が返せず、存在しないユーザー名の連打が毎回 GitHub クォータを消費します。対策として `not_found` も 10 分だけ KV にネガティブキャッシュし、ゴミ username の連打を吸収するようにしました（OGP 経路もカード本体と同じ KV キャッシュを共有させ、`/og` だけキャッシュを素通りしてクォータを溶かす穴も塞いでいます）
2. **404 を画像に返してはいけない** — GitHub camo 経由の 4xx は README 上で壊れ画像アイコンになります。画像コンテキストには 200 + エラーカード SVG、`Accept: text/html` のブラウザ直叩きにだけ 404 を返す設計にしました
3. **`bun test` と `bun run test` は別物** — native の `bun test` は vitest.config の WASM ローダーを通らないため resvg のテストが動きません。CI が silently 素通りしていたのに気づいて修正しました

## おわりに

公開リポジトリのみが対象なので、プライベート中心の人（私も）は低めに出ます。カードには C と正直に刻まれました。悔しいので、プライベート活動の「件数だけ」をオプトインで集計する Verified+ を次に作ります。

まずは自分のカードを召喚してみてください → https://pullcard.sakimyto.com

リポジトリ: https://github.com/sakimyto/pullcard-ai （MIT）
