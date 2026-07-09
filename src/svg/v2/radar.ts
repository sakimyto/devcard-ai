import type { Theme } from '../themes'
import { svgText } from '../utils'

// Rings drawn as concentric hexagons behind the value polygon.
const RING_FRACTIONS = [0.25, 0.5, 0.75, 1]

// Round every generated coordinate so golden snapshots stay byte-stable across
// platforms (Math.cos/sin are not guaranteed bit-identical, toFixed(2) hides drift).
function f(n: number): string {
  return n.toFixed(2)
}

// Axis i sits at -90° + i*60°, i.e. the first axis points straight up and the rest
// march clockwise. Caller passes exactly 6 values in axis order.
function angleOf(i: number): number {
  return -Math.PI / 2 + (i * Math.PI) / 3
}

function vertex(cx: number, cy: number, radius: number, i: number): [number, number] {
  const a = angleOf(i)
  return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)]
}

function polygonPoints(cx: number, cy: number, radius: number, count: number): string {
  const pts: string[] = []
  for (let i = 0; i < count; i++) {
    const [x, y] = vertex(cx, cy, radius, i)
    pts.push(`${f(x)},${f(y)}`)
  }
  return pts.join(' ')
}

// Renders a 6-axis radar centered at (cx, cy) with outer radius r. `values` holds the
// six axes in clockwise order starting from the top; each value is clamped to 0-100.
export function renderRadar(
  values: { label: string; value: number }[],
  cx: number,
  cy: number,
  r: number,
  theme: Theme,
): string {
  const n = values.length

  const rings = RING_FRACTIONS.map(
    (frac) =>
      `<polygon points="${polygonPoints(cx, cy, r * frac, n)}" fill="none" stroke="${theme.border}" stroke-width="1" />`,
  ).join('\n')

  const spokes = values
    .map((_, i) => {
      const [x, y] = vertex(cx, cy, r, i)
      return `<line x1="${f(cx)}" y1="${f(cy)}" x2="${f(x)}" y2="${f(y)}" stroke="${theme.border}" stroke-width="1" />`
    })
    .join('\n')

  const valuePts = values
    .map((v, i) => {
      const clamped = Math.max(0, Math.min(100, v.value))
      const [x, y] = vertex(cx, cy, (r * clamped) / 100, i)
      return `${f(x)},${f(y)}`
    })
    .join(' ')
  // Blurred duplicate of the value outline reads as an accent halo behind the crisp polygon.
  const valueGlow = `<polygon points="${valuePts}" fill="none" stroke="${theme.accent}" stroke-opacity="0.55" stroke-width="3" filter="url(#radarGlow)" />`
  const valuePolygon = `<polygon points="${valuePts}" fill="${theme.accent}" fill-opacity="0.25" stroke="${theme.accent}" stroke-width="2" />`

  const dots = values
    .map((v, i) => {
      const clamped = Math.max(0, Math.min(100, v.value))
      const [x, y] = vertex(cx, cy, (r * clamped) / 100, i)
      return `<circle cx="${f(x)}" cy="${f(y)}" r="3" fill="${theme.accent}" />`
    })
    .join('\n')

  const labels = values
    .map((v, i) => {
      const a = angleOf(i)
      const [lx, ly] = vertex(cx, cy, r + 16, i)
      const cos = Math.cos(a)
      // Anchor toward the card interior so labels never spill past the radar box:
      // top/bottom center, right side left-anchored, left side right-anchored.
      const anchor = Math.abs(cos) < 0.01 ? 'middle' : cos > 0 ? 'start' : 'end'
      // Nudge the baseline down a touch so text visually centers on the vertex.
      return svgText(Number(f(lx)), Number(f(ly + 5)), v.label, {
        fontSize: 14,
        fill: theme.textSecondary,
        anchor,
      })
    })
    .join('\n')

  const defs = `<defs><filter id="radarGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" /></filter></defs>`

  return `${defs}
${rings}
${spokes}
${valueGlow}
${valuePolygon}
${dots}
${labels}`
}
