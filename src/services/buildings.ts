import type { Building, BuildingData, BuildingDataMetadata, Position } from '../types'

type RawFeature = { properties?: Record<string, unknown>; geometry?: { type?: string; coordinates?: unknown } }
type RawCollection = { type?: string; features?: RawFeature[] }

function isPosition(value: unknown): value is [number, number] { return Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number' && Number.isFinite(value[0]) && Number.isFinite(value[1]) }

function toBuilding(feature: RawFeature): Building | null {
  const ring = Array.isArray(feature.geometry?.coordinates) && Array.isArray(feature.geometry.coordinates[0]) ? feature.geometry.coordinates[0] : null
  const properties = feature.properties ?? {}
  const height = Number(properties.height)
  if (feature.geometry?.type !== 'Polygon' || !ring || !Number.isFinite(height) || height <= 0) return null
  const footprint = ring.filter(isPosition).map(([lng, lat]): Position => ({ lng, lat }))
  if (footprint.length < 4) return null
  footprint.pop()
  if (footprint.length < 3) return null
  return {
    id: String(properties.id ?? ''), heightMeters: height, footprint, source: String(properties.source ?? 'PLATEAU'), isSample: false,
    heightSource: properties.heightSource === 'geometry_z_range' ? 'geometry_z_range' : 'measuredHeight',
    dataYear: Number(properties.dataYear), lod: Number(properties.lod), usage: typeof properties.usage === 'string' ? properties.usage : null,
  }
}

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`建物データを読み込めません（${response.status}）`)
  return response.json() as Promise<T>
}

export async function fetchPlateauBuildings(signal: AbortSignal): Promise<BuildingData> {
  const [collection, metadata] = await Promise.all([
    getJson<RawCollection>('/data/plateau/hiroshima-central-buildings.geojson', signal),
    getJson<BuildingDataMetadata>('/data/plateau/hiroshima-central-buildings.meta.json', signal),
  ])
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) throw new Error('建物GeoJSONの形式が不正です')
  const buildings = collection.features.map(toBuilding).filter((building): building is Building => building !== null)
  if (buildings.length === 0) throw new Error('日陰計算に使える建物がありません')
  return { buildings, metadata }
}
