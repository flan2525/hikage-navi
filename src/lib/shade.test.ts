import { describe, expect, it } from 'vitest'
import { fallbackRoutes } from '../data/hiroshima'
import { destinationPoint, distanceMeters, pointInPolygon, sampleLine } from './geo'
import { buildingShadowPolygons, calculateShade, shadowBearing, shadowLengthMeters } from './shade'
import { getSunPosition, normalizeBearing, sunCalcAzimuthToBearing } from './sun'

const building = { id: 'test', heightMeters: 10, footprint: [{ lng: 132.46, lat: 34.39 }, { lng: 132.4601, lat: 34.39 }, { lng: 132.4601, lat: 34.3901 }, { lng: 132.46, lat: 34.3901 }], source: 'test', isSample: true }

describe('sun position and bearing conversion', () => {
  it('returns a positive altitude around Hiroshima noon in summer', () => expect(getSunPosition(new Date('2026-07-25T12:00:00+09:00'), { lng: 132.46, lat: 34.39 }).altitude).toBeGreaterThan(50))
  it('converts SunCalc south-based azimuth into north-based clockwise bearing', () => { expect(sunCalcAzimuthToBearing(0)).toBe(180); expect(sunCalcAzimuthToBearing(-Math.PI / 2)).toBe(90); expect(sunCalcAzimuthToBearing(Math.PI / 2)).toBe(270) })
  it('normalizes shadow bearings across north', () => { expect(shadowBearing(90)).toBe(270); expect(shadowBearing(180)).toBe(0); expect(shadowBearing(270)).toBe(90); expect(shadowBearing(359)).toBe(179); expect(shadowBearing(1)).toBe(181); expect(normalizeBearing(-1)).toBe(359) })
})
describe('route sampling and geodesic movement', () => {
  it('splits a route into approximately 8m points', () => { const points = sampleLine(fallbackRoutes[0].coordinates, 8); expect(points.length).toBeGreaterThan(100); expect(points[0].distanceFromStart).toBe(0) })
  it('moves a point by bearing and meters without degree addition', () => { const origin = { lng: 132.46, lat: 34.39 }; const north = destinationPoint(origin, 0, 100); const east = destinationPoint(origin, 90, 100); expect(distanceMeters(origin, north)).toBeCloseTo(100, 0); expect(north.lat).toBeGreaterThan(origin.lat); expect(east.lng).toBeGreaterThan(origin.lng) })
})
describe('building shadow geometry', () => {
  it.each([[10, 45, 10], [20, 45, 20], [10, 30, 17.3205]])('uses h / tan(a): %im at %i°', (height, altitude, expected) => expect(shadowLengthMeters(height, altitude)).toBeCloseTo(expected, 3))
  it('caps very long shadows and treats low-altitude sun as indeterminate', () => { expect(shadowLengthMeters(100, 10)).toBe(250); expect(shadowLengthMeters(20, 1)).toBe(0); expect(buildingShadowPolygons(building, 1, 90)).toHaveLength(0) })
  it('projects east sun to west shadow and makes a containable polygon', () => { const polygons = buildingShadowPolygons(building, 45, 90); const shiftedPoint = polygons[1][2]; expect(shiftedPoint.lng).toBeLessThan(building.footprint[1].lng); expect(polygons.some((polygon) => pointInPolygon({ lng: 132.45995, lat: 34.39005 }, polygon))).toBe(true) })
})
describe('shade aggregation', () => {
  it('returns a bounded percentage and monotonically increasing samples', () => { const result = calculateShade(fallbackRoutes[0], [], new Date('2026-07-25T12:00:00+09:00')); expect(result.shadePercent).toBe(0); expect(result.audit.sunnyPointCount).toBe(result.points.length); expect(result.totalDistanceMeters).toBeGreaterThan(0); expect(result.points.at(-1)!.distanceFromStart).toBeGreaterThan(result.points[1].distanceFromStart) })
  it('marks night samples as indeterminate', () => { const result = calculateShade(fallbackRoutes[0], [building], new Date('2026-07-25T00:00:00+09:00')); expect(result.audit.indeterminatePointCount).toBe(result.points.length); expect(result.shadePercent).toBe(0) })
  it('excludes PLATEAU coverage outside segments from the shade ratio', () => { const route = { ...fallbackRoutes[0], coordinates: fallbackRoutes[0].coordinates.slice(0, 2) }; const result = calculateShade(route, [], new Date('2026-07-25T12:00:00+09:00'), undefined, [[132.4748, 34.3974, 132.4755, 34.3981]]); expect(result.audit.outsideCoveragePointCount).toBeGreaterThan(0); expect(result.outsideCoverageDistanceMeters).toBeGreaterThan(0); expect(result.shadePercent).toBe(0) })
})
