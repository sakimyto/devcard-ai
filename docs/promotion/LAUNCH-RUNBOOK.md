# Launch Runbook — submit直前まで自動（go-time 実行手順）

2026-07-13 作成。Claude が go-time に Chrome を駆動してフォーム記入済みのタブを開く。
**最後の submit ボタンだけ人間が押す**（HN/Reddit の bot 狩り回避 + publish の Activate は対話経路のみ、という自ルール）。

投下ウィンドウ: **今夜 22:00–24:00 JST**（US 朝 = HN の宝くじ枠）。

---

## Phase 1 — Show HN（22:00–24:00 JST）

**Claude がやる（go と言われたら）:**
1. Chrome で以下を開く（title + URL が記入済みで submit フォームが出る。要ログイン）:
   ```
   https://news.ycombinator.com/submitlink?u=https%3A%2F%2Fpullcard.sakimyto.com&t=Show%20HN%3A%20PullCard%20%E2%80%93%20Your%20AI%20coding%20style%20as%20a%20trading%20card%2C%20in%20your%20editor%27s%20theme
   ```
2. Title/URL の記入内容を目視確認し、ユーザーに「submit を押してください」と促す。
3. submit 後、スレ URL を読み取り、**最初のコメント**欄に `community-posts.md` の Show HN 本文（9–32行目）を貼り付ける。ユーザーが comment を押す。
4. スレ URL を控える（Phase 3 の X 引用 + 返信ウォッチ用）。

**プリフィル可否の実際:**
- ✅ Title + URL は `submitlink?u=&t=` で記入済みで開く（HN 公式のプリフィル経路）
- ⚠️ 本文（first comment）は submit 後に別途貼り付け（HN の仕様上プリフィル不可）
- ⚠️ 未ログインならログイン画面に飛ぶ → ユーザーが手動ログイン後に再度この URL

---

## Phase 2 — Reddit 3板（同夜〜翌朝、Show HN 投下後）

投下順: r/GithubProfileReadme → r/ClaudeAI → r/cursor（最適合順）。**各板の間隔を最低30分空ける**（連続投稿の spam 判定回避）。

**Claude がやる（各板ごとに）:**
1. Chrome で submit ページを開く（title 記入済み・IMAGE タブ選択済み）:
   - r/GithubProfileReadme:
     `https://www.reddit.com/r/GithubProfileReadme/submit?type=IMAGE&title=Pok%C3%A9mon-style%20AI%20builder%20card%20for%20your%20README%20%E2%80%94%20now%20in%2013%20editor%20themes%20%28Dracula%2C%20Nord%2C%20Tokyo%20Night...%29`
   - r/ClaudeAI:
     `https://www.reddit.com/r/ClaudeAI/submit?type=IMAGE&title=I%20turned%20my%20Claude%20usage%20into%20a%20Pok%C3%A9mon-style%20trading%20card%20%28pick%20your%20editor%27s%20theme%29`
   - r/cursor:
     `https://www.reddit.com/r/cursor/submit?type=IMAGE&title=PullCard%20AI%20%E2%80%94%20a%20trading%20card%20of%20your%20AI%20coding%20style%20%28Cursor%20detected%203%20ways%29`
2. 画像 `docs/promotion/launch-assets/card-sakimyto.png` の絶対パスをユーザーに提示し、ドラッグ&ドロップ or ファイル選択で添付してもらう（画像は URL プリフィル不可）。
3. 本文（`community-posts.md` の各板該当節）をコメント/本文欄に貼り付け。
4. ユーザーが post を押す。スレ URL を控える。

**プリフィル可否の実際:**
- ✅ Title は `submit?title=` で記入済み
- ⚠️ 画像添付は手動（Reddit は画像を URL で渡せない）→ Claude が絶対パスを提示、ユーザーが添付
- ⚠️ 本文は貼り付け（画像投稿はマークダウン本文を後入力）

画像絶対パス:
- 縦カード: `/Users/sakimyto/_pjsc/devcard-ai/docs/promotion/launch-assets/card-sakimyto.png`
- テーマ比較: `/Users/sakimyto/_pjsc/devcard-ai/docs/promotion/launch-assets/theme-grid.png`

---

## Phase 3 — 翌日以降（初動を見てから）

- **翌朝 X 英語**: `x-post-en.md` + card PNG。HN/Reddit が伸びていれば Phase 1 のスレを引用。Claude が投稿画面をプリフィルで開く。
- **翌日夜 X 日本語**: `x-post.md`
- **Zenn 公開**: `zenn-article.md` を `published: true` に → Claude が `git push`（これはコード操作なので Claude が完結可）
- **数日後 Product Hunt**: `product-hunt.md`、distinct 召喚 30–50 到達後に 16:01 JST。

---

## 投下後に Claude が自走できること

- 各スレ URL をもらえば HN/Reddit の**返信ドラフト**作成
- **召喚数ウォッチ**: Analytics Engine `devcard_renders`（distinct index1）。30日目標 distinct 100 / スター 50
- **502・レート異常の即応**（/og クォータは 2026-07-13 に KV SWR 対策済み。コールドキャッシュの新規殺到にも耐性あり）
- スター数・HN 順位の定点観測

---

## 安全境界（守る）

- 最終 submit / post / comment ボタンは**必ず人間**が押す（自ルール: publish の Activate は対話経路のみ）
- Claude はフォームを記入済みで開く・本文を貼る・画像パスを渡すまで。投稿の確定はしない
- スケジュール実行（cron/launchd）から投稿フローは起動しない（reminder 止まり）
