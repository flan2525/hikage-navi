import type { Bounds, EnvironmentalLayerManifest, EnvironmentalLayerMetadata, EnvironmentalLayerType } from '../types'

export type SatelliteLayerId = 'none' | 'landsat-lst-20260723-v1' | 'sentinel2-ndvi-20260724-v1'
export type SatelliteSelection = SatelliteLayerId
export const satelliteLayerOptions: Array<{ id: SatelliteSelection; label: string; description: string }> = [
  { id: 'none', label: '衛星なし', description: '衛星レイヤーを表示しません。' },
  { id: 'landsat-lst-20260723-v1', label: '地表面温度', description: 'Landsat 9の観測値' },
  { id: 'sentinel2-ndvi-20260724-v1', label: '植生（NDVI）', description: 'Sentinel-2の植生・緑被の傾向' },
]

function isBounds(value: unknown): value is Bounds { return Array.isArray(value) && value.length === 4 && value.every((item) => typeof item === 'number' && Number.isFinite(item)) && value[0] < value[2] && value[1] < value[3] }
function isLayerType(value: unknown): value is EnvironmentalLayerType { return value === 'land-surface-temperature' || value === 'ndvi' }
export function validateEnvironmentalLayerMetadata(value: unknown): value is EnvironmentalLayerMetadata {
  if (!value || typeof value !== 'object') return false
  const layer = value as Partial<EnvironmentalLayerMetadata>
  return typeof layer.id === 'string' && isLayerType(layer.type) && typeof layer.label === 'string' && typeof layer.observedAt === 'string' && typeof layer.source === 'string' && typeof layer.satellite === 'string' && typeof layer.sensor === 'string' && typeof layer.product === 'string' && isBounds(layer.bounds) && typeof layer.resolutionMeters === 'number' && Array.isArray(layer.colorStops) && layer.colorStops.length >= 2 && layer.colorStops.every((stop) => Array.isArray(stop) && stop.length === 2 && typeof stop[0] === 'number' && typeof stop[1] === 'string') && typeof layer.imageUrl === 'string' && typeof layer.sourceUrl === 'string' && typeof layer.attribution === 'string' && typeof layer.version === 'string' && Array.isArray(layer.limitations) && layer.limitations.every((item) => typeof item === 'string')
}
export function validateEnvironmentalManifest(value: unknown): value is EnvironmentalLayerManifest {
  if (!value || typeof value !== 'object') return false
  const manifest = value as Partial<EnvironmentalLayerManifest>
  return typeof manifest.generatedAt === 'string' && !!manifest.target && isBounds(manifest.target.bounds) && Array.isArray(manifest.layers) && manifest.layers.length >= 2 && manifest.layers.every(validateEnvironmentalLayerMetadata)
}
export async function fetchSatelliteMetadata(signal?: AbortSignal): Promise<EnvironmentalLayerManifest> {
  const response = await fetch('/data/satellite/metadata.json', { signal, cache: 'no-cache' })
  if (!response.ok) throw new Error(`衛星メタデータを取得できませんでした（${response.status}）`)
  const value: unknown = await response.json()
  if (!validateEnvironmentalManifest(value)) throw new Error('衛星メタデータの形式が不正です')
  return value
}
export function layerForSelection(manifest: EnvironmentalLayerManifest | null, selection: SatelliteSelection): EnvironmentalLayerMetadata | undefined { return selection === 'none' ? undefined : manifest?.layers.find((layer) => layer.id === selection) }
