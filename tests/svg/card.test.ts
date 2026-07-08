import { describe, expect, it } from 'vitest'
import { renderErrorCard } from '~/svg/card'

describe('renderErrorCard', () => {
  it('renders user not found message', () => {
    const svg = renderErrorCard('User not found', 'light')
    expect(svg).toContain('<svg')
    expect(svg).toContain('User not found')
  })

  it('supports dark theme', () => {
    const svg = renderErrorCard('Error', 'dark')
    expect(svg).toContain('#0d1117')
  })
})
