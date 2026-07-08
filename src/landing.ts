export function renderLandingPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>devcard-ai — AI Builder Trading Card</title>
  <meta name="description" content="Your AI coding style as a trading card. Rarity frames, archetype, stats — generated from your public GitHub activity. One line of markdown." />
  <meta property="og:title" content="devcard-ai — AI Builder Trading Card" />
  <meta property="og:description" content="Your AI coding style as a trading card. Proof you ship with AI." />
  <style>
    :root { --bg: #0d1117; --panel: #161b22; --border: #30363d; --text: #c9d1d9; --muted: #8b949e; --accent: #a371f7 }
    * { margin: 0; padding: 0; box-sizing: border-box }
    body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6 }
    .wrap { max-width: 880px; margin: 0 auto; padding: 48px 24px }
    h1 { font-size: 40px; letter-spacing: -0.02em }
    .sub { color: var(--muted); font-size: 18px; margin: 12px 0 32px }
    .hero-card { display: block; margin: 0 auto 40px; max-width: 375px; width: 100% }
    .builder { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 32px }
    .builder label { display: block; font-size: 13px; color: var(--muted); margin-bottom: 8px }
    .row { display: flex; gap: 8px; flex-wrap: wrap }
    input#username-input { flex: 1; min-width: 200px; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 10px 14px; border-radius: 8px; font-size: 15px }
    button { background: var(--accent); border: 0; color: #fff; padding: 10px 18px; border-radius: 8px; font-size: 15px; cursor: pointer; font-weight: 600 }
    button.ghost { background: transparent; border: 1px solid var(--border); color: var(--text) }
    pre#markdown-output { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 14px; margin-top: 16px; overflow-x: auto; font-size: 13px; white-space: pre-wrap; word-break: break-all }
    .steps { color: var(--muted); font-size: 14px; margin-top: 10px }
    footer { color: var(--muted); font-size: 13px; margin-top: 48px; text-align: center }
    a { color: var(--accent) }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Your AI coding style,<br/>as a trading card.</h1>
    <p class="sub">devcard-ai — AI Builder Trading Card. Rarity frame, archetype, stats. Generated from your public GitHub activity. Embedded with one line of markdown.</p>
    <img class="hero-card" src="/?user=sakimyto&theme=dark" alt="Example AI Builder Trading Card" />
    <div class="builder">
      <label for="username-input">GitHub username</label>
      <div class="row">
        <input id="username-input" placeholder="octocat" autocomplete="off" spellcheck="false" />
        <button id="generate-button">Summon my card</button>
      </div>
      <pre id="markdown-output" hidden></pre>
      <div class="row" style="margin-top:12px">
        <button id="copy-button" hidden>Copy markdown</button>
        <a id="share-x" hidden target="_blank" rel="noopener"><button class="ghost">Share on X</button></a>
      </div>
      <p class="steps">1. Summon → 2. Copy → 3. Paste into your profile README. Done in 60 seconds.</p>
    </div>
    <footer>
      <a href="https://github.com/sakimyto/devcard-ai">GitHub</a> · MIT · stats from public repos, last 12 weeks
    </footer>
  </div>
  <script>
    const RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/
    const input = document.getElementById('username-input')
    const output = document.getElementById('markdown-output')
    const copyBtn = document.getElementById('copy-button')
    const shareX = document.getElementById('share-x')
    const base = location.origin

    function summon() {
      const u = input.value.trim()
      if (!RE.test(u)) { input.focus(); return }
      const cardUrl = base + '/?user=' + encodeURIComponent(u) + '&theme=dark'
      // リンク先は /#username — LP に着地しつつ持ち主を引き継ぎ、着地側で自動召喚する
      const md = '[![AI Builder Trading Card](' + cardUrl + ')](' + base + '/#' + encodeURIComponent(u) + ')'
      output.textContent = md
      output.hidden = false
      copyBtn.hidden = false
      shareX.hidden = false
      shareX.href = 'https://twitter.com/intent/tweet?text=' +
        encodeURIComponent('Summoned my AI Builder Trading Card 🃏 ' + base + '/#' + u)
      const hero = document.querySelector('.hero-card')
      hero.src = cardUrl
    }

    document.getElementById('generate-button').addEventListener('click', summon)
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') summon() })
    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(output.textContent)
      copyBtn.textContent = 'Copied!'
      setTimeout(() => { copyBtn.textContent = 'Copy markdown' }, 1500)
    })

    // 事前入力: バッジ/シェアリンク経由の /#username を最優先、次に ?user=（保険）
    const fromHash = location.hash.length > 1 ? decodeURIComponent(location.hash.slice(1)) : ''
    const fromQuery = new URLSearchParams(location.search).get('user')
    const prefill = RE.test(fromHash) ? fromHash : (fromQuery && RE.test(fromQuery) ? fromQuery : '')
    if (prefill) { input.value = prefill; summon() }
  </script>
</body>
</html>`
}
