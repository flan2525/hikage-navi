import { describe, expect, it } from 'vitest'
import { fallbackRoutes } from '../data/hiroshima'
import { calculateShade } from './shade'
import { sampleLine } from './geo'
import { getSunPosition } from './sun'
describe('sun position', () => { it('returns a positive altitude around Hiroshima noon in summer', () => { expect(getSunPosition(new Date('2026-07-25T12:00:00+09:00'), { lng: 132.46, lat: 34.39 }).altitude).toBeGreaterThan(50) }) })
describe('route sampling', () => { it('splits a route into approximately 8m points', () => { const points = sampleLine(fallbackRoutes[0].coordinates, 8); expect(points.length).toBeGreaterThan(100); expect(points[0].distanceFromStart).toBe(0) }) })
describe('shade calculation', () => { it('returns a bounded percentage and monotonically increasing samples', () => { const result = calculateShade(fallbackRoutes[0], [], new Date('2026-07-25T12:00:00+09:00')); expect(result.shadePercent).toBe(0); expect(result.totalDistanceMeters).toBeGreaterThan(0); expect(result.points.at(-1)!.distanceFromStart).toBeGreaterThan(result.points[1].distanceFromStart) }) })
