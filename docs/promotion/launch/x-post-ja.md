# X 投稿 (日本語) — Launch 用

## A. ショートフック (採用文脈)

「AIで開発できます」と言う候補者が増えた。
本当に出荷してるかは、コミット履歴に出る。

`devcard-ai` を作りました。Co-Authored-By トレイラを解析して、
GitHub プロフィール用の **AI Builder Passport** を発行します。

- Ship Velocity (週次カデンス・12週スパークライン)
- Tool 内訳 (Claude/Codex/Cursor/Copilot...)
- ✓ Verified (コミット痕跡で検証 = 偽造困難)
- TIER + Archetype (AI Native / Pair Programmer / Delegator / Selective)

`![AI Builder Passport](https://devcard-ai.sakimyto.workers.dev/?user=YOUR_USERNAME&theme=dark)`

https://devcard-ai.sakimyto.workers.dev/

---

## B. ロングスレッド (連投案)

**1/**
「AIで開発してます」の自己申告が当てにならなくなってきたので、
**コミット履歴から AI ビルダーの採用シグナルを抽出するカード** を作りました。

`devcard-ai` — AI Builder Passport for GitHub
https://devcard-ai.sakimyto.workers.dev/?user=sakimyto

**2/**
何が見えるか:

- **Ship Velocity** = 12週稼働カデンス + 週あたり AI コミット数
  → "今も出荷し続けてるか" が一目で分かる
- **TIER S〜D** = ツール幅・AIコミット率・最近の活動の合成
- **Archetype** = AI Native / Pair Programmer / Delegator / Selective User

**3/**
**Verified ✓** マークは「自己申告」ではなく
Co-Authored-By コミットトレイラ由来。
偽造には commit 履歴自体を改ざんする必要があるので採用面談での裏取りに使えます。

**4/**
対応ツール: Claude / Codex / Copilot / Cursor / Windsurf / Aider / Cody / Amazon Q / Gemini / Devin / Sweep

README に1行貼るだけ:
```
![AI Builder Passport](https://devcard-ai.sakimyto.workers.dev/?user=USER&theme=dark)
```

**5/**
スタックは Cloudflare Workers + GitHub GraphQL + 純 SVG。
SVG なので外部フォント・JS依存なし、GitHub README で直接表示できる。
OGP プレビュー (Twitter/Slack/Discord) は @resvg/resvg-wasm で PNG 生成。

GitHub: https://github.com/sakimyto/devcard-ai
