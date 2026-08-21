import { type GlowStyle, HOLO_STOPS } from '~/card/customization'

export interface FrameOptions {
  animated?: boolean
}

export interface RenderedFrame {
  defs: string
  frame: string
  // このフレームが確立したアクセント塗り。holo のように defs 側の id を指す場合が
  // あるので、呼び出し側が id を名指しせずに済むよう返す。null = 専用の塗りなし
  // （呼び出し側が自分の既定色を使う）。
  accentPaint: string | null
}

// soft / neon / holo に共通する外周ハロー。太さ・不透明度・ぼかしだけが違う。
function haloRect(
  w: number,
  h: number,
  stroke: string,
  strokeWidth: number,
  opacity: number,
  filterId: string,
  inner = '',
): string {
  const open = `<rect x="12" y="12" width="${w - 24}" height="${h - 24}" rx="25" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-opacity="${opacity}" filter="url(#${filterId})"`
  return inner ? `${open}>${inner}</rect>` : `${open} />`
}

// ラスタ経路（/og の PNG 化）用のハロー。feGaussianBlur は resvg の実測で描画コストの
// 9割を占め、1200x630 では soft/neon が none の10倍かかる。共有画像は縮小して見られるので、
// 不透明度を落とした同心ストロークを重ねてぼかしを近似し、フィルタ自体を出さない。
function staticHalo(w: number, h: number, stroke: string, layers: [number, number][]): string {
  return layers
    .map(
      ([strokeWidth, opacity]) =>
        `<rect x="12" y="12" width="${w - 24}" height="${h - 24}" rx="25" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-opacity="${opacity}" />`,
    )
    .join('\n')
}

function blurFilter(id: string, stdDeviation: number, margin: number): string {
  return `<filter id="${id}" x="-${margin}%" y="-${margin}%" width="${100 + margin * 2}%" height="${100 + margin * 2}%">
<feGaussianBlur stdDeviation="${stdDeviation}" />
</filter>`
}

// Stacks the frame as four concentric strokes (outer dark rim → metal/holo band →
// inner shadow line → inner highlight line) plus a top-edge sheen, so the border
// reads as an embossed metal bezel rather than a single flat stroke.
function beveledFrame(
  w: number,
  h: number,
  bandPaint: string,
  edgeDark: string,
  bandWidth: number,
): string {
  const rect = (inset: number, rx: number, stroke: string, sw: number, extra = ''): string =>
    `<rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}" rx="${rx}" fill="none" stroke="${stroke}" stroke-width="${sw}"${extra ? ` ${extra}` : ''} />`
  return `${rect(7, 30, edgeDark, 1.5)}
${rect(11, 26, bandPaint, bandWidth)}
${rect(15, 22, '#000000', 1, 'stroke-opacity="0.35"')}
${rect(16.5, 21, '#ffffff', 1, 'stroke-opacity="0.5"')}
<line x1="46" y1="9" x2="${w - 46}" y2="9" stroke="#ffffff" stroke-opacity="0.3" stroke-width="1" />`
}

export function renderFrame(
  glow: GlowStyle,
  w: number,
  h: number,
  accent: string,
  options: FrameOptions = {},
): RenderedFrame {
  const animated = options.animated ?? true

  if (glow === 'none') {
    // ハローを持たない唯一のスタイル。beveledFrame より薄い独自の3段ベゼルで、
    // 意図的に別ジオメトリ（インセット 8/12/15）。統合すると見た目が変わる。
    const frame = `<rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="29" fill="none" stroke="#000000" stroke-opacity="0.45" stroke-width="1.5" />
<rect x="12" y="12" width="${w - 24}" height="${h - 24}" rx="25" fill="none" stroke="${accent}" stroke-opacity="0.72" stroke-width="2.5" />
<rect x="15" y="15" width="${w - 30}" height="${h - 30}" rx="22" fill="none" stroke="#ffffff" stroke-opacity="0.24" stroke-width="1" />`
    return { defs: '', frame, accentPaint: null }
  }

  if (glow === 'soft') {
    const defs = animated ? blurFilter('frameSoftGlow', 5, 20) : ''
    const halo = animated
      ? haloRect(w, h, accent, 8, 0.28, 'frameSoftGlow')
      : staticHalo(w, h, accent, [
          [16, 0.07],
          [12, 0.12],
          [8, 0.2],
        ])
    return {
      defs,
      frame: `${halo}\n${beveledFrame(w, h, accent, '#000000', 7)}`,
      accentPaint: accent,
    }
  }

  if (glow === 'neon') {
    const neonBand = `<linearGradient id="neonBand" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="${accent}" />
<stop offset="50%" stop-color="#ffffff" />
<stop offset="100%" stop-color="${accent}" />
</linearGradient>`
    const defs = animated ? `${neonBand}\n${blurFilter('frameNeonGlow', 9, 30)}` : neonBand
    const pulse = animated
      ? '<animate attributeName="stroke-opacity" values="0.38;0.78;0.38" dur="3.2s" repeatCount="indefinite" />'
      : ''
    const halo = animated
      ? haloRect(w, h, accent, 11, 0.58, 'frameNeonGlow', pulse)
      : staticHalo(w, h, accent, [
          [22, 0.1],
          [16, 0.18],
          [11, 0.3],
        ])
    return {
      defs,
      frame: `${halo}\n${beveledFrame(w, h, 'url(#neonBand)', '#000000', 7)}`,
      accentPaint: accent,
    }
  }

  const rotation = animated
    ? '<animateTransform attributeName="gradientTransform" type="rotate" from="0 0.5 0.5" to="360 0.5 0.5" dur="8s" repeatCount="indefinite" />'
    : ''
  // foil（feTurbulence）は resvg で最も高価なプリミティブ。ラスタ経路（/og の PNG 化）は
  // リクエスト毎に走るので、アニメーションを落とす場面では foil も一緒に落とす。
  const holoDefs = [
    `<linearGradient id="holoGrad" x1="0" y1="0" x2="1" y2="1">
${HOLO_STOPS.map((s) => `<stop offset="${s.offset}%" stop-color="${s.color}" />`).join('\n')}
${rotation}
</linearGradient>`,
  ]
  if (animated) {
    holoDefs.push(`<linearGradient id="shineGrad" x1="0" y1="0" x2="1" y2="0">
<stop offset="0%" stop-color="#ffffff" stop-opacity="0" />
<stop offset="50%" stop-color="#ffffff" stop-opacity="0.35" />
<stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
</linearGradient>
<clipPath id="frameClip"><rect x="0" y="0" width="${w}" height="${h}" rx="36" /></clipPath>
<filter id="holoFoil" x="0%" y="0%" width="100%" height="100%">
<feTurbulence type="turbulence" baseFrequency="0.85" numOctaves="2" seed="11" result="noise" />
<feColorMatrix in="noise" type="saturate" values="7" result="sat" />
<feComposite in="sat" in2="SourceAlpha" operator="in" />
</filter>`)
  }
  const foil = animated
    ? `<rect x="11" y="11" width="${w - 22}" height="${h - 22}" rx="26" fill="none" stroke="#ffffff" stroke-width="7" filter="url(#holoFoil)" opacity="0.4" />`
    : ''
  const sweep = animated
    ? `<g clip-path="url(#frameClip)">
<rect x="-260" y="0" width="200" height="${h}" fill="url(#shineGrad)" transform="skewX(-18)">
<animate attributeName="x" from="-260" to="${w + 260}" dur="5s" repeatCount="indefinite" />
</rect>
</g>`
    : ''
  return {
    defs: holoDefs.join('\n'),
    frame: [beveledFrame(w, h, 'url(#holoGrad)', '#3a1d6e', 7), foil, sweep].join('\n'),
    accentPaint: 'url(#holoGrad)',
  }
}
