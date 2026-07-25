import type { Building, Position, RoutePlan, ShadeResult } from '../types'
import { distanceMeters, pointInPolygon, sampleLine } from './geo'
import { getSunPosition } from './sun'

function offset(position: Position, east: number, north: number): Position { return { lng: position.lng + east / (111_320 * Math.cos(position.lat * Math.PI / 180)), lat: position.lat + north / 110_540 } }
export function buildingShadow(building: Building, sunAltitude: number, sunBearing: number): Position[] {
  if (sunAltitude <= 0) return []
  const length = Math.min(180, building.heightMeters / Math.tan(sunAltitude * Math.PI / 180)); const direction = (sunBearing + 180) * Math.PI / 180
  const shifted = building.footprint.map((p) => offset(p, Math.sin(direction) * length, Math.cos(direction) * length))
  return [...building.footprint, ...shifted]
}
export function calculateShade(route: RoutePlan, buildings: Building[], departure: Date, walkingSpeedMetersPerSecond = 1.25): ShadeResult {
  const points = sampleLine(route.coordinates); const shadows = new Map<string, Position[]>()
  let shadedDistance = 0
  const evaluated = points.map((point, index) => {
    const arrivalAt = new Date(departure.getTime() + point.distanceFromStart / walkingSpeedMetersPerSecond * 1000); const sun = getSunPosition(arrivalAt, point)
    const shaded = buildings.some((building) => { const key = `${building.id}-${Math.floor(arrivalAt.getTime() / 600000)}`; const shadow = shadows.get(key) ?? buildingShadow(building, sun.altitude, sun.bearing); shadows.set(key, shadow); return shadow.length > 0 && pointInPolygon(point, shadow) })
    if (index > 0 && shaded) shadedDistance += distanceMeters(points[index - 1], point)
    return { ...point, shaded, arrivalAt }
  })
  const totalDistance = points.at(-1)?.distanceFromStart ?? 0; const startSun = getSunPosition(departure, route.coordinates[0])
  return { points: evaluated, shadedDistanceMeters: shadedDistance, totalDistanceMeters: totalDistance, shadePercent: totalDistance ? shadedDistance / totalDistance * 100 : 0, sunAltitude: startSun.altitude, sunBearing: startSun.bearing }
}
