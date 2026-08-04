import { describe, expect, it } from 'vitest'
import type { RoutePlan, SatelliteDistributionStats, ShadeResult } from '../types'
import { analyzeSatelliteRoute, weightedQuantile } from './satelliteAnalysis'
import type { DecodedSatelliteGrid } from './satelliteGrid'

const gridMetadata = (scale: number) => ({ dataUrl: '/grid.bin', dataType: 'Int16' as const, byteOrder: 'little-endian' as const, scale, offset: 0, noData: -32768, width: 3, height: 1, bounds: [0, 0, 3, 1] as [number, number, number, number], crs: 'EPSG:4326' as const, rowOrder: 'north-to-south' as const, cellSizeMeters: 10, nativeResolutionMeters: 10, displayResolutionMeters: 10, validPixelRatio: 1 })
const route: RoutePlan = { id: 'shade-route', kind: 'shade', label: '影渡り', coordinates: [{ lng: .5, lat: .5 }, { lng: 1.5, lat: .5 }, { lng: 2.5, lat: .5 }], distanceMeters: 20, durationSeconds: 16, source: 'fallback' }
const shadeResult = { points: [{ lng: .5, lat: .5, distanceFromStart: 0, shaded: true, status: 'shaded', arrivalAt: new Date() }, { lng: 1.5, lat: .5, distanceFromStart: 10, shaded: false, status: 'sunny', arrivalAt: new Date() }, { lng: 2.5, lat: .5, distanceFromStart: 20, shaded: false, status: 'sunny', arrivalAt: new Date() }], totalDistanceMeters: 20, shadedDistanceMeters: 0, evaluatedDistanceMeters: 20, outsideCoverageDistanceMeters: 0, shadePercent: 0, sunAltitude: 40, sunBearing: 180, audit: {} } as ShadeResult
const stats: SatelliteDistributionStats = { p10: 40, p25: 45, p50: 50, p75: 50, p90: 60, p98: 60, actualMin: 40, actualMax: 60, displayMin: 40, displayMax: 60 }

describe('satellite route analysis', () => {
  it('calculates distance-weighted quantiles', () => {
    expect(weightedQuantile([{ value: 10, distance: 2 }, { value: 20, distance: 8 }], .5)).toBe(20)
    expect(weightedQuantile([], .9)).toBeNull()
  })

  it('samples both grids and aggregates valid, high-temperature, vegetation, and shade cross metrics by distance', () => {
    const lstGrid: DecodedSatelliteGrid = { metadata: gridMetadata(.1), values: new Int16Array([400, 500, 600]) }
    const ndviGrid: DecodedSatelliteGrid = { metadata: gridMetadata(.0001), values: new Int16Array([2000, 3000, 4000]) }
    const result = analyzeSatelliteRoute(route, shadeResult, lstGrid, ndviGrid, stats)
    expect(result.sampleCount).toBe(3)
    expect(result.lst.weightedAverage).toBeCloseTo(55)
    expect(result.lst.weightedMedian).toBe(50)
    expect(result.lst.weightedP90).toBe(60)
    expect(result.lst.validDataRate).toBe(1)
    expect(result.lst.highTempDistanceMeters).toBe(20)
    expect(result.lst.sunnyHighTempDistanceMeters).toBe(20)
    expect(result.ndvi.weightedAverage).toBeCloseTo(.35)
    expect(result.ndvi.vegetationDistanceMeters).toBe(20)
    expect(result.ndvi.vegetationRate).toBe(1)
    expect(result.lst.referencePixelCount).toBe(2)
    expect(result.lst.uniquePixelCount).toBe(2)
    expect(result.samples[0]).toMatchObject({ distanceMeters: 10, status: 'sunny', lst: 50, ndvi: .3, lstValid: true, ndviValid: true })
  })
})
