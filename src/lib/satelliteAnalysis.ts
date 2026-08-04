import type { RoutePlan, SatelliteAnalysisResult, SatelliteDistributionStats, SatelliteLSTMetrics, SatelliteNDVIMetrics, SatelliteRouteAnalysis, SatelliteRouteSample, ShadeResult } from '../types'
import { sampleNumericGrid, type DecodedSatelliteGrid } from './satelliteGrid'

type WeightedValue = { value: number; distance: number }

const sumDistance = (values: WeightedValue[]) => values.reduce((sum, item) => sum + item.distance, 0)
const rate = (distance: number, total: number) => total > 0 ? distance / total : 0

export function weightedQuantile(values: WeightedValue[], quantile: number): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((left, right) => left.value - right.value)
  const total = sumDistance(sorted)
  if (!total) return null
  const target = total * Math.max(0, Math.min(1, quantile))
  let accumulated = 0
  for (const item of sorted) {
    accumulated += item.distance
    if (accumulated >= target) return item.value
  }
  return sorted.at(-1)?.value ?? null
}

function weightedAverage(values: WeightedValue[]): number | null {
  const total = sumDistance(values)
  return total > 0 ? values.reduce((sum, item) => sum + item.value * item.distance, 0) / total : null
}

function baseMetrics(values: WeightedValue[], inBounds: number[], totalDistance: number) {
  const validDistance = sumDistance(values)
  const inBoundsDistance = inBounds.reduce((sum, distance) => sum + distance, 0)
  return {
    validDataRate: rate(validDistance, totalDistance),
    inBoundsRate: rate(inBoundsDistance, totalDistance),
    weightedAverage: weightedAverage(values),
    referencePixelCount: values.length,
    uniquePixelCount: 0,
    validDistanceMeters: validDistance,
    inBoundsDistanceMeters: inBoundsDistance,
  }
}

function lstMetrics(samples: SatelliteRouteSample[], totalDistance: number, statistics: SatelliteDistributionStats): SatelliteLSTMetrics {
  const values: WeightedValue[] = []
  const inBounds: number[] = []
  const pixelKeys = new Set<string>()
  let highTempDistanceMeters = 0
  let shadedHighTempDistanceMeters = 0
  let sunnyHighTempDistanceMeters = 0
  for (const sample of samples) {
    if (sample.lstInBounds) inBounds.push(sample.distanceMeters)
    if (!sample.lstValid || sample.lst == null) continue
    values.push({ value: sample.lst, distance: sample.distanceMeters })
    if (sample.lstPixel) pixelKeys.add(sample.lstPixel)
    if (sample.lst >= statistics.p75) {
      highTempDistanceMeters += sample.distanceMeters
      if (sample.status === 'shaded') shadedHighTempDistanceMeters += sample.distanceMeters
      if (sample.status === 'sunny') sunnyHighTempDistanceMeters += sample.distanceMeters
    }
  }
  const base = baseMetrics(values, inBounds, totalDistance)
  return { ...base, uniquePixelCount: pixelKeys.size, weightedMedian: weightedQuantile(values, .5), weightedP90: weightedQuantile(values, .9), highTempDistanceMeters, highTempRate: rate(highTempDistanceMeters, base.validDistanceMeters), shadedHighTempDistanceMeters, sunnyHighTempDistanceMeters, highTempThreshold: statistics.p75, strongHighTempThreshold: statistics.p90 }
}

function ndviMetrics(samples: SatelliteRouteSample[], totalDistance: number): SatelliteNDVIMetrics {
  const threshold = .3
  const values: WeightedValue[] = []
  const inBounds: number[] = []
  const pixelKeys = new Set<string>()
  let vegetationDistanceMeters = 0
  let shadedVegetationDistanceMeters = 0
  let sunnyVegetationDistanceMeters = 0
  for (const sample of samples) {
    if (sample.ndviInBounds) inBounds.push(sample.distanceMeters)
    if (!sample.ndviValid || sample.ndvi == null) continue
    values.push({ value: sample.ndvi, distance: sample.distanceMeters })
    if (sample.ndviPixel) pixelKeys.add(sample.ndviPixel)
    if (sample.ndvi >= threshold) {
      vegetationDistanceMeters += sample.distanceMeters
      if (sample.status === 'shaded') shadedVegetationDistanceMeters += sample.distanceMeters
      if (sample.status === 'sunny') sunnyVegetationDistanceMeters += sample.distanceMeters
    }
  }
  const base = baseMetrics(values, inBounds, totalDistance)
  return { ...base, uniquePixelCount: pixelKeys.size, vegetationDistanceMeters, vegetationRate: rate(vegetationDistanceMeters, base.validDistanceMeters), shadedVegetationDistanceMeters, sunnyVegetationDistanceMeters, vegetationThreshold: threshold }
}

export function analyzeSatelliteRoute(route: RoutePlan, shadeResult: ShadeResult, lstGrid: DecodedSatelliteGrid, ndviGrid: DecodedSatelliteGrid, lstStatistics: SatelliteDistributionStats): SatelliteRouteAnalysis {
  const startedAt = performance.now()
  const samples: SatelliteRouteSample[] = []
  for (let index = 1; index < shadeResult.points.length; index += 1) {
    const previous = shadeResult.points[index - 1]
    const point = shadeResult.points[index]
    const distanceMeters = Math.max(0, point.distanceFromStart - previous.distanceFromStart)
    const lst = sampleNumericGrid(lstGrid, point)
    const ndvi = sampleNumericGrid(ndviGrid, point)
    samples.push({ position: { lng: point.lng, lat: point.lat }, distanceMeters, status: point.status, lst: lst.value, ndvi: ndvi.value, lstValid: lst.value != null, ndviValid: ndvi.value != null, lstInBounds: lst.inBounds, ndviInBounds: ndvi.inBounds, lstPixel: lst.pixelKey, ndviPixel: ndvi.pixelKey })
  }
  const totalDistanceMeters = route.distanceMeters || shadeResult.totalDistanceMeters
  return { routeId: route.id, routeKind: route.kind, totalDistanceMeters, shadePercent: shadeResult.shadePercent, sampleCount: shadeResult.points.length, analysisMilliseconds: performance.now() - startedAt, lst: lstMetrics(samples, totalDistanceMeters, lstStatistics), ndvi: ndviMetrics(samples, totalDistanceMeters), samples }
}

export function analyzeSatelliteRoutes(routes: RoutePlan[], shadeResults: Record<string, ShadeResult>, lstGrid: DecodedSatelliteGrid, ndviGrid: DecodedSatelliteGrid, lstStatistics: SatelliteDistributionStats, observedAt: { lst: string; ndvi: string }, gridLoadMilliseconds: number, gridBytes: number): SatelliteAnalysisResult {
  const startedAt = performance.now()
  const routeAnalyses = Object.fromEntries(routes.flatMap((route) => {
    const result = shadeResults[route.id]
    return result ? [[route.id, analyzeSatelliteRoute(route, result, lstGrid, ndviGrid, lstStatistics)]] : []
  }))
  return { generatedAt: new Date().toISOString(), observedAt, gridLoadMilliseconds, gridBytes, gridMemoryBytes: lstGrid.values.byteLength + ndviGrid.values.byteLength, routeAnalyses, totalAnalysisMilliseconds: performance.now() - startedAt }
}
