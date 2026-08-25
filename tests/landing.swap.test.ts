import { beforeEach, describe, expect, it } from 'vitest'
import { renderLandingPage } from '~/landing'

// LP の中身はインライン <script> なので、文字列一致でしか検証できない――ではない。
// 配信されるページから当の関数を切り出して実行すれば、写しではなく本物の実装を
// 回せる。差し替えの状態機械（shown / pending / loading / keepPrevious の4分岐と
// 非同期の追い越し）は文字列一致では素通りする種類のバグを抱えるので、ここだけは
// 実際に動かして押さえる。
function extractFunction(html: string, signature: string): string {
  const start = html.indexOf(signature)
  if (start < 0) throw new Error(`${signature} が見つからない`)
  let depth = 0
  let i = html.indexOf('{', start)
  for (; i < html.length; i++) {
    if (html[i] === '{') depth++
    else if (html[i] === '}' && --depth === 0) break
  }
  return html.slice(start, i + 1)
}

interface FakeEl {
  dataset: Record<string, string | undefined>
  src: string
  fire: (type: string) => void
  isLoading: () => boolean
}

// 本物の <img> の代役。swapImage / trackShown が触る API だけを持つ
function fakeImg(shown?: string): FakeEl {
  const classes = new Set<string>()
  const listeners: Record<string, (() => void)[]> = {}
  const el = {
    dataset: {} as Record<string, string | undefined>,
    src: '',
    classList: {
      add: (c: string) => {
        classes.add(c)
      },
      remove: (c: string) => {
        classes.delete(c)
      },
    },
    addEventListener: (type: string, fn: () => void) => {
      const bucket = listeners[type] ?? []
      bucket.push(fn)
      listeners[type] = bucket
    },
    getAttribute: (name: string) => (name === 'src' ? el.src : null),
    fire: (type: string) => {
      for (const fn of listeners[type] ?? []) fn()
    },
    isLoading: () => classes.has('loading'),
  }
  if (shown !== undefined) el.dataset.shown = shown
  return el
}

// 裏で走らせる new Image() の代役。作られた順に控えて、load / error を任意に起こす
const preloads: FakePreload[] = []
class FakePreload {
  src = ''
  private listeners: Record<string, (() => void)[]> = {}
  constructor() {
    preloads.push(this)
  }
  addEventListener(type: string, fn: () => void) {
    const bucket = this.listeners[type] ?? []
    bucket.push(fn)
    this.listeners[type] = bucket
  }
  fire(type: string) {
    for (const fn of this.listeners[type] ?? []) fn()
  }
}

const html = renderLandingPage()
const sandbox = [
  extractFunction(html, 'function trackShown('),
  extractFunction(html, 'function swapImage('),
  'return { trackShown, swapImage }',
].join('\n')
const { trackShown, swapImage } = new Function('Image', sandbox)(FakePreload) as {
  trackShown: (el: unknown) => void
  swapImage: (el: unknown, url: string, keepPrevious?: boolean) => void
}

describe('swapImage（LP から切り出した実物）', () => {
  beforeEach(() => {
    preloads.length = 0
  })

  it('まだ何も出ていない要素は素通しで読ませる（空の枠に段階的に描かせる）', () => {
    const el = fakeImg()
    swapImage(el, '/a')
    expect(el.src).toBe('/a')
    expect(el.isLoading()).toBe(false)
    expect(preloads).toHaveLength(0)
  })

  it('前の絵がある要素は、裏で読み切ってから差し替える', () => {
    const el = fakeImg('/a')
    el.src = '/a'
    swapImage(el, '/b')
    expect(el.src).toBe('/a') // まだ差し替わらない
    expect(el.isLoading()).toBe(true)
    expect(preloads).toHaveLength(1)

    preloads[0].fire('load')
    expect(el.src).toBe('/b')
    expect(el.isLoading()).toBe(false)
  })

  it('裏の読み込みが失敗しても前の絵は消えず、同じ URL を再試行できる', () => {
    const el = fakeImg('/a')
    el.src = '/a'
    swapImage(el, '/b')
    preloads[0].fire('error')
    expect(el.src).toBe('/a')
    expect(el.isLoading()).toBe(false)
    expect(el.dataset.shown).toBe('/a') // 失敗した URL は「表示中」に昇格しない

    swapImage(el, '/b')
    expect(preloads).toHaveLength(2) // もう一度取りに行ける
  })

  // codex レビューで見つかった競合。A→B と選び、B の到着前に A へ戻すと、
  // 早期 return で pending が B のまま残り、遅れて着いた B が自分をまだ最新だと
  // 思って el.src = B を実行していた（ラジオは A なのに画像だけ B）
  it('表示中の見た目へ戻したら、飛んでいる差し替えは無効になる', () => {
    const el = fakeImg('/a')
    el.src = '/a'
    swapImage(el, '/b')
    expect(el.isLoading()).toBe(true)

    swapImage(el, '/a') // 表示中へ戻す
    expect(el.isLoading()).toBe(false) // 薄いまま取り残されない

    preloads[0].fire('load') // 遅れて B が届く
    expect(el.src).toBe('/a') // 追い越された応答は捨てられる
  })

  it('追い越された古い差し替えは、勝った側を上書きしない', () => {
    const el = fakeImg('/a')
    el.src = '/a'
    swapImage(el, '/b')
    swapImage(el, '/c')
    expect(preloads).toHaveLength(2)

    preloads[1].fire('load') // C が先に着く
    expect(el.src).toBe('/c')
    preloads[0].fire('load') // B が後から着く
    expect(el.src).toBe('/c')
  })

  it('keepPrevious=false は前の絵を残さない（別人の召喚）', () => {
    const el = fakeImg('/a')
    el.src = '/a'
    swapImage(el, '/b', false)
    expect(el.src).toBe('/b')
    expect(el.isLoading()).toBe(false)
    expect(preloads).toHaveLength(0)
  })

  it('trackShown は実際に描けた URL だけを「表示中」に記録する', () => {
    const el = fakeImg()
    trackShown(el)
    swapImage(el, '/a')
    expect(el.dataset.shown).toBeUndefined() // まだ描けていない
    el.fire('load')
    expect(el.dataset.shown).toBe('/a')

    // 読み込みに失敗したら記録を消す。同じ URL こそ再試行したい URL なので
    el.fire('error')
    expect(el.dataset.shown).toBeUndefined()
    swapImage(el, '/a')
    expect(el.src).toBe('/a')
  })
})
