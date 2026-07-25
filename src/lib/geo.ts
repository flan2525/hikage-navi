import type { Position } from '../types'
const R = 6_371_000
const toRad = (value: number) => value * Math.PI / 180

export function distanceMeters(a: Position, b: Position): number {
  const dLat = toRad(b.lat - a.lat); const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
export function interpolate(a: Position, b: Position, fraction: number): Position { return { lng: a.lng + (b.lng - a.lng) * fraction, lat: a.lat + (b.lat - a.lat) * fraction } }
export function sampleLine(coordinates: Position[], spacingMeters = 8): Array<Position & { distanceFromStart: number }> {
  const result: Array<Position & { distanceFromStart: number }> = []; let walked = 0
  for (let i = 0; i < coordinates.length - 1; i += 1) {
    const a = coordinates[i]; const b = coordinates[i + 1]; const length = distanceMeters(a, b); const count = Math.max(1, Math.ceil(length / spacingMeters))
    for (let step = 0; step < count; step += 1) result.push({ ...interpolate(a, b, step / count), distanceFromStart: walked + length * step / count })
    walked += length
  }
  const last = coordinates.at(-1); if (last) result.push({ ...last, distanceFromStart: walked }); return result
}
export function pointInPolygon(point: Position, polygon: Position[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) { const a = polygon[i]; const b = polygon[j]; if ((a.lat > point.lat) !== (b.lat > point.lat) && point.lng < (b.lng - a.lng) * (point.lat - a.lat) / (b.lat - a.lat) + a.lng) inside = !inside }
  return inside
}
