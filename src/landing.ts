export function renderLandingPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>devcard-ai — AI Builder Trading Card</title>
  <meta name="description" content="Your GitHub, as a trading card. Rarity frame, archetype, POWER — generated from your public GitHub activity. One line of markdown." />
  <meta property="og:title" content="devcard-ai — AI Builder Trading Card" />
  <meta property="og:description" content="Your GitHub, as a trading card. Proof you ship with AI." />
  <style>
    :root { --bg: #0d1117; --panel: #161b22; --border: #30363d; --text: #c9d1d9; --muted: #8b949e; --accent: #a371f7 }
    * { margin: 0; padding: 0; box-sizing: border-box }
    body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6 }
    .wrap { max-width: 960px; margin: 0 auto; padding: 40px 24px 64px }
    h1 { font-size: 42px; line-height: 1.1; letter-spacing: -0.02em }
    .sub { color: var(--muted); font-size: 17px; margin: 14px 0 24px; max-width: 46ch }
    /* Hero: input + button live inside the first view, card demo alongside */
    .hero { display: grid; grid-template-columns: 1fr minmax(0, 320px); gap: 40px; align-items: center }
    .hero-card { display: block; width: 100%; max-width: 320px; border-radius: 14px }
    .row { display: flex; gap: 8px; flex-wrap: wrap }
    input#username-input { flex: 1; min-width: 200px; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 12px 14px; border-radius: 8px; font-size: 16px }
    input#username-input:focus { outline: none; border-color: var(--accent) }
    button { background: var(--accent); border: 0; color: #fff; padding: 12px 20px; border-radius: 8px; font-size: 15px; cursor: pointer; font-weight: 600 }
    button.ghost { background: transparent; border: 1px solid var(--border); color: var(--text) }
    .hint { color: var(--muted); font-size: 13px; margin-top: 10px; min-height: 1em }
    /* Result (post-summon): the wow first, then the embed steps */
    #result { margin-top: 48px; display: grid; grid-template-columns: minmax(0, 340px) 1fr; gap: 36px; align-items: start }
    /* ID セレクタの display は UA の [hidden]{display:none} に勝つため、hidden 状態を明示的に維持する */
    #result[hidden] { display: none }
    .result-card { display: block; width: 100%; max-width: 340px; border-radius: 14px }
    .steps-panel { display: flex; flex-direction: column; gap: 20px }
    .step { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 18px }
    .step-h { font-weight: 600; font-size: 15px; display: flex; align-items: center; gap: 10px }
    .step-n { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: var(--accent); color: #fff; font-size: 13px }
    .step-body { color: var(--muted); font-size: 14px; margin-top: 8px }
    code { background: var(--bg); border: 1px solid var(--border); border-radius: 5px; padding: 1px 6px; font-size: 13px }
    pre#markdown-output { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin: 10px 0; overflow-x: auto; font-size: 13px; white-space: pre-wrap; word-break: break-all }
    /* Gallery: recently summoned, newest first — 実カードをそのまま並べる */
    #gallery { margin-top: 72px }
    .gallery-title { font-size: 20px; letter-spacing: -0.01em; margin-bottom: 18px }
    .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 22px }
    .g-card { display: block; background: none; border: none; padding: 0; cursor: pointer; color: var(--text); font: inherit; text-align: left; transition: transform .15s ease }
    .g-card:hover { transform: translateY(-4px) }
    .g-thumb { display: block; width: 100%; border-radius: 14px; border: 1px solid var(--border); background: var(--panel); min-height: 280px }
    .g-card:hover .g-thumb { border-color: var(--accent) }
    .g-cap { display: flex; align-items: center; gap: 8px; margin-top: 9px; font-size: 13px; color: var(--muted); min-width: 0 }
    .g-elem { font-size: 15px; line-height: 1; flex: 0 0 auto }
    .g-name { font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
    .g-pow { font-variant-numeric: tabular-nums; margin-left: auto; flex: 0 0 auto }
    footer { color: var(--muted); font-size: 13px; margin-top: 56px; text-align: center }
    a { color: var(--accent) }
    @media (max-width: 720px) {
      .hero, #result { grid-template-columns: 1fr }
      h1 { font-size: 34px }
      .hero-card { max-width: 260px; margin: 4px auto 0 }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section id="hero" class="hero">
      <div class="hero-copy">
        <h1>Your GitHub,<br/>as a trading card.</h1>
        <p class="sub">devcard-ai reads your public GitHub activity and mints an AI Builder trading card — rarity frame, archetype, POWER. Summon yours in seconds.</p>
        <div class="row">
          <input id="username-input" placeholder="octocat" autocomplete="off" spellcheck="false" aria-label="GitHub username" />
          <button id="generate-button">Summon my card</button>
        </div>
        <p class="hint" id="input-hint"></p>
      </div>
      <img class="hero-card" src="/?user=sakimyto&theme=dark" alt="Example AI Builder Trading Card" loading="lazy" />
    </section>

    <section id="result" hidden>
      <img id="result-card" class="result-card" alt="Your AI Builder Trading Card" />
      <div class="steps-panel">
        <div class="step">
          <div class="step-h"><span class="step-n">1</span> Copy the markdown</div>
          <pre id="markdown-output"></pre>
          <button id="copy-button">Copy markdown</button>
        </div>
        <div class="step">
          <div class="step-h"><span class="step-n">2</span> Paste it into your GitHub profile README</div>
          <p class="step-body">Open your profile README and paste the snippet. No profile README yet? Create a repo named <code id="repo-hint">username/username</code> — a repo whose name matches your username surfaces its README on your profile. <a id="new-repo-link" target="_blank" rel="noopener" href="https://github.com/new">Create the repo →</a></p>
        </div>
        <div class="step">
          <div class="step-h"><span class="step-n">3</span> Share on X</div>
          <a id="share-x" target="_blank" rel="noopener"><button class="ghost">Share on X</button></a>
        </div>
      </div>
    </section>

    <section id="gallery" hidden>
      <h2 class="gallery-title">Recently summoned</h2>
      <div id="gallery-grid" class="gallery-grid"></div>
    </section>

    <footer>
      <a href="https://github.com/sakimyto/devcard-ai">GitHub</a> · MIT · stats from public repos, last 12 weeks
    </footer>
  </div>
  <script>
    const RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/
    // element id → colored glyph. Mirrors src/analyzers/element.ts (display-only).
    const ELEMENTS = {
      bolt: { glyph: '↯', color: '#f0b429' },
      lumen: { glyph: '✦', color: '#a371f7' },
      tide: { glyph: '∿', color: '#58a6ff' },
      gale: { glyph: '➶', color: '#3fb950' },
      terra: { glyph: '◈', color: '#2ea88f' },
      blaze: { glyph: '✸', color: '#f4652f' },
    }
    const input = document.getElementById('username-input')
    const hint = document.getElementById('input-hint')
    const result = document.getElementById('result')
    const resultCard = document.getElementById('result-card')
    const output = document.getElementById('markdown-output')
    const copyBtn = document.getElementById('copy-button')
    const shareX = document.getElementById('share-x')
    const repoHint = document.getElementById('repo-hint')
    const newRepoLink = document.getElementById('new-repo-link')
    const base = location.origin

    function summon() {
      const u = input.value.trim()
      if (!RE.test(u)) { hint.textContent = 'Enter a valid GitHub username.'; input.focus(); return }
      hint.textContent = ''
      const cardUrl = base + '/?user=' + encodeURIComponent(u) + '&theme=dark'
      // リンク先は /#username — LP に着地しつつ持ち主を引き継ぎ、着地側で自動召喚する
      const md = '[![AI Builder Trading Card](' + cardUrl + ')](' + base + '/#' + encodeURIComponent(u) + ')'
      output.textContent = md
      resultCard.src = cardUrl
      repoHint.textContent = u + '/' + u
      newRepoLink.href = 'https://github.com/new?name=' + encodeURIComponent(u)
      shareX.href = 'https://twitter.com/intent/tweet?text=' +
        encodeURIComponent('Summoned my AI Builder Trading Card 🃏 ' + base + '/#' + u + ' #devcardai')
      result.hidden = false
      result.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    document.getElementById('generate-button').addEventListener('click', summon)
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') summon() })
    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(output.textContent)
      copyBtn.textContent = 'Copied!'
      setTimeout(() => { copyBtn.textContent = 'Copy markdown' }, 1500)
    })

    // Recently summoned gallery. User-controlled strings are rendered via textContent /
    // createElement only — never innerHTML — and avatar URLs are encodeURIComponent'd.
    function buildGalleryCard(entry) {
      const card = document.createElement('button')
      card.type = 'button'
      card.className = 'g-card'
      const elem = ELEMENTS[entry.element] || null
      if (typeof entry.epithet === 'string' && entry.epithet) card.title = entry.epithet

      // 実カード SVG をそのままサムネイルとして並べる（S ティアのホロも動く）。
      // エッジ/KV キャッシュ済みの URL なので一覧表示のコストは軽い
      const img = document.createElement('img')
      img.className = 'g-thumb'
      img.loading = 'lazy'
      img.alt = '@' + entry.user + ' card'
      img.src = '/?user=' + encodeURIComponent(entry.user) + '&theme=dark'
      if (elem) img.style.borderColor = elem.color + '66' // same-element visual resonance
      card.appendChild(img)

      const cap = document.createElement('div')
      cap.className = 'g-cap'
      if (elem) {
        const glyph = document.createElement('span')
        glyph.className = 'g-elem'
        glyph.style.color = elem.color
        glyph.textContent = elem.glyph
        cap.appendChild(glyph)
      }
      const name = document.createElement('span')
      name.className = 'g-name'
      name.textContent = '@' + entry.user
      cap.appendChild(name)
      if (typeof entry.power === 'number') {
        const pow = document.createElement('span')
        pow.className = 'g-pow'
        pow.textContent = entry.power.toLocaleString()
        cap.appendChild(pow)
      }
      card.appendChild(cap)

      card.addEventListener('click', () => {
        input.value = entry.user
        location.hash = encodeURIComponent(entry.user)
        summon()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
      return card
    }

    async function loadGallery() {
      try {
        const res = await fetch('/api/gallery')
        if (!res.ok) return
        const entries = await res.json()
        if (!Array.isArray(entries) || entries.length === 0) return
        const grid = document.getElementById('gallery-grid')
        for (const entry of entries) {
          if (!entry || typeof entry.user !== 'string' || !RE.test(entry.user)) continue
          grid.appendChild(buildGalleryCard(entry))
        }
        if (grid.children.length > 0) document.getElementById('gallery').hidden = false
      } catch (_e) {
        // ギャラリーはベストエフォート。失敗しても LP 本体は動く
      }
    }

    // 事前入力: バッジ/シェアリンク経由の /#username を最優先、次に ?user=（保険）
    const fromHash = location.hash.length > 1 ? decodeURIComponent(location.hash.slice(1)) : ''
    const fromQuery = new URLSearchParams(location.search).get('user')
    const prefill = RE.test(fromHash) ? fromHash : (fromQuery && RE.test(fromQuery) ? fromQuery : '')
    if (prefill) { input.value = prefill; summon() }

    loadGallery()
  </script>
</body>
</html>`
}
