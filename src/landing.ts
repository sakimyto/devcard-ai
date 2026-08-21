import {
  CARD_THEMES,
  DEFAULT_GLOW,
  DEFAULT_THEME,
  GLOW_SPEC,
  GLOW_STYLES,
} from './card/customization'
import { themes } from './svg/themes'

// 属性値・スクリプト文脈へ差し込む値のエスケープ。入れる値は今はすべて配色表由来の
// ハードコードだが、「ハードコードだから安全」を無検査の前提として残さない。
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// インライン <script> の中に JSON を置くときは、値に </script> が現れた時点で
// スクリプトが閉じる。< をエスケープしておけば JSON としての意味は変わらない
function inlineJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

// ラジオ1件。選択肢の一覧は配色表と glow 表から生成するので、
// テーマや glow を足したときに LP 側の触り忘れが起きない。
function choiceRadio(
  name: string,
  value: string,
  label: string,
  swatchStyle: string,
  checked: boolean,
): string {
  return `<label class="choice"><input type="radio" name="${escapeAttr(name)}" value="${escapeAttr(value)}"${checked ? ' checked' : ''} /><span class="choice-ui"><i class="swatch" style="${escapeAttr(swatchStyle)}"></i>${escapeAttr(label)}</span></label>`
}

const THEME_CHOICES = CARD_THEMES.map((t) =>
  choiceRadio(
    'card-theme',
    t,
    themes[t].label,
    // 地色とアクセントを半分ずつ見せる。1粒でその配色の性格が分かる
    `background: linear-gradient(135deg, ${themes[t].bg} 0 50%, ${themes[t].accent} 50% 100%)`,
    t === DEFAULT_THEME,
  ),
).join('\n              ')

const GLOW_CHOICES = GLOW_STYLES.map((g) =>
  choiceRadio('card-glow', g, GLOW_SPEC[g].title, GLOW_SPEC[g].swatch, g === DEFAULT_GLOW),
).join('\n              ')

export function renderLandingPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PullCard AI — AI Builder Trading Card</title>
  <meta name="description" content="Your GitHub, as a customizable trading card. Pick your theme and glow, then add it to your README with one line of markdown." />
  <meta property="og:title" content="PullCard AI — AI Builder Trading Card" />
  <meta property="og:description" content="Your GitHub, as a trading card. Proof you ship with AI." />
  <style>
    :root { --bg: #0d1117; --panel: #161b22; --border: #30363d; --text: #c9d1d9; --muted: #8b949e; --accent: #a371f7 }
    * { margin: 0; padding: 0; box-sizing: border-box }
    body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6 }
    .wrap { max-width: 960px; margin: 0 auto; padding: 40px 24px 64px }
    h1 { font-size: 42px; line-height: 1.1; letter-spacing: -0.02em }
    .sub { color: var(--muted); font-size: 17px; margin: 14px 0 24px; max-width: min(46ch, 100%) }
    /* Hero: input + button live inside the first view, card demo alongside */
    .hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 320px); gap: 40px; align-items: center }
    .hero-copy { min-width: 0 }
    .hero-card { display: block; width: 100%; max-width: 320px; border-radius: 14px }
    .row { display: flex; gap: 8px; flex-wrap: wrap }
    input#username-input { flex: 1; min-width: 200px; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 12px 14px; border-radius: 8px; font-size: 16px }
    input#username-input:focus { outline: none; border-color: var(--accent) }
    button { background: var(--accent); border: 0; color: #fff; padding: 12px 20px; border-radius: 8px; font-size: 15px; cursor: pointer; font-weight: 600 }
    button.ghost { background: transparent; border: 1px solid var(--border); color: var(--text) }
    /* テーマは十数種あり横並びだと隣のカラムを押し出すので、選択肢は縦に積む */
    .customizer { display: grid; gap: 14px; margin: 20px 0; min-width: 0 }
    .choice-set { border: 0; min-width: 0 }
    .choice-set legend { color: var(--muted); font-size: 12px; font-weight: 600; letter-spacing: .08em; margin-bottom: 7px; text-transform: uppercase }
    .choices { display: flex; flex-wrap: wrap; gap: 7px }
    .choice { cursor: pointer; position: relative }
    .choice input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap }
    .choice-ui { align-items: center; background: var(--panel); border: 1px solid var(--border); border-radius: 999px; color: var(--muted); display: inline-flex; font-size: 13px; font-weight: 600; gap: 7px; min-height: 34px; padding: 6px 11px; transition: border-color .15s ease, color .15s ease, background .15s ease }
    .choice input:checked + .choice-ui { background: #211832; border-color: var(--accent); color: var(--text) }
    .choice input:focus-visible + .choice-ui { outline: 2px solid #fff; outline-offset: 2px }
    .swatch { border: 1px solid #ffffff40; border-radius: 50%; display: inline-block; height: 10px; width: 10px }
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
    .gallery-title { font-size: 20px; letter-spacing: -0.01em; margin-bottom: 6px }
    .gallery-note { color: var(--muted); font-size: 13px; margin-bottom: 18px; max-width: min(60ch, 100%) }
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
        <p class="sub">PullCard AI turns your public GitHub activity into an AI Builder trading card. Pick a look that feels like you, then summon it in seconds.</p>
        <div class="customizer" aria-label="Card appearance">
          <fieldset class="choice-set">
            <legend>Theme</legend>
            <div class="choices">
              ${THEME_CHOICES}
            </div>
          </fieldset>
          <fieldset class="choice-set">
            <legend>Glow</legend>
            <div class="choices">
              ${GLOW_CHOICES}
            </div>
          </fieldset>
        </div>
        <div class="row">
          <input id="username-input" placeholder="octocat" autocomplete="off" spellcheck="false" aria-label="GitHub username" />
          <button id="generate-button">Summon my card</button>
        </div>
        <p class="hint" id="input-hint"></p>
      </div>
      <img class="hero-card" src="/?user=sakimyto&theme=dark&glow=holo" alt="Example AI Builder Trading Card with a holographic glow" loading="lazy" />
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
      <p class="gallery-note">Opt-in only — you appear here after installing the <a href="https://github.com/apps/devcard-ai" target="_blank" rel="noopener">GitHub App</a> on your own account. Uninstall it and your card drops off on its own.</p>
      <div id="gallery-grid" class="gallery-grid"></div>
    </section>

    <footer>
      <a href="https://github.com/sakimyto/pullcard-ai">GitHub</a> · MIT · stats from public repos, last 12 weeks
    </footer>
  </div>
  <script>
    const RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/
    const THEMES = ${inlineJson(CARD_THEMES)}
    const GLOWS = ${inlineJson(GLOW_STYLES)}
    const DEFAULTS = ${inlineJson({ theme: DEFAULT_THEME, glow: DEFAULT_GLOW })}
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

    function selected(name) {
      return document.querySelector('input[name="' + name + '"]:checked').value
    }

    function setChoice(name, value, allowed) {
      if (!allowed.includes(value)) return
      const choice = document.querySelector('input[name="' + name + '"][value="' + value + '"]')
      if (choice) choice.checked = true
    }

    function cardUrlFor(u) {
      return base + '/?user=' + encodeURIComponent(u) + '&theme=' + selected('card-theme') + '&glow=' + selected('card-glow')
    }

    function shareUrlFor(u) {
      return base + '/?theme=' + selected('card-theme') + '&glow=' + selected('card-glow') + '#' + encodeURIComponent(u)
    }

    // 「同じ URL なら再代入しない」は、見た目を切り替えたときの無駄なリクエストを抑えるため。
    // ただし前回の読み込みが失敗していた場合は、同じ URL こそ再試行したい URL なので、
    // 成功したことが分かっている src だけを重複判定の対象にする
    let loadedSrc = null
    resultCard.addEventListener('load', () => { loadedSrc = resultCard.src })
    resultCard.addEventListener('error', () => { loadedSrc = null })

    function summon(shouldScroll = true) {
      const u = input.value.trim()
      if (!RE.test(u)) { hint.textContent = 'Enter a valid GitHub username.'; input.focus(); return }
      hint.textContent = ''
      const cardUrl = cardUrlFor(u)
      const shareUrl = shareUrlFor(u)
      const md = '[![AI Builder Trading Card](' + cardUrl + ')](' + shareUrl + ')'
      output.textContent = md
      if (loadedSrc !== cardUrl) resultCard.src = cardUrl
      repoHint.textContent = u + '/' + u
      newRepoLink.href = 'https://github.com/new?name=' + encodeURIComponent(u)
      shareX.href = 'https://twitter.com/intent/tweet?text=' +
        encodeURIComponent('Summoned my AI Builder Trading Card 🃏 ' + shareUrl + ' #pullcardai')
      result.hidden = false
      if (shouldScroll) result.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    document.getElementById('generate-button').addEventListener('click', () => summon())
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') summon() })
    // 見た目を次々に試す操作でカード生成が1クリック1本飛ぶのを抑える。
    // 落ち着いた時点の1本だけを撃つ
    let previewTimer = null
    for (const choice of document.querySelectorAll('input[name="card-theme"], input[name="card-glow"]')) {
      choice.addEventListener('change', () => {
        if (result.hidden || !RE.test(input.value.trim())) return
        clearTimeout(previewTimer)
        previewTimer = setTimeout(() => summon(false), 250)
      })
    }
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(output.textContent)
        copyBtn.textContent = 'Copied!'
      } catch (_e) {
        copyBtn.textContent = 'Select and copy above'
      }
      setTimeout(() => { copyBtn.textContent = 'Copy markdown' }, 1800)
    })

    // Recently summoned gallery. User-controlled strings are rendered via textContent /
    // createElement only — never innerHTML — and avatar URLs are encodeURIComponent'd.
    function buildGalleryCard(entry) {
      const card = document.createElement('button')
      card.type = 'button'
      card.className = 'g-card'
      const elem = ELEMENTS[entry.element] || null
      if (typeof entry.epithet === 'string' && entry.epithet) card.title = entry.epithet

      // 実カード SVG をそのまま並べ、本人が選んだテーマと発光を再現する。
      // エッジ/KV キャッシュ済みの URL なので一覧表示のコストは軽い
      const img = document.createElement('img')
      img.className = 'g-thumb'
      img.loading = 'lazy'
      img.alt = '@' + entry.user + ' card'
      const entryTheme = THEMES.includes(entry.theme) ? entry.theme : DEFAULTS.theme
      const entryGlow = GLOWS.includes(entry.glow) ? entry.glow : DEFAULTS.glow
      img.src = '/?user=' + encodeURIComponent(entry.user) + '&theme=' + entryTheme + '&glow=' + entryGlow
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
        setChoice('card-theme', entryTheme, THEMES)
        setChoice('card-glow', entryGlow, GLOWS)
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
    const query = new URLSearchParams(location.search)
    setChoice('card-theme', query.get('theme'), THEMES)
    setChoice('card-glow', query.get('glow'), GLOWS)
    const fromHash = location.hash.length > 1 ? decodeURIComponent(location.hash.slice(1)) : ''
    const fromQuery = query.get('user')
    const prefill = RE.test(fromHash) ? fromHash : (fromQuery && RE.test(fromQuery) ? fromQuery : '')
    if (prefill) { input.value = prefill; summon() }

    loadGallery()
  </script>
</body>
</html>`
}
