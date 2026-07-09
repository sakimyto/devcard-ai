import type { StatsAnalysis } from './types'

// Internal 4-axis code → epithet name. The letter codes are an implementation detail and
// are NEVER displayed (MBTI-style codes were explicitly rejected); only the name ships.
// Record<> forces all 16 combinations to be present at compile time.
type BuilderCode =
  | 'AFSW'
  | 'AFSN'
  | 'AFRW'
  | 'AFRN'
  | 'ADSW'
  | 'ADSN'
  | 'ADRW'
  | 'ADRN'
  | 'HFSW'
  | 'HFSN'
  | 'HFRW'
  | 'HFRN'
  | 'HDSW'
  | 'HDSN'
  | 'HDRW'
  | 'HDRN'

const EPITHETS: Record<BuilderCode, string> = {
  AFSW: 'The Symbiont',
  AFSN: 'The Duet',
  AFRW: 'The Stormrider',
  AFRN: 'The Spark',
  ADSW: 'The Overseer',
  ADSN: 'The Architect',
  ADRW: 'The Summoner',
  ADRN: 'The Catalyst',
  HFSW: 'The Artisan',
  HFSN: 'The Craftsman',
  HFRW: 'The Wanderer',
  HFRN: 'The Tinkerer',
  HDSW: 'The Strategist',
  HDSN: 'The Specialist',
  HDRW: 'The Maverick',
  HDRN: 'The Lone Wolf',
}

// Returns the display name only. The 4-axis code is computed and discarded internally.
export function analyzeBuilderType(stats: StatsAnalysis): string {
  // Top-tier override: exceptional synergy + velocity earns the 17th, apex name.
  if (stats.synergy >= 75 && stats.velocity >= 60) return 'The Ascendant'

  const a = stats.synergy >= 50 ? 'A' : 'H'
  const f = stats.flow >= 40 ? 'F' : 'D'
  const s = stats.consistency >= 50 ? 'S' : 'R'
  const w = stats.range >= 50 ? 'W' : 'N'
  const code = `${a}${f}${s}${w}` as BuilderCode
  return EPITHETS[code]
}
