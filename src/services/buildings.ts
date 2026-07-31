import type { Building, BuildingData, BuildingDataMetadata, PlateauDataset, PlateauManifest, Position } from '../types'

type RawFeature = { properties?: Record<string, unknown>; geometry?: { type?: string; coordinates?: unknown } }
type RawCollection = { type?: string; features?: RawFeature[] }

const jsonCache = new Map<string, Promise<unknown>>()
const collectionCache = new Map<string, RawCollection>()
const pairDatasetIds: Record<string, string[]> = {
  'hakushima:yokogawa': ['hakushima', 'yokogawa', 'corridor-shinhakushima-yokogawa'],
  'nishi-hiroshima:yokogawa': ['yokogawa', 'nishi-hiroshima', 'corridor-yokogawa-nishihiroshima'],
}

function isPosition(value: unknown): value is [number, number] { return Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number' && Number.isFinite(value[0]) && Number.isFinite(value[1]) }
function toFootprint(value: unknown): Position[] | null {
  if (!Array.isArray(value)) return null
  const footprint = value.filter(isPosition).map(([lng, lat]) => ({ lng, lat }))
  if (footprint.length < 4) return null
  footprint.pop()
  return footprint.length >= 3 ? footprint : null
}
function toBuildings(feature: RawFeature): Building[] {
  const properties = feature.properties ?? {}; const height = Number(properties.height)
  if (!Number.isFinite(height) || height <= 0) return []
  const rawPolygons = feature.geometry?.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry?.type === 'MultiPolygon' && Array.isArray(feature.geometry.coordinates) ? feature.geometry.coordinates : []
  return rawPolygons.map((polygon) => toFootprint(Array.isArray(polygon) ? polygon[0] : undefined)).filter((footprint): footprint is Position[] => footprint !== null).map((footprint, index) => ({
    id: `${String(properties.id ?? '')}${rawPolygons.length > 1 ? `:${index}` : ''}`, heightMeters: height, footprint, source: String(properties.source ?? 'PLATEAU'), isSample: false,
    heightSource: properties.heightSource === 'geometry_z_range' ? 'geometry_z_range' : 'measuredHeight', dataYear: Number(properties.dataYear), lod: Number(properties.lod), usage: typeof properties.usage === 'string' ? properties.usage : null,
  }))
}
async function getJson<T>(url: string): Promise<T> {
  const cached = jsonCache.get(url)
  if (cached) return cached as Promise<T>
  const request = fetch(url).then(async (response) => { if (!response.ok) throw new Error(`建物データを読み込めません（${response.status}）`); return response.json() })
  jsonCache.set(url, request)
  try { return await request as T } catch (error) { jsonCache.delete(url); throw error }
}
export async function fetchPlateauManifest(signal?: AbortSignal): Promise<PlateauManifest> {
  const manifest = await getJson<PlateauManifest>('/data/plateau/areas.json')
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  if (!Array.isArray(manifest.datasets)) throw new Error('建物データのマニフェスト形式が不正です')
  return manifest
}
export function datasetIdsForJourney(fromAreaId: string, toAreaId: string): string[] {
  if (fromAreaId === toAreaId) return [fromAreaId]
  const key = [fromAreaId, toAreaId].sort().join(':')
  return pairDatasetIds[key] ?? [...new Set([fromAreaId, toAreaId])]
}
async function loadCollection(dataset: PlateauDataset): Promise<RawCollection> {
  const cached = collectionCache.get(dataset.id); if (cached) return cached
  const collection = await getJson<RawCollection>(dataset.url)
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) throw new Error('建物GeoJSONの形式が不正です')
  collectionCache.set(dataset.id, collection)
  return collection
}
export async function fetchPlateauBuildings(datasetIds: string[], signal?: AbortSignal): Promise<BuildingData> {
  const manifest = await fetchPlateauManifest(signal)
  const requested = [...new Set(datasetIds)]
  const datasets = requested.map((id) => manifest.datasets.find((dataset) => dataset.id === id)).filter((dataset): dataset is PlateauDataset => Boolean(dataset))
  if (!datasets.length) throw new Error('選択経路に対応する建物データがありません')
  const loaded = await Promise.allSettled(datasets.map(async (dataset) => ({ dataset, collection: await loadCollection(dataset) })))
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const successful = loaded.filter((result): result is PromiseFulfilledResult<{ dataset: PlateauDataset; collection: RawCollection }> => result.status === 'fulfilled').map((result) => result.value)
  const failedDatasetIds = loaded.flatMap((result, index) => result.status === 'rejected' ? [datasets[index].id] : [])
  if (!successful.length) throw new Error(`建物データを読み込めません（${failedDatasetIds.join('、')}）`)
  const buildingById = new Map<string, Building>(); let duplicateBuildingCount = 0
  for (const { collection } of successful) for (const feature of collection.features ?? []) for (const building of toBuildings(feature)) {
    if (buildingById.has(building.id)) { duplicateBuildingCount += 1; continue }
    buildingById.set(building.id, building)
  }
  const buildings = [...buildingById.values()]
  if (!buildings.length) throw new Error('日陰計算に使える建物がありません')
  const first = successful[0].dataset
  const metadata: BuildingDataMetadata = { cityName: '広島市', dataYear: first.dataYear, specification: '4.1', cityGmlVersion: '2.0', sourceCrs: 'EPSG:6697', outputCrs: 'EPSG:4326', buildingCount: buildings.length, geojsonBytes: successful.reduce((total, item) => total + item.dataset.fileSizeBytes, 0), target: { name: successful.map(({ dataset }) => dataset.label).join('・'), bbox: first.bounds, bufferMeters: 400 } }
  return { buildings, metadata, datasetIds: successful.map(({ dataset }) => dataset.id), failedDatasetIds, duplicateBuildingCount, coverageBounds: successful.map(({ dataset }) => dataset.bounds) }
}

export function resetBuildingCacheForTests() { jsonCache.clear(); collectionCache.clear() }
