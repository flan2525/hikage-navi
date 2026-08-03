import { describe, expect, it } from 'vitest'
import { isLandsatQaValid, isSentinelSclValid, landsatSurfaceTemperatureCelsius, ndviFromDigitalNumbers, sentinelReflectance } from './math.mjs'

describe('satellite processing formulas', () => {
  it('applies the official Landsat Collection 2 ST scale and Kelvin offset', () => {
    expect(landsatSurfaceTemperatureCelsius(44947)).toBeCloseTo(29.48, 2)
  })
  it('masks Landsat fill, cloud, cloud shadow, cirrus, dilated cloud, and snow bits', () => {
    expect(isLandsatQaValid(0, 0)).toBe(false)
    expect(isLandsatQaValid(1000, 1 << 3)).toBe(false)
    expect(isLandsatQaValid(1000, 1 << 4)).toBe(false)
    expect(isLandsatQaValid(1000, 0)).toBe(true)
  })
  it('converts Sentinel-2 DN to reflectance and calculates NDVI', () => {
    expect(sentinelReflectance(5000)).toBeCloseTo(.5)
    expect(ndviFromDigitalNumbers(7000, 3000)).toBeCloseTo(.4)
  })
  it('returns null for NDVI zero denominator and masks invalid SCL classes', () => {
    expect(ndviFromDigitalNumbers(0, 0)).toBeNull()
    expect(isSentinelSclValid(0)).toBe(false)
    expect(isSentinelSclValid(3)).toBe(false)
    expect(isSentinelSclValid(8)).toBe(false)
    expect(isSentinelSclValid(4)).toBe(true)
    expect(isSentinelSclValid(6)).toBe(true)
  })
})
