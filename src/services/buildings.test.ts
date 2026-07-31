import { afterEach, describe, expect, it, vi } from 'vitest'
import { datasetIdsForJourney, datasetIdsForRoute, fetchPlateauBuildings, fetchPlateauBuildingsForRoutes, resetBuildingCacheForTests, routeBufferBounds } from './buildings'
import type { RoutePlan } from '../types'

const feature = (id: string) => ({ type: 'Feature', properties: { id, height: 12, heightSource: 'measuredHeight', dataYear: 2024, lod: 2, source: 'PLATEAU' }, geometry: { type: 'Polygon', coordinates: [[[132.46, 34.39], [132.461, 34.39], [132.461, 34.391], [132.46, 34.39]]] } })
const manifest = { version: 1, source: 'test', datasets: [
  { id: 'hakushima', label: '白島', url: '/hakushima.geojson', areaIds: ['hakushima'], routeKeys: [], bounds: [132, 34, 133, 35] as [number, number, number, number], buildingCount: 1, dataYear: 2024, version: 'v1', fileSizeBytes: 1, source: 'test' },
  { id: 'yokogawa', label: '横川', url: '/yokogawa.geojson', areaIds: ['yokogawa'], routeKeys: [], bounds: [132, 34, 133, 35] as [number, number, number, number], buildingCount: 1, dataYear: 2024, version: 'v1', fileSizeBytes: 1, source: 'test' },
  { id: 'corridor-shinhakushima-yokogawa', label: '回廊', url: '/corridor.geojson', areaIds: ['hakushima', 'yokogawa'], routeKeys: [], bounds: [132, 34, 133, 35] as [number, number, number, number], buildingCount: 1, dataYear: 2024, version: 'v1', fileSizeBytes: 1, source: 'test' },
] }
const jsonResponse = (value: unknown) => ({ ok: true, json: async () => value })
const coverage = (minLng: number, minLat: number, maxLng: number, maxLat: number) => ({ type: 'MultiPolygon' as const, coordinates: [[[[minLng, minLat], [maxLng, minLat], [maxLng, maxLat], [minLng, maxLat], [minLng, minLat]]]] })
const coverageDataset = (id: string, bounds: [number, number, number, number], areaCoverage: ReturnType<typeof coverage>, supplemental = false) => ({ id, label: id, url: `/${id}.geojson`, areaIds: [id], routeKeys: [], bounds, coverage: areaCoverage, supplemental, buildingCount: 1, dataYear: 2024, version: 'v1', fileSizeBytes: 1, source: 'test' })
afterEach(() => { vi.restoreAllMocks(); resetBuildingCacheForTests() })

describe('PLATEAU building loader', () => {
  it('loads only the selected datasets and removes duplicate IDs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => Promise.resolve(url === '/data/plateau/areas.json' ? jsonResponse(manifest) : jsonResponse({ type: 'FeatureCollection', features: [feature('b1')] }))))
    const data = await fetchPlateauBuildings(['hakushima', 'yokogawa'])
    await fetchPlateauBuildings(['hakushima', 'yokogawa'])
    expect(data.buildings).toHaveLength(1); expect(data.duplicateBuildingCount).toBe(1)
    expect(fetch).toHaveBeenCalledTimes(3)
  })
  it('keeps successful datasets when another requested dataset fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => Promise.resolve(url === '/data/plateau/areas.json' ? jsonResponse(manifest) : url === '/yokogawa.geojson' ? { ok: false, status: 503 } : jsonResponse({ type: 'FeatureCollection', features: [feature('b1')] }))))
    const data = await fetchPlateauBuildings(['hakushima', 'yokogawa'])
    expect(data.buildings).toHaveLength(1); expect(data.failedDatasetIds).toEqual(['yokogawa'])
  })
  it('selects corridor data only for the corresponding journey', () => {
    expect(datasetIdsForJourney('hakushima', 'yokogawa')).toEqual(['hakushima', 'yokogawa'])
    expect(datasetIdsForJourney('central', 'central')).toEqual(['central'])
  })
  it('adds datasets intersecting the buffered ORS route instead of trusting only a pair table', () => {
    const route: RoutePlan = { id: 'ors', kind: 'shortest', label: 'ORS', source: 'api', coordinates: [{ lng: 132.461, lat: 34.409 }, { lng: 132.45, lat: 34.41 }], distanceMeters: 1, durationSeconds: 1 }
    expect(routeBufferBounds([route], 250)[0][0]).toBeLessThan(132.46)
    expect(datasetIdsForRoute(['hakushima'], [route], manifest)).toContain('corridor-shinhakushima-yokogawa')
  })
  it('stops an obsolete area load when its AbortSignal is already cancelled', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(manifest)))
    const controller = new AbortController(); controller.abort()
    await expect(fetchPlateauBuildingsForRoutes(['hakushima'], [], controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })
  it('rejects a coarse BBox-only match when coverage does not meet the route buffer', () => {
    const testManifest = { ...manifest, datasets: [coverageDataset('central', [132, 34, 133, 35], coverage(132.45, 34.39, 132.48, 34.41)), coverageDataset('far-corridor', [132, 34, 133, 35], coverage(132.8, 34.8, 132.9, 34.9))] }
    const route: RoutePlan = { id: 'route', kind: 'shortest', label: 'route', source: 'api', coordinates: [{ lng: 132.46, lat: 34.4 }, { lng: 132.461, lat: 34.401 }], distanceMeters: 1, durationSeconds: 1 }
    expect(datasetIdsForRoute(['central'], [route], testManifest)).toEqual(['central'])
  })
  it('adds a dataset when its coverage intersects the buffered route', () => {
    const testManifest = { ...manifest, datasets: [coverageDataset('central', [132, 34, 133, 35], coverage(132.45, 34.39, 132.48, 34.41)), coverageDataset('needed-chunk', [132, 34, 133, 35], coverage(132.46, 34.4, 132.47, 34.42))] }
    const route: RoutePlan = { id: 'route', kind: 'shortest', label: 'route', source: 'api', coordinates: [{ lng: 132.46, lat: 34.4 }, { lng: 132.461, lat: 34.401 }], distanceMeters: 1, durationSeconds: 1 }
    expect(datasetIdsForRoute(['central'], [route], testManifest)).toContain('needed-chunk')
  })
  it('keeps central routes from selecting a west corridor and short Nishi routes from selecting a wide corridor', () => {
    const testManifest = { ...manifest, datasets: [coverageDataset('central', [132, 34, 133, 35], coverage(132.45, 34.39, 132.48, 34.41)), coverageDataset('nishi-hiroshima', [132, 34, 133, 35], coverage(132.42, 34.39, 132.44, 34.41)), coverageDataset('corridor-yokogawa-nishihiroshima', [132, 34, 133, 35], coverage(132.45, 34.405, 132.46, 34.415), true)] }
    const centralRoute: RoutePlan = { id: 'central', kind: 'shortest', label: 'central', source: 'api', coordinates: [{ lng: 132.475, lat: 34.398 }, { lng: 132.452, lat: 34.394 }], distanceMeters: 1, durationSeconds: 1 }
    const nishiRoute: RoutePlan = { id: 'nishi', kind: 'shortest', label: 'nishi', source: 'api', coordinates: [{ lng: 132.428, lat: 34.398 }, { lng: 132.4277, lat: 34.397 }], distanceMeters: 1, durationSeconds: 1 }
    expect(datasetIdsForRoute(['central'], [centralRoute], testManifest)).toEqual(['central'])
    expect(datasetIdsForRoute(['nishi-hiroshima'], [nishiRoute], testManifest)).toEqual(['nishi-hiroshima'])
  })
  it('selects only the split corridor chunk intersecting the route', () => {
    const testManifest = { ...manifest, datasets: [coverageDataset('central', [132, 34, 133, 35], coverage(132.45, 34.39, 132.48, 34.41)), coverageDataset('corridor-east', [132, 34, 133, 35], coverage(132.46, 34.4, 132.47, 34.42)), coverageDataset('corridor-west', [132, 34, 133, 35], coverage(132.42, 34.39, 132.44, 34.41))] }
    const route: RoutePlan = { id: 'route', kind: 'shortest', label: 'route', source: 'api', coordinates: [{ lng: 132.461, lat: 34.409 }, { lng: 132.462, lat: 34.41 }], distanceMeters: 1, durationSeconds: 1 }
    expect(datasetIdsForRoute(['central'], [route], testManifest)).toEqual(['central', 'corridor-east'])
  })
})
