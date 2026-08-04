import { describe, expect, it, vi } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { encodeInt16LittleEndian } from '../lib/satelliteGrid'
import { clearSatelliteCachesForTests, fetchSatelliteGrid, layerForSelection, validateEnvironmentalManifest } from './satellite'

describe('satellite metadata', () => {
  it('has valid generated metadata, bounds, image paths, and color stops', async () => {
    const value = JSON.parse(await readFile(resolve(process.cwd(), 'public/data/satellite/metadata.json'), 'utf8'))
    expect(validateEnvironmentalManifest(value)).toBe(true)
    expect(value.layers).toHaveLength(2)
    for (const layer of value.layers) {
      expect(layer.observedAt).toMatch(/^2026-/)
      expect(layer.bounds[0]).toBeLessThan(layer.bounds[2])
      expect(layer.bounds[1]).toBeLessThan(layer.bounds[3])
      expect(layer.imageUrl).toMatch(/^\/data\/satellite\/.+\.webp$/)
      expect(layer.colorStops.length).toBeGreaterThanOrEqual(2)
      expect(layer.resolutionMeters).toBeGreaterThan(0)
      expect(layer.validPixelRatio).toBeGreaterThan(0)
      expect(layer.validPixelRatio).toBeLessThanOrEqual(1)
    }
  })
  it('selects a layer without changing the manifest', async () => {
    const value = JSON.parse(await readFile(resolve(process.cwd(), 'public/data/satellite/metadata.json'), 'utf8'))
    expect(layerForSelection(value, 'none')).toBeUndefined()
    expect(layerForSelection(value, 'landsat-lst-20260723-v1')?.type).toBe('land-surface-temperature')
    expect(layerForSelection(value, 'sentinel2-ndvi-20260724-v1')?.type).toBe('ndvi')
  })
  it('shares the cached grid request while allowing a caller to abort', async () => {
    const value = JSON.parse(await readFile(resolve(process.cwd(), 'public/data/satellite/metadata.json'), 'utf8'))
    const layer = value.layers[0]
    const bytes = layer.numericGrid.width * layer.numericGrid.height * 2
    const buffer = encodeInt16LittleEndian(new Int16Array(bytes / 2).fill(321))
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, arrayBuffer: async () => buffer }))
    vi.stubGlobal('fetch', fetchMock)
    clearSatelliteCachesForTests()

    const controller = new AbortController()
    const aborted = fetchSatelliteGrid(layer, controller.signal)
    controller.abort()
    await expect(aborted).rejects.toMatchObject({ name: 'AbortError' })

    const first = await fetchSatelliteGrid(layer)
    const second = await fetchSatelliteGrid(layer)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(first.values[0]).toBe(321)
    expect(second.values).toBe(first.values)
    vi.unstubAllGlobals()
    clearSatelliteCachesForTests()
  })
})
