import type { Bounds, Building, BuildingData, BuildingDataMetadata, PlateauDataset, PlateauManifest, Position, RoutePlan } from '../types'

type RawFeature = { properties?: Record<string, unknown>; geometry?: { type?: string; coordinates?: unknown } }
type RawCollection = { type?: string; features?: RawFeature[] }

const jsonCache = new Map<string, Promise<unknown>>()
const collectionCache = new Map<string, RawCollection>()
const pairDatasetIds: Record<string, string[]> = {
  'hakushima:yokogawa': ['hakushima', 'yokogawa'],
  'nishi-hiroshima:yokogawa': ['yokogawa', 'nishi-hiroshima'],
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
export function routeBufferBounds(routes: RoutePlan[], bufferMeters = 250): Bounds[] {
  const coordinates = routes.flatMap((route) => route.coordinates)
  if (!coordinates.length) return []
  const minLng = Math.min(...coordinates.map((point) => point.lng)); const maxLng = Math.max(...coordinates.map((point) => point.lng)); const minLat = Math.min(...coordinates.map((point) => point.lat)); const maxLat = Math.max(...coordinates.map((point) => point.lat)); const centerLat = (minLat + maxLat) / 2
  return [[minLng - bufferMeters / (111_320 * Math.cos(centerLat * Math.PI / 180)), minLat - bufferMeters / 110_540, maxLng + bufferMeters / (111_320 * Math.cos(centerLat * Math.PI / 180)), maxLat + bufferMeters / 110_540]]
}
function routeBufferSegments(routes: RoutePlan[], bufferMeters = 250): Bounds[] {
  const output: Bounds[] = []
  for (const route of routes) for (let index = 1; index < route.coordinates.length; index += 1) {
    const a = route.coordinates[index - 1]; const b = route.coordinates[index]; const centerLat = (a.lat + b.lat) / 2
    const latDelta = bufferMeters / 110_540; const lngDelta = bufferMeters / (111_320 * Math.cos(centerLat * Math.PI / 180))
    output.push([Math.min(a.lng, b.lng) - lngDelta, Math.min(a.lat, b.lat) - latDelta, Math.max(a.lng, b.lng) + lngDelta, Math.max(a.lat, b.lat) + latDelta])
  }
  return output.length ? output : routeBufferBounds(routes, bufferMeters)
}
function boundsIntersect(a: Bounds, b: Bounds): boolean { return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1] }
function pointToSegmentMeters(point: Position, start: Position, end: Position): number {
  const scaleX = 111_320 * Math.cos(((start.lat + end.lat) / 2) * Math.PI / 180); const scaleY = 110_540
  const px = (point.lng - start.lng) * scaleX; const py = (point.lat - start.lat) * scaleY; const ex = (end.lng - start.lng) * scaleX; const ey = (end.lat - start.lat) * scaleY; const lengthSquared = ex * ex + ey * ey
  const t = lengthSquared ? Math.max(0, Math.min(1, (px * ex + py * ey) / lengthSquared)) : 0
  return Math.hypot(px - ex * t, py - ey * t)
}
function coverageIntersectsRoute(dataset: PlateauDataset, routes: RoutePlan[], routeSegments: Bounds[], bufferMeters: number): boolean {
  const cells = coverageBounds(dataset)
  return cells.some((cell) => {
    const center = { lng: (cell[0] + cell[2]) / 2, lat: (cell[1] + cell[3]) / 2 }; const cellPadding = Math.hypot((cell[2] - cell[0]) * 55_660, (cell[3] - cell[1]) * 55_270)
    return routeSegments.some((segment) => boundsIntersect(cell, segment)) && routes.some((route) => route.coordinates.some((point, index) => index > 0 && pointToSegmentMeters(center, route.coordinates[index - 1], point) <= bufferMeters + cellPadding))
  })
}
function coverageBounds(dataset: PlateauDataset): Bounds[] {
  if (!dataset.coverage) return [dataset.bounds]
  if (!dataset.coverage.coordinates.length) return []
  return dataset.coverage.coordinates.map((polygon) => {
    const ring = polygon[0] ?? []; const lngs = ring.map(([lng]) => lng); const lats = ring.map(([, lat]) => lat)
    return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)] as Bounds
  }).filter(([minLng, minLat, maxLng, maxLat]) => Number.isFinite(minLng) && minLng <= maxLng && minLat <= maxLat)
}
export function datasetCoverageBounds(dataset: PlateauDataset): Bounds[] { return coverageBounds(dataset) }
export function datasetIdsForRoute(initialIds: string[], routes: RoutePlan[], manifest: PlateauManifest, bufferMeters = 250): string[] {
  const routeBounds = routeBufferBounds(routes, bufferMeters); const routeSegments = routeBufferSegments(routes, bufferMeters)
  const intersecting = manifest.datasets.filter((dataset) => {
    if (initialIds.includes(dataset.id) || !routeBounds.length) return false
    if (!routeBounds.some((bounds) => boundsIntersect(dataset.bounds, bounds))) return false
    return coverageIntersectsRoute(dataset, routes, routeSegments, dataset.supplemental ? 0 : bufferMeters)
  }).map((dataset) => dataset.id)
  return [...new Set([...initialIds, ...intersecting])]
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
  return loadPlateauDatasets(datasetIds, manifest, signal)
}
export async function fetchPlateauBuildingsForRoutes(initialDatasetIds: string[], routes: RoutePlan[], signal?: AbortSignal, bufferMeters = 250): Promise<BuildingData> {
  const manifest = await fetchPlateauManifest(signal)
  return loadPlateauDatasets(datasetIdsForRoute(initialDatasetIds, routes, manifest, bufferMeters), manifest, signal)
}
async function loadPlateauDatasets(datasetIds: string[], manifest: PlateauManifest, signal?: AbortSignal): Promise<BuildingData> {
  const startedAt = performance.now()
  const requested = [...new Set(datasetIds)]
  const datasets = requested.map((id) => manifest.datasets.find((dataset) => dataset.id === id)).filter((dataset): dataset is PlateauDataset => Boolean(dataset))
  if (!datasets.length) throw new Error('選択経路に対応する建物データがありません')
  const datasetLoadStartedAt = performance.now()
  const loaded = await Promise.allSettled(datasets.map(async (dataset) => ({ dataset, collection: await loadCollection(dataset) })))
  const datasetLoadMilliseconds = performance.now() - datasetLoadStartedAt
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const successful = loaded.filter((result): result is PromiseFulfilledResult<{ dataset: PlateauDataset; collection: RawCollection }> => result.status === 'fulfilled').map((result) => result.value)
  const failedDatasetIds = loaded.flatMap((result, index) => result.status === 'rejected' ? [datasets[index].id] : [])
  if (!successful.length) throw new Error(`建物データを読み込めません（${failedDatasetIds.join('、')}）`)
  const parseStartedAt = performance.now(); const parsedBuildings: Building[] = []
  for (const { collection } of successful) for (const feature of collection.features ?? []) parsedBuildings.push(...toBuildings(feature))
  const parseMilliseconds = performance.now() - parseStartedAt
  const dedupeStartedAt = performance.now(); const buildingById = new Map<string, Building>(); let duplicateBuildingCount = 0
  for (const building of parsedBuildings) {
    if (buildingById.has(building.id)) { duplicateBuildingCount += 1; continue }
    buildingById.set(building.id, building)
  }
  const buildings = [...buildingById.values()]
  if (!buildings.length) throw new Error('日陰計算に使える建物がありません')
  const first = successful[0].dataset
  const metadata: BuildingDataMetadata = { cityName: '広島市', dataYear: first.dataYear, specification: '4.1', cityGmlVersion: '2.0', sourceCrs: 'EPSG:6697', outputCrs: 'EPSG:4326', buildingCount: buildings.length, geojsonBytes: successful.reduce((total, item) => total + item.dataset.fileSizeBytes, 0), target: { name: successful.map(({ dataset }) => dataset.label).join('・'), bbox: first.bounds, bufferMeters: 400 } }
  return { buildings, metadata, datasetIds: successful.map(({ dataset }) => dataset.id), failedDatasetIds, duplicateBuildingCount, coverageBounds: successful.map(({ dataset }) => dataset.bounds), coverageDisplayBounds: successful.flatMap(({ dataset }) => coverageBounds(dataset)), performance: { totalMilliseconds: performance.now() - startedAt, datasetLoadMilliseconds, parseMilliseconds, dedupeMilliseconds: performance.now() - dedupeStartedAt } }
}

export function resetBuildingCacheForTests() { jsonCache.clear(); collectionCache.clear() }
