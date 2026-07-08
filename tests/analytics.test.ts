import { describe, expect, it, vi } from 'vitest'
import { recordRender } from '~/analytics'

describe('recordRender', () => {
  it('writes one data point with user index and blobs', () => {
    const writeDataPoint = vi.fn()
    recordRender({ writeDataPoint } as unknown as AnalyticsEngineDataset, {
      user: 'sakimyto',
      theme: 'dark',
      kind: 'ok',
      cacheState: 'fresh',
    })
    expect(writeDataPoint).toHaveBeenCalledWith({
      blobs: ['sakimyto', 'dark', 'ok', 'fresh'],
      indexes: ['sakimyto'],
    })
  })

  it('no-ops when dataset undefined and swallows write errors', () => {
    expect(() =>
      recordRender(undefined, { user: 'u', theme: 'l', kind: 'ok', cacheState: 'miss' }),
    ).not.toThrow()
    const throwing = {
      writeDataPoint: () => {
        throw new Error('boom')
      },
    } as unknown as AnalyticsEngineDataset
    expect(() =>
      recordRender(throwing, { user: 'u', theme: 'l', kind: 'ok', cacheState: 'miss' }),
    ).not.toThrow()
  })
})
