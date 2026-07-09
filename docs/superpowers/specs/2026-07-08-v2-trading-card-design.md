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

- **IN**: カード全面リデザイン（トレカ文法)、指標再設計、検出拡張（公開範囲内)、OGP フォント修正、入力防御、キャッシュ/耐障害、Analytics Engine 計測、LP の追随更新、召喚ギャラリー（KV メタデータによる直近召喚者一覧、ユーザー指示 2026-07-09)
- **OUT**: GitHub OAuth 連携（プライベート集計 = v2.x の「Verified+」)、収集・所有・シーズン機構、マネタイズ、マルチプラットフォーム対応

> 召喚ギャラリー = KV メタデータによる直近召喚者一覧のみ。収集・所有・シーズン機構は引き続き OUT。

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
2. アーキタイプ行: 紋章 + **二つ名（EPITHET)** + `✓ verified`（private 込みなら `✓ verified+`)+ **属性チップ（ELEMENT)**（クラス名ラベルは撤去。紋章は内部 PatternType 判定を流用)
3. **ジェネラティブアート領域**（高さ 220・v2.7 で 240→220 に縮小し CONTRIBUTIONS グラフの縦予算を捻出): username の hash をシードにした決定論的な幾何学アート。ユーザーごとに固有・再現可能。LLM 不使用。中央に**アバターメダリオン**（円形・半径56・accent 3px 縁取り + 外側 1px 暗リング）を重ねる。アバターは handler 層でサーバ取得し base64 の `data:` URI としてインライン化する（GitHub の `<img>`/camo は remote `href` を描画しないため）。取得失敗時は null → メダリオン非表示で劣化なく描画
4. **ステータス（6角レーダー + 数値列 + POWER)**: 左に6軸レーダー（VELOCITY / DIVERSITY / SYNERGY / CONSISTENCY / RANGE / FLOW、上から時計回り、25/50/75/100 の同心6角グリッド）、右に同6軸の数値列、STATS ヘッダ右端に **POWER**（総合戦闘力・千位カンマ・9000超はゴールド）。従来の縦バー3本は廃止
5. ツールロードアウト: ツール名 + シェア%（チップ表示）
6. **言語タイプ（TYPES・v3.0 で bytes 比率の積み上げバーに刷新)**: 全リポの `languages` edges を **bytes で集計**した全体比率（github-profile-summary-cards 方式)。ラベル `TYPES` の下にコンテンツ幅の**積み上げ%バー**（高さ10px・角丸・各セグメント幅 = その言語の bytes%・上位4言語を言語色で分割・残りは muted グレーの others 尾)、その下に凡例 `● {言語} {NN}%`（上位3-4・ドット=言語色・% は muted・4言語時はフォント12で折り返し回避)。整数%は round・丸め誤差は others に吸収し全体で 100%。Markdown/HTML/CSS 等のノイズ除外はしない（正直な比率)。座標は `toFixed(2)`。**表示専用**だが langCount（others 除く最大4）は RANGE 入力に接続。0言語時は `—` プレースホルダに劣化
7. **RECORD ストリップ**（v2.5 追加・TYPES と CONTRIBUTIONS グラフの間、帯 y 820-858・v2.7 で繰り上げ）: 左に `EXP {総コントリビューション:カンマ区切り}`（大きめの数字・accent・ミニ POWER 風。restricted 込みなら右肩に小さく `incl. private`)、中央に `{commits}c · {prs}pr · {reviews}rev`（issues は非表示)、右に `{現在ストリーク}d streak`（現在 0 なら `best {最長}d`、両方 0 なら streak 部分ごと非表示)。マーカーは絵文字（⚔/🔥）が GitHub の SVG ラスタライザで潰れるためテキストグリフ（`›`/`▲`)を採用。**Grade/POWER には一切算入しない（表示専用・ティア不変)**
8. **CONTRIBUTIONS グラフ（52週・1y・v2.7 追加)**（RECORD の直下・TRAITS の上、ラベル y886・バー下端 y928）: セクションラベル `CONTRIBUTIONS · 1y`（15px muted）+ 右端に `{yearTotal:カンマ} total`（13px muted)。52本の縦バー（幅 = (CARD_W − PAD×2)/52 − gap1px、下端 y940 から上向き)。高さは 4〜32px を週値の **sqrt スケール**で正規化（外れ値週に潰されないため。max 0 のときは全バー最小高でフラット表示)。バー色は accent・値比例 opacity（0.35→0.9)、**今週（右端）だけ full opacity + 1px アクセントリング**で「現在」を示す。座標は `toFixed(2)`（golden 安定)。**12週窓の指標群とは独立した表示専用の1年アクティビティログ**（Grade/POWER に一切算入しない・カード上で `· 1y` 明記)。v2.6 まであったフレーバー上の区切り線はグラフが情報を区切るため撤去
9. **発動型特性（TRAITS・v2.6)**（CONTRIBUTIONS グラフの下、y952/980・フッター y1010 と 30px クリア): 条件成立した特性を優先度上位2個まで `◆ {名} — {proof}`（名は accent 太字 17px・proof は muted 15px・各1行）で表示。**0個発動時は従来のフレーバーテキスト**（データ決定論生成の一行）に劣化（後方互換)。マーカー `◆` はテキストグリフ（絵文字回避)
10. フッター: カードシリアル（username hash 由来 4 桁 hex + `2026`)+ データ窓表記（public-only は `public 12wk`、private 込みは `all repos · 12wk`)+ devcard-ai クレジット

### private リポの取り込みとラベル（v3.0）

- private リポは**ユーザーが GitHub App を「All repositories」でインストールした場合のみ**自動的にカードに含まれる（installation token の権限に従う。ユーザー操作不要・opt は App インストール範囲で決まる)
- private が含まれると **`all repos · 12wk`（フッター）** と **`✓ verified+`（アーキタイプ行）** で明示。含まれなければ従来の `public 12wk` / `✓ verified`
- `includesPrivate` は2経路のいずれかで true: ①PRIVATE リポクエリが1件以上ノードを返す（languages・コミットメッセージが流入)、②contributions の `commitContributionsByRepository` に `isPrivate` かつ件数>0 の行がある（RANGE に流入。PRIVATE リポクエリが 502 で劣化しても正確にラベルするため)
- **リポジトリ名・URL・説明は一切カードに描画しない**（集計値とラベルのみ)。private の内容が漏れる表面は持たない
- クエリは `$privacy` 変数で PUBLIC / PRIVATE を別クエリ化し client.ts で **3並列**（public + private + contributions)。All-repos インストールで単一 repos クエリが 9〜11s まで肥大化し本番 502 が再発するため（gh api graphql 実測: public 2.3s / private 9〜11s)、private を分離し **public は常に軽量・確実に成功する主系**、重い private が 502 しても **public のみで劣化描画**（フォールトアイソレーション。private 502 はカード全体を殺さない)

light / dark 両テーマ維持。OGP 横長シェア画像にも名前左のアバター（半径40）と、ティアジェム下の大きな POWER を反映し、パターン行は**二つ名（EPITHET)** に差し替える（レーダーは入れず縦バー3本のまま）。

### 属性 ELEMENT / 二つ名 EPITHET / 発動型特性 TRAITS（v2.6・TCG 情報密度）

「カードに勝手に色々書いてある」トレカらしさを増幅する装置。**全て決定論・12週窓・表示専用（Grade/POWER に一切算入しない = ティア不変)**。アイコンは絵文字でなく SVG グリフ（GitHub の SVG ラスタライザで絵文字が潰れるため、RECORD ストリップと同方針)。

- **ELEMENT（属性・6種)**: 6レーダー軸の **argmax** で1種決定（同値タイブレークは表の上から優先: velocity → synergy → consistency → flow → range → diversity)。`velocity→Bolt(#f0b429)` / `synergy→Lumen(#a371f7)` / `consistency→Tide(#58a6ff)` / `flow→Gale(#3fb950)` / `range→Terra(#2ea88f)` / `diversity→Blaze(#f4652f)`。アーキタイプ行に element 色の縁取り+15%塗りチップ（グリフ+ラベル)で表示
- **EPITHET（二つ名・16+1)**: 内部4軸コード（**表示しない** — MBTI 風文字コードはユーザー却下)から16名を Record 型強制で網羅。軸閾値 `A/H = synergy>=50` / `F/D = flow>=40` / `S/R = consistency>=50` / `W/N = range>=50`。特例 `synergy>=75 かつ velocity>=60 → 'The Ascendant'`（17個目・最上位)。名前のみ表示（ogShare のパターン行もこれに差し替え)
- **TRAITS（発動型特性・優先度プール20)**: 優先度順プールから条件成立の**上位2個**を表示。proof はテンプレ固定（Sentence case・数値埋め込み)。判定閾値: `ascension power>=9000` / `unbroken currentStreak>=21` / `centurion AI関与コミット>=100` / `chain-strike 1日8コミット以上の日>=3` / `burst-caster 単日最大>=20` / `perfect-attendance activeWeeks==12` / `ghostwriter synergy>=80` / `iron-hand synergy<=20 かつ 窓内総コミット>=30` / `duelist assistedツール>=1` / `one-true-blade topツール>=90%` / `multi-wielder committedツール>=3` / `armory equipped>=3` / `reviewers-eye reviews>=15 かつ reviews/(commits+1)>=0.2` / `pr-cannon prs>=25` / `monastic 1リポジトリに>=70%` / `nomad 窓内活動リポジトリ>=8` / `polyglot 言語>=3種` / `weekend-warrior 土日コミット比>=35%` / `comeback 3週以上の空白後に3週連続活動` / `fresh-summoner 初AIコミットが直近4週内`。派生値（単日/週次/リポジトリ分布)は窓内コミット配列から analyzeTraits 内で決定論導出する。**hour-of-day 系は不採用**（GraphQL タイムスタンプは UTC 正規化でタイムゾーン不明のため)。**weekend は UTC 近似**（土日判定を UTC 曜日で行う旨を明記)。fresh-summoner は履歴が窓内に限定されるため「初AIコミットが窓の直近4週内」を新規AI利用者の下限特性として採用（優先度最下位・フレーバー fallback の手前)

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
- **RANGE**（v2.2 追加・レーダー軸）: 活動の幅。`round(100 * (0.5 * min(1, langCount/3) + 0.5 * min(1, activeRepoCount/6)))`。**式は不変**。v3.0 で入力を精緻化: langCount = LanguageAnalysisV2 の言語数（others 除く・最大4）、activeRepoCount = `commitContributionsByRepository` の件数>0 リポ数（正確・per-repo 100件キャップなし。フィールド欠落時のみ従来の history 由来 repoFullName 集合へフォールバック)。**この精緻化で個々の数値・Grade は動きうる — 精度向上による意図した差分**（式・重み・閾値は無変更なのでティア計算ロジック自体は不変）
- **FLOW**（v2.2 追加・レーダー軸）: 窓内コミットの人間↔AI交互性。`round(100 * alternationScore)`（pattern.alternationScore を窓内コミットで算出）
- **POWER**（v2.2 追加・総合戦闘力): `round((velocity+diversity+consistency+synergy+range+flow) * 17)`（最大 10,200）。トップ層だけが 9000 を超えられる意図的キャリブレーション（over-9000 ミーム）。9000 超で表示色をゴールドに切替
- **Grade**: **従来 3 軸のまま**（VELOCITY 40% / DIVERSITY 30% / CONSISTENCY 30%、閾値 80/60/40/20)。v2.2 で追加した SYNERGY/RANGE/FLOW/POWER は**表示専用でティア計算に一切寄与しない**（既存ユーザーのティアは動かない — golden/anchor テストが無変更で緑であることで検証)。数字とレアリティが同じ物語を語る
- **戦績（RECORD・v2.5 追加)**: `contributionsCollection(from: $since)` で取得（同一 12 週窓・追加リクエストなし・既存クエリにフィールド追加のみ)。EXP = `contributionCalendar.totalContributions`、commits/prs/reviews = 各 `total*Contributions`。restricted（非公開）は**ユーザーが GitHub 側で公開設定にした場合のみ**含まれ、`restrictedContributionsCount > 0` のとき `incl. private` を明示。ストリークは now 注入の決定論計算（日付は UTC 日で突合、今日が 0 なら昨日から現在ストリークを数える)。フィールド欠落・権限制限時は全て 0 で劣化描画（クラッシュ禁止)。**Grade/POWER には算入しない**
- **1年アクティビティグラフ（CONTRIBUTIONS・v2.7 追加)**: 同一リクエストに `yearContributions: contributionsCollection(from: $yearAgo)` エイリアスを追加して取得する（`$yearAgo` = now−364d を ISO で注入。`contributionsCollection` の from/to は最大1年のため 364d で安全側)。`contributionCalendar.weeks` を**週次合計52要素**（古→新・週数<52なら先頭0埋め・>52なら末尾52週採用）に畳み込み、`yearTotal` と併せて RecordAnalysis に格納。**これは12週窓の指標群とは独立した表示専用の1年アクティビティログ**（カード上で `· 1y` 明記・Grade/POWER・stats・element・epithet・traits の一切に算入しない)。フィールド欠落時は yearTotal 0 / 全0配列で劣化描画（クラッシュ禁止)

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

### 召喚ギャラリー（KV メタデータ)

- **書き込み**: SVG ルートで `kind==='ok'` かつ **miss レンダリング時のみ**、`ctx.waitUntil()` で `gallery:u:{user}`（値 `'1'`)を KV に fire-and-forget 記録。metadata = `{ at, grade, power, element, epithet }`（1024B 制限内)、`expirationTtl` 90日。fresh hit では書かず KV 無料枠に収める。記録失敗はレンダリングを止めない（ベストエフォート)
- **読み出し**: `GET /api/gallery` — `DEVCARD_KV.list({ prefix: 'gallery:u:', limit: 1000 })` を cursor で全ページ走査し、`{ user, at, grade, power, element, epithet }[]` を `at` 降順 top24 で JSON 返却。`Cache-Control: public, max-age=60`。KV list はキー名昇順ページングのため、単一ページを at ソートせず全走査してから並べ替える。list の結果整合性は許容
- スコープ: 直近召喚者一覧のみ。収集・所有・シーズン機構は OUT

### LP 追随

- トレカコンセプトにコピー・ビジュアルを合わせる。`?user=` / `/#username` 引き継ぎ + markdown ワンクリックコピー + Share on X intent（グローバル戦略の行動2)
- v2.9 刷新: ①1stビューで input+Summon を即生成（説明1文)、②生成後にカード wow → プロフィール README 埋め込み導線（同名リポジトリ `username/username` の README がプロフィールに出る旨 + `github.com/new` リンク)、③直近召喚ギャラリー（アバター + ティア + POWER + element グリフ、同 element 枠色共鳴、クリックで `location.hash` 経由自動召喚)。ユーザー名は textContent/createElement のみで描画（innerHTML 連結禁止 = XSS 防御)

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
