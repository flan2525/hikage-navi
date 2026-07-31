import { DESTINATION, START, fallbackRoutes } from '../data/hiroshima'
import { distanceMeters } from '../lib/geo'
import type { Position, RoutePlan } from '../types'
type OrsFeature = { geometry?: { coordinates?: number[][] }; properties?: { summary?: { distance?: number; duration?: number } } }
function mapFeature(feature: OrsFeature, index: number): RoutePlan | null { const coordinates = feature.geometry?.coordinates?.map(([lng, lat]) => ({ lng, lat })).filter((p) => Number.isFinite(p.lng) && Number.isFinite(p.lat)) ?? []; if (coordinates.length < 2) return null; const summary = feature.properties?.summary; return { id: `ors-${index}`, kind: index === 0 ? 'shortest' : 'shade', label: index === 0 ? '最短ルート' : '代替ルート', coordinates, distanceMeters: summary?.distance ?? 0, durationSeconds: summary?.duration ?? 0, source: 'api' } }
export async function fetchWalkingRoutes(start: Position = START, end: Position = DESTINATION, signal?: AbortSignal): Promise<RoutePlan[]> {
  const params = new URLSearchParams({ start: `${start.lng},${start.lat}`, end: `${end.lng},${end.lat}` }); const response = await fetch(`/api/routes?${params}`, { signal }); if (!response.ok) throw new Error(response.status === 503 ? 'ルーティングAPIは現在利用できません' : response.status === 429 ? 'ルーティングAPIが混雑しています' : response.status >= 500 ? 'ルーティングサービスで一時的な問題が発生しています' : '徒歩経路を取得できませんでした')
  const json = await response.json() as { features?: OrsFeature[] }; const routes = (json.features ?? []).map(mapFeature).filter((route): route is RoutePlan => route !== null); if (!routes.length) throw new Error('徒歩経路が空です'); return routes
}
function sampleRoutes(start: Position, end: Position): RoutePlan[] {
  const directDistance = distanceMeters(start, end)
  if (Math.abs(start.lng - 132.4753) < .002 && Math.abs(end.lng - 132.4537) < .002) return fallbackRoutes
  const middle: Position = { lng: (start.lng + end.lng) / 2, lat: (start.lat + end.lat) / 2 }
  const shadeMiddle: Position = { lng: middle.lng + (end.lat - start.lat) * .09, lat: middle.lat - (end.lng - start.lng) * .09 }
  return [
    { id: `sample-shade-${start.lng}-${end.lng}`, kind: 'shade', label: '影渡り（実証用サンプル）', source: 'fallback', distanceMeters: directDistance * 1.12, durationSeconds: directDistance * 1.12 / 1.25, coordinates: [start, shadeMiddle, end] },
    { id: `sample-shortest-${start.lng}-${end.lng}`, kind: 'shortest', label: '最短（実証用サンプル）', source: 'fallback', distanceMeters: directDistance, durationSeconds: directDistance / 1.25, coordinates: [start, middle, end] },
  ]
}
export async function loadRoutes(start: Position = START, end: Position = DESTINATION, signal?: AbortSignal): Promise<{ routes: RoutePlan[]; isFallback: boolean; fallbackReason?: string }> { try { return { routes: await fetchWalkingRoutes(start, end, signal), isFallback: false } } catch (error) { return { routes: sampleRoutes(start, end), isFallback: true, fallbackReason: error instanceof Error ? error.message : '徒歩経路を取得できませんでした' } } }
