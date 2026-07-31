import type { Bounds, Building, BuildingShadow, Position, RoutePlan, ShadeResult } from '../types'
import { destinationPoint, distanceMeters, pointInPolygon, sampleLine } from './geo'
import { getSunPosition, normalizeBearing } from './sun'

export const MIN_SUN_ALTITUDE_DEGREES = 3
export const MAX_SHADOW_LENGTH_METERS = 250
export const WALKING_SPEED_METERS_PER_SECOND = 1.25
export const ROUTE_SAMPLE_SPACING_METERS = 8

export function shadowBearing(sunBearing: number): number { return normalizeBearing(sunBearing + 180) }
export function shadowLengthMeters(heightMeters: number, sunAltitude: number): number { return sunAltitude < MIN_SUN_ALTITUDE_DEGREES ? 0 : Math.min(MAX_SHADOW_LENGTH_METERS, heightMeters / Math.tan(sunAltitude * Math.PI / 180)) }
export function buildingShadowPolygons(building: Building, sunAltitude: number, sunBearing: number): Position[][] {
  const length = shadowLengthMeters(building.heightMeters, sunAltitude)
  if (!length || building.footprint.length < 3) return []
  const bearing = shadowBearing(sunBearing)
  const shifted = building.footprint.map((point) => destinationPoint(point, bearing, length))
  const edgePolygons = building.footprint.map((point, index) => [point, building.footprint[(index + 1) % building.footprint.length], shifted[(index + 1) % shifted.length], shifted[index]])
  return [building.footprint, ...edgePolygons]
}
function canReach(point: Position, building: Building): boolean {
  // Fast, intentionally conservative prefilter only. Shadow vertices themselves use destinationPoint().
  const latDelta = MAX_SHADOW_LENGTH_METERS / 110_574
  const lngDelta = MAX_SHADOW_LENGTH_METERS / (111_320 * Math.cos(point.lat * Math.PI / 180))
  return building.footprint.some((vertex) => Math.abs(point.lat - vertex.lat) <= latDelta && Math.abs(point.lng - vertex.lng) <= lngDelta)
}
export function selectShadeCandidateBuildings(buildings: Building[], points: Position[]): Building[] { return buildings.filter((building) => points.some((point) => canReach(point, building))) }
export function buildShadowAudit(buildings: Building[], sunAltitude: number, sunBearing: number): BuildingShadow[] {
  return buildings.map((building) => ({ buildingId: building.id, heightMeters: building.heightMeters, heightSource: building.heightSource, dataYear: building.dataYear, lod: building.lod, shadowLengthMeters: shadowLengthMeters(building.heightMeters, sunAltitude), shadowBearing: shadowBearing(sunBearing), polygons: buildingShadowPolygons(building, sunAltitude, sunBearing), isShadeCandidate: true }))
}
function isInsideCoverage(point: Position, coverageBounds: Bounds[] | undefined): boolean { return !coverageBounds?.length || coverageBounds.some(([minLng, minLat, maxLng, maxLat]) => point.lng >= minLng && point.lng <= maxLng && point.lat >= minLat && point.lat <= maxLat) }
export function calculateShade(route: RoutePlan, buildings: Building[], departure: Date, walkingSpeedMetersPerSecond = WALKING_SPEED_METERS_PER_SECOND, coverageBounds?: Bounds[]): ShadeResult {
  const calculationStartedAt = performance.now()
  const points = sampleLine(route.coordinates, ROUTE_SAMPLE_SPACING_METERS)
  const candidateBuildings = selectShadeCandidateBuildings(buildings, points)
  const shadows = new Map<string, Position[][]>()
  let shadedPointCount = 0
  let sunnyPointCount = 0
  let indeterminatePointCount = 0
  let outsideCoveragePointCount = 0
  const evaluated = points.map((point) => {
    const arrivalAt = new Date(departure.getTime() + point.distanceFromStart / walkingSpeedMetersPerSecond * 1000)
    if (!isInsideCoverage(point, coverageBounds)) {
      outsideCoveragePointCount += 1
      return { ...point, shaded: false, status: 'outside' as const, arrivalAt }
    }
    const sun = getSunPosition(arrivalAt, point)
    if (sun.altitude < MIN_SUN_ALTITUDE_DEGREES) {
      indeterminatePointCount += 1
      return { ...point, shaded: false, status: 'indeterminate' as const, arrivalAt }
    }
    const shaded = candidateBuildings.some((building) => {
      if (!canReach(point, building)) return false
      const key = `${building.id}-${Math.floor(arrivalAt.getTime() / 600000)}`
      const shadow = shadows.get(key) ?? buildingShadowPolygons(building, sun.altitude, sun.bearing)
      shadows.set(key, shadow)
      return shadow.some((polygon) => pointInPolygon(point, polygon))
    })
    if (shaded) shadedPointCount += 1; else sunnyPointCount += 1
    return { ...point, shaded, status: shaded ? 'shaded' as const : 'sunny' as const, arrivalAt }
  })
  const totalDistance = points.at(-1)?.distanceFromStart ?? 0
  let shadedDistance = 0; let outsideCoverageDistance = 0; let evaluatedDistance = 0
  for (let index = 1; index < evaluated.length; index += 1) {
    const distance = distanceMeters(evaluated[index - 1], evaluated[index])
    if (evaluated[index].status === 'outside' || evaluated[index - 1].status === 'outside') { outsideCoverageDistance += distance; continue }
    evaluatedDistance += distance
    if (evaluated[index].status === 'shaded') shadedDistance += distance
  }
  const startSun = getSunPosition(departure, route.coordinates[0])
  const shadowPolygonCount = candidateBuildings.reduce((count, building) => count + (startSun.altitude >= MIN_SUN_ALTITUDE_DEGREES ? building.footprint.length + 1 : 0), 0)
  return { points: evaluated, shadedDistanceMeters: shadedDistance, totalDistanceMeters: totalDistance, evaluatedDistanceMeters: evaluatedDistance, outsideCoverageDistanceMeters: outsideCoverageDistance, shadePercent: evaluatedDistance ? shadedDistance / evaluatedDistance * 100 : 0, sunAltitude: startSun.altitude, sunBearing: startSun.bearing, audit: { shadowBearing: shadowBearing(startSun.bearing), routeSampleCount: points.length, shadedPointCount, sunnyPointCount, indeterminatePointCount, outsideCoveragePointCount, candidateBuildingCount: candidateBuildings.length, shadowPolygonCount, processingMilliseconds: performance.now() - calculationStartedAt } }
}
