import SunCalc from 'suncalc'
import type { Position } from '../types'
export function normalizeBearing(value: number): number { return ((value % 360) + 360) % 360 }
// SunCalc azimuth: south=0°, west-positive. App bearing: north=0°, clockwise.
export function sunCalcAzimuthToBearing(azimuthRadians: number): number { return normalizeBearing(azimuthRadians * 180 / Math.PI + 180) }
export function getSunPosition(date: Date, position: Position) {
  const result = SunCalc.getPosition(date, position.lat, position.lng)
  return { altitude: result.altitude * 180 / Math.PI, bearing: sunCalcAzimuthToBearing(result.azimuth) }
}
