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
3. **ジェネラティブアート領域**: username の hash をシードにした決定論的な幾何学アート。ユーザーごとに固有・再現可能。LLM 不使用
4. ステータスバー 3 本（0-100): VELOCITY / DIVERSITY / CONSISTENCY
5. ツールロードアウト: ツール名 + シェア%（チップ表示）
6. 言語タイプアイコン（上位3言語）
7. フレーバーテキスト: データから決定論生成する一行（テンプレート × 条件分岐。LLM 不使用）
8. フッター: カードシリアル（username hash 由来 4 桁 hex + `2026`)+ データ窓表記 `public · 12wk` + devcard-ai クレジット

light / dark 両テーマ維持。

## Section 2: 指標再設計とデータ精度（v1 = 公開範囲で最大精度)

### 検出の拡張

- 既存: `Co-Authored-By` トレーラー（coauthor.ts）
- 追加①: コミット本文の AI マーカー（`Generated with [Claude Code]`、`🤖 Generated with` 等のパターン集)
- 追加②: 設定ファイルシグナル（CLAUDE.md / AGENTS.md / .cursorrules / .cursor/rules / copilot-instructions.md / .claude — **GraphQL で取得済みだが未活用**)。ツールロードアウトに「equipped」バッジ（設定ファイル由来）として表示し、コミット由来のシェア%とは混ぜない（%はコミット実績のみ)。DIVERSITY のツール種類数には equipped も 0.5 重みで算入
- 追加③: bot author（`*[bot]` login）

### 時間窓の統一

全指標を「直近 12 週・公開リポジトリ・default branch」に統一。カード上に `public · 12wk` を明示。Grade も同一窓で計算し、窓違いによる矛盾表示（TIER A + 1/12 weeks）を構造的に排除する。

### ステータス定義（各 0-100)

- **VELOCITY**: 12 週窓のコミット頻度（対数スケールで正規化。碌に公開活動がない場合に 0 に張り付くのは正しい挙動とする）
- **DIVERSITY**: ツール種類 × 用途（Feature/Fix/Test/Refactor）の分散
- **CONSISTENCY**: アクティブ週割合（active weeks / 12）
- **Grade**: 3 ステータスの加重合成。初期重み VELOCITY 40% / DIVERSITY 30% / CONSISTENCY 30%、閾値は現行踏襲（80/60/40/20)。実装時にサンプルユーザー群（自分 + 著名 OSS 開発者数名）で再キャリブレーションし、変更は golden file の意図した差分として記録。数字とレアリティが同じ物語を語る

## Section 3: 技術品質・堅牢性

### OGP フォント修正（確認済みバグ)

- サブセット化した WOFF2/TTF（Inter 系 + 数字用）を Worker にバンドルし resvg の `fontBuffers` に渡す
- **OGP は横長シェア専用バリアント**（1200×630、縦カードをそのまま流用しない): カードの要約（名前・ティアジェム・レアリティ枠・ステータス）をブランド背景の上に横組みし直した画像を `/og` で返す。縦カード本体は README 埋め込み用
- リリースゲート: X card validator + X/Slack/Discord 実共有の目視確認

### 入力防御（現状ゼロ)

- `?user=` バリデーション: `^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$`（GitHub username 規約)。不正値は 400
- 存在しないユーザーは 404 + **404 レスポンスもキャッシュ**（クォータ枯渇・キャッシュ汚染対策)
- LP のユーザー名反映箇所の HTML エスケープ確認・修正（反射 XSS)

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
4. 不正 `?user=` が 400、存在しないユーザーが 404（キャッシュ付き）で返る
5. `make`/`bun test` 全パス、golden file 更新は意図した差分のみ
6. Analytics Engine に distinct ユーザーが記録される
