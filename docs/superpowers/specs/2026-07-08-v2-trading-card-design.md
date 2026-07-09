# devcard-ai v2 — Trading Card Edition 設計書

作成: 2026-07-08 / ステータス: 承認済み（ユーザーレビュー待ち）

## 背景と目的

サービス品質そのものを引き上げる総合刷新。品質の4軸（データ正確性・トレカとしての見た目・指標の意味・技術堅牢性)を「AI Builder のトレーディングカード」というコンセプトで一体再設計し、v2 として1回でリリースする。

実物検証で確認済みの品質課題:

1. データが実態を過小評価（公開リポ default branch × 直近100コミットのみ。「TIER A なのに 1/12 active weeks」という矛盾表示）
2. OGP PNG のテキスト全欠落（resvg-wasm にフォント未同梱。X シェアで文字なしカードが出る）
3. 見た目がトレカではなく簡素なダッシュボード
4. 検出が Co-Authored-By トレーラー頼み（Cursor 等のユーザーを過小評価)。`?user=` 無防備、distinct 計測なし

## スコープ

- **IN**: カード全面リデザイン（トレカ文法)、指標再設計、検出拡張（公開範囲内)、OGP フォント修正、入力防御、キャッシュ/耐障害、Analytics Engine 計測、LP の追随更新
- **OUT**: GitHub OAuth 連携（プライベート集計 = v2.x の「Verified+」)、収集・ギャラリー・シーズン機構、マネタイズ、マルチプラットフォーム対応

## Section 1: トレカ文法

### レアリティ（Grade 連動フレーム)

Grade は S/A/B/C/D を維持し、フレーム演出に直結させる:

| Tier | フレーム | 演出 |
|------|---------|------|
| S | Holo | 虹色グラデーション枠 + シャインスイープ（SVG アニメーション。GitHub `<img>`/camo 経由で動作する CSS/SMIL のみ使用） |
| A | Gold | 金枠 + 控えめな光沢 |
| B | Silver | 銀枠 |
| C | Bronze | 銅枠 |
| D | Common | 無装飾グレー |

### アーキタイプ（Pattern のクラス化)

AI Native / Pair Programmer / Delegator / Selective User を「クラス」として扱い、専用エンブレム（SVG アイコン）とアクセント色を付与。

### レイアウト

縦型トレカ比率 750×1050（現行 800×856 を廃止)。上から:

1. 名前プレート: `AI BUILDER` 肩書 + username + ティアジェム
2. アーキタイプ紋章 + クラス名
3. **ジェネラティブアート領域**（高さ 240): username の hash をシードにした決定論的な幾何学アート。ユーザーごとに固有・再現可能。LLM 不使用。中央に**アバターメダリオン**（円形・半径56・accent 3px 縁取り + 外側 1px 暗リング）を重ねる。アバターは handler 層でサーバ取得し base64 の `data:` URI としてインライン化する（GitHub の `<img>`/camo は remote `href` を描画しないため）。取得失敗時は null → メダリオン非表示で劣化なく描画
4. **ステータス（6角レーダー + 数値列 + POWER)**: 左に6軸レーダー（VELOCITY / DIVERSITY / SYNERGY / CONSISTENCY / RANGE / FLOW、上から時計回り、25/50/75/100 の同心6角グリッド）、右に同6軸の数値列、STATS ヘッダ右端に **POWER**（総合戦闘力・千位カンマ・9000超はゴールド）。従来の縦バー3本は廃止
5. ツールロードアウト: ツール名 + シェア%（チップ表示）
6. 言語タイプアイコン（上位3言語）
7. フレーバーテキスト: データから決定論生成する一行（テンプレート × 条件分岐。LLM 不使用）
8. フッター: カードシリアル（username hash 由来 4 桁 hex + `2026`)+ データ窓表記 `public · 12wk` + devcard-ai クレジット

light / dark 両テーマ維持。OGP 横長シェア画像にも名前左のアバター（半径40）と、ティアジェム下の大きな POWER を反映する（レーダーは入れず縦バー3本のまま）。

## Section 2: 指標再設計とデータ精度（v1 = 公開範囲で最大精度)

### 検出の拡張

- 既存: `Co-Authored-By` トレーラー（coauthor.ts）
- 追加①: コミット本文の AI マーカー（`Generated with [Claude Code]`、`🤖 Generated with` 等のパターン集)
- 追加②: 設定ファイルシグナル（CLAUDE.md / AGENTS.md / .cursorrules / .cursor/rules / copilot-instructions.md / .claude — **GraphQL で取得済みだが未活用**)。ツールロードアウトに「equipped」バッジ（設定ファイル由来）として表示し、コミット由来のシェア%とは混ぜない（%はコミット実績のみ)。DIVERSITY のツール種類数には equipped も 0.5 重みで算入
- 追加③: bot author（`*[bot]` login）
- 追加④: assisted シグナル（コミット本文の「ツール名 + 使用動詞」文脈 — 例 `codex exec review` / `codexレビュー反映` / `gpt-5 review で指摘`）。トレーラーを残さないレビュアー用途の AI 使用（codex 等）を可視化する。committed（トレーラー/マーカー/bot）とは別軸で評価し、AI 関与 = committed または assisted と定義。ツールロードアウトに「· assisted」チップ（実線・アイコン付き、equipped の破線チップと区別）。同一ツールが committed に居れば上位証跡として assisted からは除外。ツール名単独の言及（「Codex対応」「add Codex tool」）は使用動詞がないため非マッチ

### 時間窓の統一

全指標を「直近 12 週・公開リポジトリ・default branch」に統一。カード上に `public · 12wk` を明示。Grade も同一窓で計算し、窓違いによる矛盾表示（TIER A + 1/12 weeks）を構造的に排除する。取得は `history(first: 100, since: <12週前>)` で窓外コミットの取得自体を止め、1 リポジトリあたり窓内 100 コミットまで集計する（超過分は切り捨て、pagination は導入しない。カード表記は `public · 12wk` のまま)。

### ステータス定義（各 0-100)

- **VELOCITY**: 12 週窓のコミット頻度（対数スケールで正規化。碌に公開活動がない場合に 0 に張り付くのは正しい挙動とする）
- **DIVERSITY**: ツール種類 × 用途（Feature/Fix/Test/Refactor）の分散。ツール種類数は証跡の強さで重み付け（committed 1.0 / assisted 0.75 / equipped 0.5）。同一ツールは最上位の証跡でのみ算入し二重加算しない。正規化上限は4種
- **CONSISTENCY**: アクティブ週割合（active weeks / 12）
- **SYNERGY**（v2.2 追加・レーダー軸）: AI 関与コミット率。`round(100 * min(1, aiInvolvedInWindow / max(1, totalCommitsInWindow)))`
- **RANGE**（v2.2 追加・レーダー軸）: 活動の幅。`round(100 * (0.5 * min(1, langCount/3) + 0.5 * min(1, activeRepoCount/6)))`。langCount = 言語数、activeRepoCount = 窓内コミットが1件以上あるリポジトリ数
- **FLOW**（v2.2 追加・レーダー軸）: 窓内コミットの人間↔AI交互性。`round(100 * alternationScore)`（pattern.alternationScore を窓内コミットで算出）
- **POWER**（v2.2 追加・総合戦闘力): `round((velocity+diversity+consistency+synergy+range+flow) * 17)`（最大 10,200）。トップ層だけが 9000 を超えられる意図的キャリブレーション（over-9000 ミーム）。9000 超で表示色をゴールドに切替
- **Grade**: **従来 3 軸のまま**（VELOCITY 40% / DIVERSITY 30% / CONSISTENCY 30%、閾値 80/60/40/20)。v2.2 で追加した SYNERGY/RANGE/FLOW/POWER は**表示専用でティア計算に一切寄与しない**（既存ユーザーのティアは動かない — golden/anchor テストが無変更で緑であることで検証)。数字とレアリティが同じ物語を語る

## Section 3: 技術品質・堅牢性

### OGP フォント修正（確認済みバグ)

- サブセット化した WOFF2/TTF（Inter 系 + 数字用）を Worker にバンドルし resvg の `fontBuffers` に渡す
- **OGP は横長シェア専用バリアント**（1200×630、縦カードをそのまま流用しない): カードの要約（名前・ティアジェム・レアリティ枠・ステータス）をブランド背景の上に横組みし直した画像を `/og` で返す。縦カード本体は README 埋め込み用
- リリースゲート: X card validator + X/Slack/Discord 実共有の目視確認

### 入力防御（バリデーションと IP レートリミットは実装済み — 残課題のみ)

- 実装済み: `?user=` は `GH_LOGIN_RE` で検証済み（`api/index.ts`)、IP レートリミット（`API_RATELIMIT` binding）あり
- 追加①: 不正 `?user=` は現状「空扱い→エラーカード status 200」→ **400 を返す**よう変更（挙動の明確化)
- 追加②: 存在しないユーザーは、非画像リクエスト（Accept: text/html）では **404 + キャッシュ付き**、画像リクエスト（GitHub camo / `<img>`）では **200 + エラーカード SVG + Cache-Control** で返す。GitHub camo 経由の 4xx は README 上で壊れ画像アイコンになり品質を毀損するため。どちらの経路もキャッシュにより存在しないユーザー名連打のクォータ消費を吸収する
- 追加③: LP のユーザー名反映箇所の HTML エスケープ監査（反射 XSS)

### キャッシュ・耐障害

- Cache API + KV、stale-while-revalidate（fresh TTL 1h / stale 24h)
- GitHub API 枯渇時: stale 供給 → stale もなければ「Summoning…」プレースホルダカード（エラー画像を出さない)
- GitHub GraphQL は 1 レンダリング 1 リクエストを維持

### 計測

- Analytics Engine `writeDataPoint`: username / theme / cache hit を記録。KPI「distinct レンダリングユーザー数」を取得可能にする（グローバル戦略文書の行動5と接続: sakimemo `40_output/devcard-ai/20260708_global-strategy.md`)

### LP 追随

- トレカコンセプトにコピー・ビジュアルを合わせる。`?user=` 引き継ぎ + markdown ワンクリックコピー + Share on X intent（グローバル戦略の行動2)

## Section 4: テスト戦略

- **アナライザ**: 純関数の unit test（既存 Vitest 資産を継続)。新検出ロジックは実在コミットメッセージのコーパスを fixture 化し、旧実装をオラクルに差分を「意図した変更 / デグレ」に分類して承認
- **SVG**: golden file テスト（固定入力 → SVG スナップショット)。境界値 fixture: 39 文字ユーザー名 / ツール 0 / コミット 0 / 全ティア 5 種
- **ビジュアル**: qlmanage レンダリング → 目視レビューを各マイルストーンに実施（全ティア × light/dark = 10 枚マトリクス)。決定論チェックで美しさは担保できない前提
- **防御系**: 攻撃入力を先にテスト化する Red → Green（t_wada 式)
- **OGP 回帰**: 出力 PNG のテキスト領域ピクセル検査（背景色のみ = フォント欠落を機械検知)

## 受け入れ条件

1. 全ティア × 両テーマの 10 枚が目視レビューで承認される
2. OGP PNG にテキストが描画される（ピクセル検査 + 実共有確認)
3. 同一ユーザーのカード内で指標同士が矛盾しない（同一 12 週窓)
4. 不正 `?user=` が 400 で返る。存在しないユーザーは非画像リクエスト（Accept: text/html）では 404（キャッシュ付き)、画像リクエストでは 200 + エラーカード SVG + Cache-Control で返る（GitHub camo 経由の 4xx は README 上で壊れ画像になるため）
5. `make`/`bun test` 全パス、golden file 更新は意図した差分のみ
6. Analytics Engine に distinct ユーザーが記録される
