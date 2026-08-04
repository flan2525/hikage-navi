import type { Bounds, EnvironmentalLayerManifest, EnvironmentalLayerMetadata, EnvironmentalLayerType, SatelliteDistributionStats } from '../types'
import { decodeInt16LittleEndian, type DecodedSatelliteGrid } from '../lib/satelliteGrid'

export type SatelliteLayerId = 'none' | 'landsat-lst-20260723-v1' | 'sentinel2-ndvi-20260724-v1'
export type SatelliteSelection = SatelliteLayerId
export const satelliteLayerOptions: Array<{ id: SatelliteSelection; label: string; description: string }> = [
  { id: 'none', label: '衛星なし', description: '衛星レイヤーを表示しません。' },
  { id: 'landsat-lst-20260723-v1', label: '地表面温度', description: 'Landsat 9の観測値' },
  { id: 'sentinel2-ndvi-20260724-v1', label: '植生（NDVI）', description: 'Sentinel-2の植生・緑被の傾向' },
]

function isBounds(value: unknown): value is Bounds { return Array.isArray(value) && value.length === 4 && value.every((item) => typeof item === 'number' && Number.isFinite(item)) && value[0] < value[2] && value[1] < value[3] }
function isLayerType(value: unknown): value is EnvironmentalLayerType { return value === 'land-surface-temperature' || value === 'ndvi' }
function isDistributionStats(value: unknown): value is SatelliteDistributionStats {
  if (!value || typeof value !== 'object') return false
  const stats = value as Partial<SatelliteDistributionStats>
  return ['p10', 'p25', 'p50', 'p75', 'p90', 'p98', 'actualMin', 'actualMax', 'displayMin', 'displayMax'].every((key) => typeof stats[key as keyof SatelliteDistributionStats] === 'number' && Number.isFinite(stats[key as keyof SatelliteDistributionStats] as number))
}
function isNumericGrid(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const grid = value as Record<string, unknown>
  return typeof grid.dataUrl === 'string' && grid.dataType === 'Int16' && grid.byteOrder === 'little-endian' && typeof grid.scale === 'number' && typeof grid.offset === 'number' && typeof grid.noData === 'number' && typeof grid.width === 'number' && typeof grid.height === 'number' && isBounds(grid.bounds) && grid.crs === 'EPSG:4326' && grid.rowOrder === 'north-to-south' && typeof grid.cellSizeMeters === 'number' && typeof grid.nativeResolutionMeters === 'number' && typeof grid.displayResolutionMeters === 'number' && typeof grid.validPixelRatio === 'number'
}
export function validateEnvironmentalLayerMetadata(value: unknown): value is EnvironmentalLayerMetadata {
  if (!value || typeof value !== 'object') return false
  const layer = value as Partial<EnvironmentalLayerMetadata>
  return typeof layer.id === 'string' && isLayerType(layer.type) && typeof layer.label === 'string' && typeof layer.observedAt === 'string' && typeof layer.source === 'string' && typeof layer.acquisitionPath === 'string' && typeof layer.processingSummary === 'string' && typeof layer.satellite === 'string' && typeof layer.sensor === 'string' && typeof layer.product === 'string' && isBounds(layer.bounds) && typeof layer.resolutionMeters === 'number' && Array.isArray(layer.colorStops) && layer.colorStops.length >= 2 && layer.colorStops.every((stop) => Array.isArray(stop) && stop.length === 2 && typeof stop[0] === 'number' && typeof stop[1] === 'string') && typeof layer.imageUrl === 'string' && typeof layer.sourceUrl === 'string' && typeof layer.attribution === 'string' && typeof layer.version === 'string' && Array.isArray(layer.limitations) && layer.limitations.every((item) => typeof item === 'string') && isNumericGrid(layer.numericGrid) && isDistributionStats(layer.statistics)
}
export function validateEnvironmentalManifest(value: unknown): value is EnvironmentalLayerManifest {
  if (!value || typeof value !== 'object') return false
  const manifest = value as Partial<EnvironmentalLayerManifest>
  return typeof manifest.generatedAt === 'string' && !!manifest.target && isBounds(manifest.target.bounds) && Array.isArray(manifest.layers) && manifest.layers.length >= 2 && manifest.layers.every(validateEnvironmentalLayerMetadata)
}
let metadataPromise: Promise<EnvironmentalLayerManifest> | null = null
const gridPromises = new Map<string, Promise<DecodedSatelliteGrid>>()

function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => { signal.removeEventListener('abort', onAbort); reject(new DOMException('Aborted', 'AbortError')) }
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then((value) => { signal.removeEventListener('abort', onAbort); resolve(value) }, (error) => { signal.removeEventListener('abort', onAbort); reject(error) })
  })
}

function loadSatelliteMetadata(): Promise<EnvironmentalLayerManifest> {
  if (!metadataPromise) {
    metadataPromise = fetch('/data/satellite/metadata.json', { cache: 'no-cache' }).then(async (response) => {
      if (!response.ok) throw new Error(`衛星メタデータを取得できませんでした（${response.status}）`)
      const value: unknown = await response.json()
      if (!validateEnvironmentalManifest(value)) throw new Error('衛星メタデータの形式が不正です')
      return value
    }).catch((error) => { metadataPromise = null; throw error })
  }
  return metadataPromise
}

export function fetchSatelliteMetadata(signal?: AbortSignal): Promise<EnvironmentalLayerManifest> { return abortable(loadSatelliteMetadata(), signal) }

function loadSatelliteGrid(layer: EnvironmentalLayerMetadata): Promise<DecodedSatelliteGrid> {
  const { dataUrl, width, height } = layer.numericGrid
  const existing = gridPromises.get(dataUrl)
  if (existing) return existing
  const promise = fetch(dataUrl, { cache: 'force-cache' }).then(async (response) => {
    if (!response.ok) throw new Error(`${layer.label}の数値グリッドを取得できませんでした（${response.status}）`)
    return decodeInt16LittleEndian(await response.arrayBuffer(), width, height)
  }).then((values) => ({ metadata: layer.numericGrid, values })).catch((error) => { gridPromises.delete(dataUrl); throw error })
  gridPromises.set(dataUrl, promise)
  return promise
}

export function fetchSatelliteGrid(layer: EnvironmentalLayerMetadata, signal?: AbortSignal): Promise<DecodedSatelliteGrid> { return abortable(loadSatelliteGrid(layer), signal) }
export function clearSatelliteCachesForTests() { metadataPromise = null; gridPromises.clear() }
export function layerForSelection(manifest: EnvironmentalLayerManifest | null, selection: SatelliteSelection): EnvironmentalLayerMetadata | undefined { return selection === 'none' ? undefined : manifest?.layers.find((layer) => layer.id === selection) }
