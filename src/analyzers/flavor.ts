import type { PatternType } from './types'

export interface FlavorInput {
  pattern: PatternType
  topToolName: string | null
  consistency: number
}

const TEMPLATES: Record<PatternType, string> = {
  'AI Native': 'Fully fused with {tool} — ships at machine speed.',
  'Pair Programmer': 'Trades keystrokes with {tool}, line for line.',
  Delegator: 'Points the way. {tool} does the heavy lifting.',
  'Selective User': 'Calls on {tool} only when it counts.',
}

export function flavorText(input: FlavorInput): string {
  const tool = input.topToolName ?? 'AI'
  const base = TEMPLATES[input.pattern].replace('{tool}', tool)
  return input.consistency >= 75 ? `Never misses a week. ${base}` : base
}
