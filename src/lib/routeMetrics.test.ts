import { describe, expect, it } from 'vitest'
import { calculateRouteMetrics } from './routeMetrics'
import type { ShadeResult } from '../types'

const result = (statuses: Array<'shaded' | 'sunny' | 'indeterminate'>): ShadeResult => ({ points: statuses.map((status, index) => ({ lng: 132.46, lat: 34.39, status, shaded: status === 'shaded', distanceFromStart: index * 10, arrivalAt: new Date() })), shadedDistanceMeters: 0, totalDistanceMeters: (statuses.length - 1) * 10, shadePercent: 0, sunAltitude: 45, sunBearing: 180, audit: { shadowBearing: 0, routeSampleCount: statuses.length, shadedPointCount: 0, sunnyPointCount: 0, indeterminatePointCount: 0, candidateBuildingCount: 0, shadowPolygonCount: 0, processingMilliseconds: 0 } })

describe('route world metrics', () => {
  it('groups connected shade and sunny crossings', () => { const metrics = calculateRouteMetrics(result(['shaded', 'shaded', 'sunny', 'sunny', 'shaded'])); expect(metrics.totalShadeMeters).toBe(20); expect(metrics.longestShadeMeters).toBe(10); expect(metrics.sunnyMeters).toBe(20); expect(metrics.maxSunnyCrossingMeters).toBe(20); expect(metrics.sunnyCrossings).toBe(1) })
  it('reports the next shade distance for a route that starts in sun', () => { const metrics = calculateRouteMetrics(result(['sunny', 'sunny', 'shaded'])); expect(metrics.nextShadeDistanceMeters).toBe(20); expect(metrics.sunnySeconds).toBeCloseTo(8, 1) })
})
