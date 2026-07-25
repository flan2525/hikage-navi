import SunCalc from 'suncalc'
import type { Position } from '../types'
export function getSunPosition(date: Date, position: Position) {
  const result = SunCalc.getPosition(date, position.lat, position.lng)
  return { altitude: result.altitude * 180 / Math.PI, bearing: (result.azimuth * 180 / Math.PI + 180 + 360) % 360 }
}
