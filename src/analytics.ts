export interface RenderEvent {
  user: string
  theme: string
  glow: string
  kind: string
  cacheState: string
}

// 計測はベストエフォート。失敗してもレンダリングを止めない
export function recordRender(dataset: AnalyticsEngineDataset | undefined, e: RenderEvent): void {
  if (!dataset) return
  try {
    dataset.writeDataPoint({
      // Preserve the first four blob positions for existing dashboards; append customization.
      blobs: [e.user, e.theme, e.kind, e.cacheState, e.glow],
      indexes: [e.user],
    })
  } catch (error) {
    console.error('analytics write failed:', error)
  }
}
