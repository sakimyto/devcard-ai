import type { GlowStyle } from '~/card/customization'

export interface FrameOptions {
  animated?: boolean
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
): { defs: string; frame: string } {
  const animated = options.animated ?? true

  if (glow === 'none') {
    const frame = `<rect x="8" y="8" width="${w - 16}" height="${h - 16}" rx="29" fill="none" stroke="#000000" stroke-opacity="0.45" stroke-width="1.5" />
<rect x="12" y="12" width="${w - 24}" height="${h - 24}" rx="25" fill="none" stroke="${accent}" stroke-opacity="0.72" stroke-width="2.5" />
<rect x="15" y="15" width="${w - 30}" height="${h - 30}" rx="22" fill="none" stroke="#ffffff" stroke-opacity="0.24" stroke-width="1" />`
    return { defs: '', frame }
  }

  if (glow === 'soft') {
    const defs = `<filter id="frameSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
<feGaussianBlur stdDeviation="5" />
</filter>`
    const halo = `<rect x="12" y="12" width="${w - 24}" height="${h - 24}" rx="25" fill="none" stroke="${accent}" stroke-width="8" stroke-opacity="0.28" filter="url(#frameSoftGlow)" />`
    return { defs, frame: `${halo}\n${beveledFrame(w, h, accent, '#000000', 7)}` }
  }

  if (glow === 'neon') {
    const defs = `<linearGradient id="neonBand" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="${accent}" />
<stop offset="50%" stop-color="#ffffff" />
<stop offset="100%" stop-color="${accent}" />
</linearGradient>
<filter id="frameNeonGlow" x="-30%" y="-30%" width="160%" height="160%">
<feGaussianBlur stdDeviation="9" />
</filter>`
    const pulse = animated
      ? '<animate attributeName="stroke-opacity" values="0.38;0.78;0.38" dur="3.2s" repeatCount="indefinite" />'
      : ''
    const halo = `<rect x="12" y="12" width="${w - 24}" height="${h - 24}" rx="25" fill="none" stroke="${accent}" stroke-width="11" stroke-opacity="0.58" filter="url(#frameNeonGlow)">${pulse}</rect>`
    return { defs, frame: `${halo}\n${beveledFrame(w, h, 'url(#neonBand)', '#000000', 7)}` }
  }

  const rotation = animated
    ? '<animateTransform attributeName="gradientTransform" type="rotate" from="0 0.5 0.5" to="360 0.5 0.5" dur="8s" repeatCount="indefinite" />'
    : ''
  const defs = `<linearGradient id="holoGrad" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="#ff6ec7" />
<stop offset="30%" stop-color="#ffc36e" />
<stop offset="60%" stop-color="#6ef3ff" />
<stop offset="100%" stop-color="#a06eff" />
${rotation}
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
  const foil = `<rect x="11" y="11" width="${w - 22}" height="${h - 22}" rx="26" fill="none" stroke="#ffffff" stroke-width="7" filter="url(#holoFoil)" opacity="0.4" />`
  const sweep = animated
    ? `<g clip-path="url(#frameClip)">
<rect x="-260" y="0" width="200" height="${h}" fill="url(#shineGrad)" transform="skewX(-18)">
<animate attributeName="x" from="-260" to="${w + 260}" dur="5s" repeatCount="indefinite" />
</rect>
</g>`
    : ''
  return {
    defs,
    frame: `${beveledFrame(w, h, 'url(#holoGrad)', '#3a1d6e', 7)}\n${foil}\n${sweep}`,
  }
}
