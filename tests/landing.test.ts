import { describe, expect, it } from 'vitest'
import { renderLandingPage } from '~/landing'

describe('renderLandingPage v2', () => {
  const html = renderLandingPage()

  it('has trading-card concept copy and title', () => {
    expect(html).toContain('AI Builder Trading Card')
    expect(html).toContain('devcard-ai')
  })

  it('has username input, markdown snippet output and copy button', () => {
    expect(html).toContain('id="username-input"')
    expect(html).toContain('id="markdown-output"')
    expect(html).toContain('id="copy-button"')
    expect(html).toContain('id="share-x"')
  })

  it('reads prefill client-side with the GitHub login regex (no server interpolation)', () => {
    expect(html).toContain("new URLSearchParams(location.search).get('user')")
    // バッジのリンク先は /#username（LP ルーティングを通しつつ持ち主を引き継ぐ）
    expect(html).toContain('location.hash')
    expect(html).toContain("'/#' + encodeURIComponent(u)")
    expect(html).toContain('^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$')
    // サーバー側でユーザー入力を埋め込んでいないことの防御的確認
    expect(html).not.toContain('${user')
  })
})
