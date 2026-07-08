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

const NODE_COUNT = 10
const MARGIN = 24

export function renderArt(opts: ArtOptions): string {
  const rand = mulberry32(opts.seed)
  const w = opts.width
  const h = opts.height

  const nodes: { x: number; y: number; r: number }[] = []
  for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push({
      x: Math.round((MARGIN + rand() * (w - MARGIN * 2)) * 10) / 10,
      y: Math.round((MARGIN + rand() * (h - MARGIN * 2)) * 10) / 10,
      r: Math.round((1.5 + rand() * 3.5) * 10) / 10,
    })
  }

  const edges: string[] = []
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1]
    const b = nodes[i]
    const mx = (a.x + b.x) / 2 + (rand() - 0.5) * 60
    const my = (a.y + b.y) / 2 + (rand() - 0.5) * 60
    edges.push(
      `<path d="M ${a.x} ${a.y} Q ${Math.round(mx * 10) / 10} ${Math.round(my * 10) / 10} ${b.x} ${b.y}" fill="none" stroke="${opts.accent}" stroke-opacity="0.35" stroke-width="1" />`,
    )
  }

  const dots = nodes.map(
    (n, i) =>
      `<circle cx="${n.x}" cy="${n.y}" r="${n.r}" fill="${opts.accent}" fill-opacity="${i % 3 === 0 ? 0.9 : 0.55}" />`,
  )

  const rings = nodes
    .filter((_, i) => i % 4 === 0)
    .map(
      (n) =>
        `<circle cx="${n.x}" cy="${n.y}" r="${n.r + 6}" fill="none" stroke="${opts.accent}" stroke-opacity="0.3" stroke-width="1" />`,
    )

  return `<g>
<rect x="0" y="0" width="${w}" height="${h}" fill="${opts.bg}" />
${edges.join('\n')}
${rings.join('\n')}
${dots.join('\n')}
</g>`
}
