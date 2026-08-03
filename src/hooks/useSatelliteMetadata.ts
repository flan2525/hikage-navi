import { useCallback, useEffect, useState } from 'react'
import { fetchSatelliteMetadata } from '../services/satellite'
import type { EnvironmentalLayerManifest } from '../types'
import type { Resource } from './useAsyncResource'
import type { SatelliteSelection } from '../services/satellite'

export function useSatelliteMetadata(selection: SatelliteSelection): Resource<EnvironmentalLayerManifest> {
  const [version, setVersion] = useState(0)
  const [data, setData] = useState<EnvironmentalLayerManifest | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reload = useCallback(() => setVersion((current) => current + 1), [])
  useEffect(() => {
    if (selection === 'none') { setLoading(false); setError(null); return undefined }
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetchSatelliteMetadata(controller.signal).then((value) => { if (!controller.signal.aborted) setData(value) }).catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : '衛星データの読み込みに失敗しました') }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [selection, version])
  return { data, loading, error, reload }
}
