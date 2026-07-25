import { describe, expect, it } from 'vitest'
import { fallbackRoutes } from '../data/hiroshima'
import { calculateShade } from './shade'
import { APP_VERSION, buildShadeValidationRecord } from './shadeValidation'

describe('shade validation record', () => {
  it('serializes the route, sun data, and explicit note', () => {
    const result = calculateShade(fallbackRoutes[0], [], new Date('2026-07-25T12:00:00+09:00'))
    const record = buildShadeValidationRecord(fallbackRoutes[0], result, undefined, new Date('2026-07-25T12:00:00+09:00'), 'photo-001')
    expect(record.appVersion).toBe(APP_VERSION)
    expect(record.route.coordinates).toHaveLength(fallbackRoutes[0].coordinates.length)
    expect(record.note).toBe('photo-001')
    expect(JSON.parse(JSON.stringify(record)).sun.shadowBearing).toBe(result.audit.shadowBearing)
  })
})
