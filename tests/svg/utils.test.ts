import { describe, expect, it } from 'vitest'
import { wrapText } from '~/svg/utils'

describe('wrapText', () => {
  it('wraps on word boundaries within maxChars', () => {
    const lines = wrapText('the quick brown fox jumps', 10, 3)
    expect(lines).toEqual(['the quick', 'brown fox', 'jumps'])
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(10)
  })

  it('truncates the last line with an ellipsis past maxLines', () => {
    const lines = wrapText('alpha beta gamma delta epsilon zeta', 6, 2)
    expect(lines).toHaveLength(2)
    expect(lines[1].endsWith('…')).toBe(true)
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(6)
  })

  it('hard-breaks a single token longer than maxChars', () => {
    const lines = wrapText('x'.repeat(100), 46, 2)
    expect(lines).toHaveLength(2)
    // Contract: no line may exceed maxChars, even for unbroken tokens.
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(46)
    expect(lines[1].endsWith('…')).toBe(true)
  })

  it('returns an empty array for blank input', () => {
    expect(wrapText('   ', 10, 2)).toEqual([])
  })
})
