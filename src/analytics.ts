export interface RenderEvent {
  user: string
  theme: string
  kind: string
  cacheState: string
}

// 計測はベストエフォート。失敗してもレンダリングを止めない
export function recordRender(
  dataset: AnalyticsEngineDataset | undefined,
  e: RenderEvent,
): void {
  if (!dataset) return
  try {
    dataset.writeDataPoint({
      blobs: [e.user, e.theme, e.kind, e.cacheState],
      indexes: [e.user],
    })
  } catch (error) {
    console.error('analytics write failed:', error)
  }
}
