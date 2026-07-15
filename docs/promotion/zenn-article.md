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

というわけで作った PullCard AI は「AI Builder トレーディングカード」です。

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

「README の中で動くホロカード」が最大の見せ場です。script も foreignObject も使えない（camo プロキシ下の `<img>`）制約なので、アニメーションは `<animateTransform>` と `<animate>` だけ（SMIL）で回し、foil のザラついた質感は SVG フィルタ（feTurbulence）で作っています。

### 二つ名（アーキタイプ）

内部で 4 つのステータス（SYNERGY / FLOW / CONSISTENCY / RANGE）を閾値で二値化し、`A/H`・`F/D`・`S/R`・`W/N` の 4 文字コードを組みます。この 16 通りを **16 種類の「二つ名」** に写像し、SYNERGY と VELOCITY が図抜けたときだけ 17 番目の特別枠 **The Ascendant** を出します。

- 例: The Strategist / The Architect / The Maverick / The Lone Wolf / The Summoner …
- **MBTI 的な 4 文字コードは意図的にカードに出しません**。コード（`HDSW` のような内部表現）は計算して即捨て、表に乗るのは二つ名だけ。「HDSW」より「The Strategist」の方がトレカに映えるので

初期版では `Pair Programmer` のような素の分類ラベルを出していましたが、味気ないので二つ名に差し替えました。

### ステータス（6軸レーダー）

- **VELOCITY** — コミット頻度（週平均を対数正規化）
- **DIVERSITY** — ツール種類 × 用途（feature/fix/test/refactor）のエントロピー
- **SYNERGY** — ウィンドウ内コミットに占める AI コミットの比率
- **CONSISTENCY** — アクティブ週の割合
- **RANGE** — 触れている言語数 × 活動リポ数の広さ
- **FLOW** — 人間コミットと AI コミットの交互性（ペアプロ的なリズム）

6 本とも 0-100 で、**全て同じ「公開リポジトリ・直近 12 週」窓**から計算します。初期版では指標ごとに集計窓が違い「TIER A なのに 1/12 active weeks」のような矛盾が起きえたので、窓を 1 つに統一しました（GraphQL の `history(since:)` で取得段階から絞っています）。カードにも `public · 12wk` と明記します。

ちなみに総合ティア（S/A/B/C/D）は初期からの 3 軸（VELOCITY / DIVERSITY / CONSISTENCY）だけで決めていて、後から足した SYNERGY / RANGE / FLOW はレーダー表示と POWER にしか効きません。軸を増やしても既存ユーザーのティアが動かないようにするためです。

### ジェネラティブアート & シリアル

ユーザー名の FNV-1a ハッシュをシードに、決定論的な幾何学アートを生成します。同じユーザー名なら何度描いても同じ絵、違うユーザー名なら必ず違う絵。カード番号（`#7F3A` みたいなシリアル）も同じハッシュ由来です。

LLM は一切呼んでいません。全部決定論です。

## 検出のしくみ

`Co-Authored-By:` トレーラーだけだと Cursor 系や「レビューにだけ AI を使う人」を取りこぼすので、3 層のエビデンスで検出します。

1. **committed** — コミットが AI 産だと分かる直接証拠。`Co-Authored-By: Claude <noreply@anthropic.com>` などのトレーラー、`Generated with [Claude Code]` の生成マーカー、bot コミット
2. **assisted** — コミット本文中の「レビュー的な使い方」。たとえば私のカードは `Codex x27` と出ますが、これは Codex をレビュアーとして使っていてトレーラーを一切残さないから。committed の % とは別枠で数えます
3. **equipped** — リポジトリに CLAUDE.md / AGENTS.md / .cursorrules / copilot-instructions.md がある「装備品」。コミット実績の % には混ぜず、装備として別表示

検出テーブルは 1 モジュールに集約し、「AI コミット判定されたのにツール帰属が unknown」というドリフトが起きない構造にしています（コミット文コーパスの全 fixture に期待ツール名を付けた契約テストで固定）。

## インフラ

- **Cloudflare Workers** + GitHub GraphQL API（GitHub App 認証）
- **GitHub GraphQL は 3 クエリ並列**（public repos / private repos / contributions）。1 本にまとめると GitHub 側の応答時間上限（~10s）を超えて **502** になるため分割しています。repos を public/private で分けているのも、All-repos インストール時に private が流入すると単一 repos クエリが肥大化して 502 が再発したからです
- **KV の stale-if-error キャッシュ**（fresh 1h / stale 24h）— GitHub API が枯れたら stale を供給、それも無ければ「Summoning…」プレースホルダ（エラー画像は出さない）
- **OGP シェア画像**は 1200×630 横長を `@resvg/resvg-wasm` で PNG 化。Workers にはフォントが無いので **Inter のサブセット（9.5KB×2）を同梱**して fontBuffers に渡しています。これを忘れると「文字が全部消えた画像」が X に流れます（実際に v1 で起きていました）
- **Analytics Engine** で「レンダリングされた distinct ユーザー数」を計測（スター数より正直な KPI）

## ハマりどころ

1. **octokit は存在しないユーザーで `user: null` を返さない** — GraphqlResponseError（`errors[].type === 'NOT_FOUND'`）を投げます。これを正規化しないと 404 が返せず、存在しないユーザー名の連打が毎回 GitHub クォータを消費します。対策として `not_found` も 10 分だけ KV にネガティブキャッシュし、ゴミ username の連打を吸収するようにしました（OGP 経路もカード本体と同じ KV キャッシュを共有させ、`/og` だけキャッシュを素通りしてクォータを溶かす穴も塞いでいます）
2. **404 を画像に返してはいけない** — GitHub camo 経由の 4xx は README 上で壊れ画像アイコンになります。画像コンテキストには 200 + エラーカード SVG、`Accept: text/html` のブラウザ直叩きにだけ 404 を返す設計にしました

## おわりに

デフォルトは公開リポジトリのみが対象なので、プライベート中心の人（私も）は低めに出ます。カードには C と正直に刻まれて悔しかったので、GitHub App を「All repositories」で入れるとプライベート活動を取り込む **Verified+** を用意しました。

取り込むのは **件数・統計だけ**で、**リポジトリ名もコードも一切カードに出しません**。Grade / POWER にも算入せず、あくまで表示専用です（`includesPrivate` フラグ1つで、フッターの窓ラベルが `all repos · 12wk`、アーキタイプ行の `✓ verified` が `✓ verified+` に切り替わるだけ）。「プライベート活動を混ぜたことは示すが、中身は明かさない」という線引きにしています。

まずは自分のカードを召喚してみてください → https://pullcard.sakimyto.com

リポジトリ: https://github.com/sakimyto/pullcard-ai （MIT）
