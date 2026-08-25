import { describe, expect, it } from 'vitest'
import { CARD_THEMES, DEFAULT_GLOW, DEFAULT_THEME, GLOW_STYLES } from '~/card/customization'
import { PREVIEW_USER, renderLandingPage } from '~/landing'
import { themes } from '~/svg/themes'

describe('renderLandingPage v3', () => {
  const html = renderLandingPage()

  it('has trading-card concept copy and title', () => {
    expect(html).toContain('AI Builder Trading Card')
    expect(html).toContain('PullCard AI')
    expect(html).toContain('Your GitHub,')
    expect(html).not.toContain('rarity frame')
  })

  it('keeps username input, markdown output, copy and share ids', () => {
    expect(html).toContain('id="username-input"')
    expect(html).toContain('id="markdown-output"')
    expect(html).toContain('id="copy-button"')
    expect(html).toContain('id="share-x"')
  })

  it('places the input and Summon button inside the hero first-view (before result/gallery)', () => {
    const heroIdx = html.indexOf('id="hero"')
    const inputIdx = html.indexOf('id="username-input"')
    const buttonIdx = html.indexOf('id="generate-button"')
    const resultIdx = html.indexOf('id="result"')
    const galleryIdx = html.indexOf('id="gallery"')
    expect(heroIdx).toBeGreaterThan(-1)
    expect(inputIdx).toBeGreaterThan(heroIdx)
    expect(buttonIdx).toBeGreaterThan(heroIdx)
    // input/button come before the result and gallery sections
    expect(inputIdx).toBeLessThan(resultIdx)
    expect(buttonIdx).toBeLessThan(resultIdx)
    expect(resultIdx).toBeLessThan(galleryIdx)
  })

  it('keeps the result panel hidden on load (ID display rule cannot beat [hidden])', () => {
    // #result{display:grid} は UA の [hidden]{display:none} に勝つため明示ガードが要る
    expect(html).toContain('id="result" hidden')
    expect(html).toContain('#result[hidden] { display: none }')
  })

  it('fetches /api/gallery and lines up the actual card SVGs as thumbnails', () => {
    expect(html).toContain("fetch('/api/gallery')")
    // ギャラリーは実カード（自ドメインの SVG）を並べる。本人が選んだ見た目で描く
    expect(html).toContain('cardPath(entry.user, entryTheme, entryGlow)')
    expect(html).toContain('g-thumb')
  })

  it('renders usernames without innerHTML (XSS-safe: textContent/createElement only)', () => {
    // 防御的アサート: user 由来の値を innerHTML に連結していないこと
    expect(html).not.toMatch(/innerHTML[^\n]*\buser/)
    expect(html).not.toMatch(/innerHTML[^\n]*\bentry/)
    expect(html).toContain('createElement')
    expect(html).toContain('.textContent')
  })

  it('has the step 2 profile-README guidance with a create-repo hint', () => {
    expect(html).toContain('profile README')
    expect(html).toContain('username/username')
    expect(html).toContain('github.com/new')
  })

  it('offers keyboard-accessible theme and glow choices before summoning', () => {
    expect(html).toContain('<fieldset class="choice-set">')
    expect(html).toContain('<legend>Theme</legend>')
    expect(html).toContain('<legend>Glow</legend>')
    expect(html).toContain('name="card-theme"')
    expect(html).toContain('name="card-glow"')
    for (const glow of ['none', 'soft', 'neon', 'holo']) {
      expect(html).toContain(`name="card-glow" value="${glow}"`)
    }
    expect(html).toContain('input:focus-visible + .choice-ui')
  })

  it('preserves appearance in the card, markdown destination, and share URL', () => {
    expect(html).toContain(
      "function cardPath(u, theme = selected('card-theme'), glow = selected('card-glow'))",
    )
    expect(html).toContain("'/?theme=' + selected('card-theme') + '&glow=' + selected('card-glow')")
    expect(html).toContain("applyAppearance(query.get('theme'), query.get('glow'))")
  })

  it('reads prefill client-side with the GitHub login regex (no server interpolation)', () => {
    expect(html).toContain('const query = new URLSearchParams(location.search)')
    expect(html).toContain("const fromQuery = query.get('user')")
    // バッジのリンク先は /#username（LP ルーティングを通しつつ持ち主を引き継ぐ）
    expect(html).toContain('location.hash')
    expect(html).toContain("'#' + encodeURIComponent(u)")
    expect(html).toContain('^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$')
    // サーバー側でユーザー入力を埋め込んでいないことの防御的確認
    expect(html).not.toContain('${user')
  })

  it('LP は選択肢を配色表から生成する（テーマを足したのに選べない、が起きない）', () => {
    const html = renderLandingPage()
    for (const theme of CARD_THEMES) {
      expect(html).toContain(`name="card-theme" value="${theme}"`)
      expect(html).toContain(themes[theme].label)
    }
    for (const glow of GLOW_STYLES) {
      expect(html).toContain(`name="card-glow" value="${glow}"`)
    }
    // クライアント側の許可リストもサーバの一覧と一致していること
    expect(html).toContain(JSON.stringify(CARD_THEMES))
    expect(html).toContain(JSON.stringify(GLOW_STYLES))
  })

  it('ヒーローのカードは初期表示からチェック済みの選択と一致している', () => {
    const html = renderLandingPage()
    // src と data-shown が既定の組み合わせで揃っていること。ここがずれると
    // 「選ばれている色」と「見えているカード」が食い違い、しかも既にチェック済みの
    // 選択肢は click しても change が飛ばないので直しようがない
    const expected = `/?user=${PREVIEW_USER}&amp;theme=${DEFAULT_THEME}&amp;glow=${DEFAULT_GLOW}&amp;preview=1`
    expect(html).toContain(`id="hero-card" class="hero-card" src="${expected}"`)
    expect(html).toContain(`data-shown="${expected}"`)
  })

  it('見た目を選ぶと、召喚前でもプレビューが切り替わる', () => {
    const html = renderLandingPage()
    // 召喚済みかどうかで早期 return していた頃は、テーマを選んでも何も起きなかった
    expect(html).not.toMatch(/if \(result\.hidden[^\n]*return/)
    // 文字は即時、画像取得だけデバウンスの内側
    expect(html).toMatch(
      /change', \(\) => \{\s*paintAppearance\(\)[\s\S]*?setTimeout\(\(\) => \{\s*swapImage\(heroCard/,
    )
    // ラジオを間接的に動かす経路も必ずプレビューを追従させる
    expect(html).toContain('function applyAppearance(theme, glow)')
    expect(html).toContain('syncPreview()')
  })

  it('ページ上の2枚のカードは同じ差し替え規則を通る（切り替え中に空白を挟まない）', () => {
    const html = renderLandingPage()
    // src を直接書き換えると画像が届くまでカードが消える。裏で読んでから差し替える
    expect(html).toContain('swapImage(heroCard')
    expect(html).toContain('swapImage(resultCard')
    // 旧・結果カード専用の重複実装が残っていないこと
    expect(html).not.toContain('loadedSrc')
    // ただし別人を召喚したときは前の人のカードを残さない（自分のカードだと誤読される）
    expect(html).toContain("swapImage(resultCard, cardPath(u), shown.get('user') === u)")
    expect(html).toContain('.hero-card.loading, .result-card.loading { opacity: .5 }')
  })

  it('ヒーローの見本取得はギャラリーに記録させない印を付ける', () => {
    const html = renderLandingPage()
    // 訪問者が外観を切り替えるたびに飛ぶ取得。召喚として数えると誰でも
    // 見本ユーザーのギャラリー行を書き換えられる
    expect(html).toContain("return cardPath(PREVIEW_USER) + '&preview=1'")
    expect(html).toContain('swapImage(heroCard, previewPath())')
  })

  it('カード URL の綴りは1箇所（cardPath）に集約されている', () => {
    const html = renderLandingPage()
    const occurrences = html.match(/'\/\?user=' \+/g) ?? []
    expect(occurrences).toHaveLength(1)
  })

  it('初期選択は URL パラメータ省略時の既定と一致する', () => {
    const html = renderLandingPage()
    expect(html).toContain(`name="card-theme" value="${DEFAULT_THEME}" checked`)
    expect(html).toContain(`name="card-glow" value="${DEFAULT_GLOW}" checked`)
    // checked は各グループ1つだけ
    expect(html.match(/name="card-theme"[^>]*checked/g)).toHaveLength(1)
    expect(html.match(/name="card-glow"[^>]*checked/g)).toHaveLength(1)
  })
})
