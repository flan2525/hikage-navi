import { afterEach, describe, expect, it, vi } from 'vitest'
import { datasetIdsForJourney, fetchPlateauBuildings, resetBuildingCacheForTests } from './buildings'

const feature = (id: string) => ({ type: 'Feature', properties: { id, height: 12, heightSource: 'measuredHeight', dataYear: 2024, lod: 2, source: 'PLATEAU' }, geometry: { type: 'Polygon', coordinates: [[[132.46, 34.39], [132.461, 34.39], [132.461, 34.391], [132.46, 34.39]]] } })
const manifest = { version: 1, source: 'test', datasets: [
  { id: 'hakushima', label: '白島', url: '/hakushima.geojson', areaIds: ['hakushima'], routeKeys: [], bounds: [132, 34, 133, 35], buildingCount: 1, dataYear: 2024, version: 'v1', fileSizeBytes: 1, source: 'test' },
  { id: 'yokogawa', label: '横川', url: '/yokogawa.geojson', areaIds: ['yokogawa'], routeKeys: [], bounds: [132, 34, 133, 35], buildingCount: 1, dataYear: 2024, version: 'v1', fileSizeBytes: 1, source: 'test' },
  { id: 'corridor-shinhakushima-yokogawa', label: '回廊', url: '/corridor.geojson', areaIds: ['hakushima', 'yokogawa'], routeKeys: [], bounds: [132, 34, 133, 35], buildingCount: 1, dataYear: 2024, version: 'v1', fileSizeBytes: 1, source: 'test' },
] }
const jsonResponse = (value: unknown) => ({ ok: true, json: async () => value })
afterEach(() => { vi.restoreAllMocks(); resetBuildingCacheForTests() })

describe('PLATEAU building loader', () => {
  it('loads only the selected datasets and removes duplicate IDs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => Promise.resolve(url === '/data/plateau/areas.json' ? jsonResponse(manifest) : jsonResponse({ type: 'FeatureCollection', features: [feature('b1')] }))))
    const data = await fetchPlateauBuildings(['hakushima', 'yokogawa'])
    expect(data.buildings).toHaveLength(1); expect(data.duplicateBuildingCount).toBe(1)
    expect(fetch).toHaveBeenCalledTimes(3)
  })
  it('keeps successful datasets when another requested dataset fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => Promise.resolve(url === '/data/plateau/areas.json' ? jsonResponse(manifest) : url === '/yokogawa.geojson' ? { ok: false, status: 503 } : jsonResponse({ type: 'FeatureCollection', features: [feature('b1')] }))))
    const data = await fetchPlateauBuildings(['hakushima', 'yokogawa'])
    expect(data.buildings).toHaveLength(1); expect(data.failedDatasetIds).toEqual(['yokogawa'])
  })
  it('selects corridor data only for the corresponding journey', () => {
    expect(datasetIdsForJourney('hakushima', 'yokogawa')).toEqual(['hakushima', 'yokogawa', 'corridor-shinhakushima-yokogawa'])
    expect(datasetIdsForJourney('central', 'central')).toEqual(['central'])
  })
})
