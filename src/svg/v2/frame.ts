import type { Grade } from '~/analyzers/types'

// Diagonal 5-stop metal gradients: light top-left → dark → light → highlight → dark.
// The extra stops give the band a rolled-metal sheen instead of a flat wash.
const METAL_STOPS: Record<'A' | 'B' | 'C' | 'D', [string, string, string, string, string]> = {
  A: ['#6b4e0e', '#f5d76e', '#8a6a1a', '#ffe9a8', '#6b4e0e'],
  B: ['#5c636b', '#eef2f6', '#8a939e', '#ffffff', '#6b7280'],
  C: ['#5a3418', '#e0955e', '#7a4a1f', '#f2b183', '#5a3418'],
  D: ['#3d434b', '#8b929b', '#4a5058', '#a6adb6', '#3d434b'],
}

// Darker rim drawn just outside the metal band for a printed-edge depth.
const EDGE_DARK: Record<Grade, string> = {
  S: '#3a1d6e',
  A: '#4a3607',
  B: '#3d434b',
  C: '#3d2410',
  D: '#22262c',
}

function metalGradientDef(grade: 'A' | 'B' | 'C' | 'D'): string {
  const [s0, s1, s2, s3, s4] = METAL_STOPS[grade]
  return `<linearGradient id="metal${grade}" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="${s0}" />
<stop offset="28%" stop-color="${s1}" />
<stop offset="52%" stop-color="${s2}" />
<stop offset="76%" stop-color="${s3}" />
<stop offset="100%" stop-color="${s4}" />
</linearGradient>`
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

export function renderFrame(grade: Grade, w: number, h: number): { defs: string; frame: string } {
  if (grade === 'S') {
    const defs = `<linearGradient id="holoGrad" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="#ff6ec7" />
<stop offset="30%" stop-color="#ffc36e" />
<stop offset="60%" stop-color="#6ef3ff" />
<stop offset="100%" stop-color="#a06eff" />
<animateTransform attributeName="gradientTransform" type="rotate" from="0 0.5 0.5" to="360 0.5 0.5" dur="8s" repeatCount="indefinite" />
</linearGradient>
<linearGradient id="shineGrad" x1="0" y1="0" x2="1" y2="0">
<stop offset="0%" stop-color="#ffffff" stop-opacity="0" />
<stop offset="50%" stop-color="#ffffff" stop-opacity="0.35" />
<stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
</linearGradient>
<clipPath id="frameClip"><rect x="0" y="0" width="${w}" height="${h}" rx="36" /></clipPath>
<filter id="holoFoil" x="0%" y="0%" width="100%" height="100%">
<feTurbulence type="turbulence" baseFrequency="0.85" numOctaves="2" seed="11" result="noise" />
<feColorMatrix in="noise" type="saturate" values="7" result="sat" />
<feComposite in="sat" in2="SourceAlpha" operator="in" />
</filter>`
    // Base bevel band (animated rainbow) + a turbulence foil speckle clipped to the band
    // shape (real feTurbulence, seed-fixed) for the iridescent print-foil texture.
    const foil = `<rect x="11" y="11" width="${w - 22}" height="${h - 22}" rx="26" fill="none" stroke="#ffffff" stroke-width="7" filter="url(#holoFoil)" opacity="0.4" />`
    const frame = `${beveledFrame(w, h, 'url(#holoGrad)', EDGE_DARK.S, 7)}
${foil}
<g clip-path="url(#frameClip)">
<rect x="-260" y="0" width="200" height="${h}" fill="url(#shineGrad)" transform="skewX(-18)">
<animate attributeName="x" from="-260" to="${w + 260}" dur="5s" repeatCount="indefinite" />
</rect>
</g>`
    return { defs, frame }
  }

  const defs = metalGradientDef(grade)
  const bandWidth = grade === 'D' ? 6 : 7
  const frame = beveledFrame(w, h, `url(#metal${grade})`, EDGE_DARK[grade], bandWidth)
  return { defs, frame }
}

export const TIER_GEM_COLORS: Record<Grade, string> = {
  S: '#a06eff',
  A: '#b8860b',
  B: '#8a939e',
  C: '#cd7f32',
  D: '#6e7681',
}

// Jewel gradient stops per tier: light facet → base → deep shadow.
export const TIER_GEM_GRADIENT: Record<Grade, [string, string, string]> = {
  S: ['#c9a3ff', '#a06eff', '#7a4fd6'],
  A: ['#f5d76e', '#b8860b', '#7a5a08'],
  B: ['#d8dee6', '#8a939e', '#5c636b'],
  C: ['#e8a06e', '#cd7f32', '#8a5420'],
  D: ['#9aa0a8', '#6e7681', '#4a5058'],
}
