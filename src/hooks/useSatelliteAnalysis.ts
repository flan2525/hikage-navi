import { useCallback, useEffect, useMemo, useState } from 'react'
import { analyzeSatelliteRoutes } from '../lib/satelliteAnalysis'
import { fetchSatelliteGrid, fetchSatelliteMetadata } from '../services/satellite'
import type { Resource } from './useAsyncResource'
import type { RoutePlan, SatelliteAnalysisResult, ShadeResult } from '../types'

export function useSatelliteAnalysis(enabled: boolean, routes: RoutePlan[], shadeResults: Record<string, ShadeResult>): Resource<SatelliteAnalysisResult> {
  const [version, setVersion] = useState(0)
  const [data, setData] = useState<SatelliteAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reload = useCallback(() => setVersion((current) => current + 1), [])
  const routeSignature = useMemo(() => routes.map((route) => `${route.id}:${route.coordinates.length}:${shadeResults[route.id]?.points.length ?? 0}`).join('|'), [routes, shadeResults])

  useEffect(() => {
    if (!enabled || !routes.length || !routeSignature) {
      setLoading(false)
      return undefined
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    const startedAt = performance.now()
    fetchSatelliteMetadata(controller.signal).then(async (manifest) => {
      const lstLayer = manifest.layers.find((layer) => layer.type === 'land-surface-temperature')
      const ndviLayer = manifest.layers.find((layer) => layer.type === 'ndvi')
      if (!lstLayer || !ndviLayer) throw new Error('衛星数値グリッドの定義が不足しています')
      const gridStartedAt = performance.now()
      const [lstGrid, ndviGrid] = await Promise.all([fetchSatelliteGrid(lstLayer, controller.signal), fetchSatelliteGrid(ndviLayer, controller.signal)])
      const gridLoadMilliseconds = performance.now() - gridStartedAt
      const gridBytes = lstLayer.numericGrid.width * lstLayer.numericGrid.height * 2 + ndviLayer.numericGrid.width * ndviLayer.numericGrid.height * 2
      return analyzeSatelliteRoutes(routes, shadeResults, lstGrid, ndviGrid, lstLayer.statistics, { lst: lstLayer.observedAt, ndvi: ndviLayer.observedAt }, gridLoadMilliseconds, gridBytes)
    }).then((result) => {
      if (!controller.signal.aborted) setData({ ...result, totalAnalysisMilliseconds: performance.now() - startedAt })
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : '衛星経路分析に失敗しました')
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [enabled, routeSignature, version])

  return { data, loading, error, reload }
}
