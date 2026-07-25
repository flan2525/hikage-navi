import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchPlateauBuildings } from './buildings'

afterEach(() => vi.restoreAllMocks())
const metadata = { cityName: '広島市', dataYear: 2024, specification: '4.1', cityGmlVersion: '2.0', sourceCrs: 'EPSG:6697', outputCrs: 'EPSG:4326', buildingCount: 1, geojsonBytes: 1, target: { name: 'test', bbox: [132, 34, 133, 35] as [number, number, number, number], bufferMeters: 350 } }
const collection = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { id: 'b1', height: 12, heightSource: 'measuredHeight', dataYear: 2024, lod: 2, source: 'PLATEAU' }, geometry: { type: 'Polygon', coordinates: [[[132.46, 34.39], [132.461, 34.39], [132.461, 34.391], [132.46, 34.39]]] } }] }

describe('PLATEAU building loader', () => {
  it('converts GeoJSON into shade-ready buildings', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => collection }).mockResolvedValueOnce({ ok: true, json: async () => metadata }))
    const data = await fetchPlateauBuildings(new AbortController().signal)
    expect(data.buildings).toHaveLength(1)
    expect(data.buildings[0].footprint[0]).toEqual({ lng: 132.46, lat: 34.39 })
  })
  it('keeps the app recoverable when the data request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))
    await expect(fetchPlateauBuildings(new AbortController().signal)).rejects.toThrow('503')
  })
})
