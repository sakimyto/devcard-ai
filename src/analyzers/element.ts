import type { StatsAnalysis } from './types'

export interface ElementResult {
  id: string
  label: string
  color: string
}

// One element per radar axis. argmax over the six 0-100 stats; ties break by table
// order (top wins), so this list's order is load-bearing — do not reorder.
const ELEMENTS: { axis: keyof StatsAnalysis; id: string; label: string; color: string }[] = [
  { axis: 'velocity', id: 'bolt', label: 'Bolt', color: '#f0b429' },
  { axis: 'synergy', id: 'lumen', label: 'Lumen', color: '#a371f7' },
  { axis: 'consistency', id: 'tide', label: 'Tide', color: '#58a6ff' },
  { axis: 'flow', id: 'gale', label: 'Gale', color: '#3fb950' },
  { axis: 'range', id: 'terra', label: 'Terra', color: '#2ea88f' },
  { axis: 'diversity', id: 'blaze', label: 'Blaze', color: '#f4652f' },
]

export function analyzeElement(stats: StatsAnalysis): ElementResult {
  let best = ELEMENTS[0]
  let bestValue = stats[ELEMENTS[0].axis]
  for (const e of ELEMENTS) {
    const v = stats[e.axis]
    // Strict `>` keeps the first (higher-priority) axis on ties.
    if (v > bestValue) {
      best = e
      bestValue = v
    }
  }
  return { id: best.id, label: best.label, color: best.color }
}
