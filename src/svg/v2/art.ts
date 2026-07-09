export interface ArtOptions {
  seed: number
  width: number
  height: number
  accent: string
  bg: string
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function r1(n: number): number {
  return Math.round(n * 10) / 10
}

const NODE_COUNT = 14
const MARGIN = 24

// Four-point star (rotated diamond pinched at the waist) used as a holo sparkle.
// Centered at (x, y); `s` is the arm length. Deterministic — no randomness inside.
export function sparklePath(x: number, y: number, s: number): string {
  const wst = s * 0.32 // waist half-width
  return `M ${r1(x)} ${r1(y - s)} L ${r1(x + wst)} ${r1(y - wst)} L ${r1(x + s)} ${r1(y)} L ${r1(x + wst)} ${r1(y + wst)} L ${r1(x)} ${r1(y + s)} L ${r1(x - wst)} ${r1(y + wst)} L ${r1(x - s)} ${r1(y)} L ${r1(x - wst)} ${r1(y - wst)} Z`
}

// S-tier holo sparkles over the art zone. Positions come from the same seeded PRNG
// family as the art (offset seed) so the layout is deterministic per card, and each
// star twinkles on a staggered <animate> cycle.
export function renderSparkles(
  seed: number,
  width: number,
  height: number,
  accent: string,
): string {
  const rand = mulberry32((seed ^ 0x9e3779b9) >>> 0)
  const count = 8
  const stars: string[] = []
  for (let i = 0; i < count; i++) {
    const x = MARGIN + rand() * (width - MARGIN * 2)
    const y = MARGIN + rand() * (height - MARGIN * 2)
    const s = 3 + rand() * 4
    const dur = (2.4 + rand() * 2).toFixed(1)
    const begin = (rand() * 2.5).toFixed(1)
    stars.push(
      `<path d="${sparklePath(x, y, s)}" fill="#ffffff" opacity="0.9"><animate attributeName="opacity" values="0;0.95;0.2;0.9;0" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" /></path>
<path d="${sparklePath(x, y, s * 0.5)}" fill="${accent}" opacity="0.7"><animate attributeName="opacity" values="0;0.7;0;0.7;0" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" /></path>`,
    )
  }
  return stars.join('\n')
}

export function renderArt(opts: ArtOptions): string {
  const rand = mulberry32(opts.seed)
  const w = opts.width
  const h = opts.height
  const cx = r1(w / 2)
  const cy = r1(h / 2)
  const glowR = r1(Math.min(w, h) * 0.62)

  const nodes: { x: number; y: number; r: number }[] = []
  for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push({
      x: r1(MARGIN + rand() * (w - MARGIN * 2)),
      y: r1(MARGIN + rand() * (h - MARGIN * 2)),
      r: r1(1.5 + rand() * 3.5),
    })
  }

  const edgeDs: string[] = []
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1]
    const b = nodes[i]
    const mx = r1((a.x + b.x) / 2 + (rand() - 0.5) * 60)
    const my = r1((a.y + b.y) / 2 + (rand() - 0.5) * 60)
    edgeDs.push(`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`)
  }
  // Blurred duplicate of the mesh, drawn under the crisp lines, reads as an accent halo.
  const edgeGlow = edgeDs
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="${opts.accent}" stroke-opacity="0.4" stroke-width="2.4" filter="url(#artEdgeGlow)" />`,
    )
    .join('\n')
  const edges = edgeDs
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="${opts.accent}" stroke-opacity="0.52" stroke-width="1.2" />`,
    )
    .join('\n')

  const dots = nodes.map(
    (n, i) =>
      `<circle cx="${n.x}" cy="${n.y}" r="${n.r}" fill="${opts.accent}" fill-opacity="${i % 3 === 0 ? 0.95 : 0.6}" />`,
  )

  const rings = nodes
    .filter((_, i) => i % 4 === 0)
    .map(
      (n) =>
        `<circle cx="${n.x}" cy="${n.y}" r="${r1(n.r + 6)}" fill="none" stroke="${opts.accent}" stroke-opacity="0.35" stroke-width="1" />`,
    )

  // L-shaped corner flares (TCG-style) at each corner of the art zone.
  const flareLen = 22
  const inset = 12
  const flare = (px: number, py: number, dx: number, dy: number): string =>
    `<path d="M ${r1(px + dx * flareLen)} ${py} L ${px} ${py} L ${px} ${r1(py + dy * flareLen)}" fill="none" stroke="${opts.accent}" stroke-opacity="0.5" stroke-width="1.5" stroke-linecap="round" />`
  const corners = [
    flare(inset, inset, 1, 1),
    flare(w - inset, inset, -1, 1),
    flare(inset, h - inset, 1, -1),
    flare(w - inset, h - inset, -1, -1),
  ].join('\n')

  const defs = `<linearGradient id="artVert" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="${opts.accent}" stop-opacity="0" />
<stop offset="100%" stop-color="${opts.accent}" stop-opacity="0.16" />
</linearGradient>
<radialGradient id="artGlow" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${glowR}">
<stop offset="0%" stop-color="${opts.accent}" stop-opacity="0.28" />
<stop offset="55%" stop-color="${opts.accent}" stop-opacity="0.07" />
<stop offset="100%" stop-color="${opts.accent}" stop-opacity="0" />
</radialGradient>
<radialGradient id="artVig" cx="0.5" cy="0.5" r="0.72">
<stop offset="55%" stop-color="#000000" stop-opacity="0" />
<stop offset="100%" stop-color="#000000" stop-opacity="0.22" />
</radialGradient>
<filter id="artEdgeGlow" x="-20%" y="-20%" width="140%" height="140%">
<feGaussianBlur stdDeviation="2.6" />
</filter>`

  return `<defs>${defs}</defs>
<g>
<rect x="0" y="0" width="${w}" height="${h}" fill="${opts.bg}" />
<rect x="0" y="0" width="${w}" height="${h}" fill="url(#artVert)" />
<rect x="0" y="0" width="${w}" height="${h}" fill="url(#artGlow)" />
${edgeGlow}
${edges}
${rings.join('\n')}
${dots.join('\n')}
<rect x="0" y="0" width="${w}" height="${h}" fill="url(#artVig)" />
${corners}
</g>`
}
