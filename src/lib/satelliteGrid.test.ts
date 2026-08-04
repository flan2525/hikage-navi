import { describe, expect, it } from 'vitest'
import type { SatelliteNumericGridMetadata } from '../types'
import { decodeInt16LittleEndian, encodeInt16LittleEndian, gridCoordinateForPosition, sampleNumericGrid } from './satelliteGrid'

const metadata: SatelliteNumericGridMetadata = { dataUrl: '/grid.bin', dataType: 'Int16', byteOrder: 'little-endian', scale: .1, offset: 1, noData: -32768, width: 4, height: 2, bounds: [132, 34, 132.004, 34.002], crs: 'EPSG:4326', rowOrder: 'north-to-south', cellSizeMeters: 10, nativeResolutionMeters: 10, displayResolutionMeters: 10, validPixelRatio: 1 }

describe('satellite numeric grid', () => {
  it('encodes and decodes little-endian Int16 values and preserves NoData', () => {
    const buffer = encodeInt16LittleEndian([428, -32768, 3150])
    expect([...decodeInt16LittleEndian(buffer, 3, 1)]).toEqual([428, -32768, 3150])
  })

  it('maps north/south/east/west boundaries to the correct nearest cells', () => {
    expect(gridCoordinateForPosition(metadata, { lng: 132, lat: 34.002 })).toMatchObject({ row: 0, column: 0 })
    expect(gridCoordinateForPosition(metadata, { lng: 132.004, lat: 34 })).toMatchObject({ row: 1, column: 3 })
    expect(gridCoordinateForPosition(metadata, { lng: 132.0021, lat: 34.0011 })).toMatchObject({ row: 0, column: 2 })
    expect(gridCoordinateForPosition(metadata, { lng: 131.9, lat: 34.001 })).toBeNull()
  })

  it('uses nearest-neighbor cells, applies scale/offset, and returns NoData as null', () => {
    const values = decodeInt16LittleEndian(encodeInt16LittleEndian([428, -32768, 600, 700, 800, 900, 1000, 1100]), 4, 2)
    const grid = { metadata, values }
    expect(sampleNumericGrid(grid, { lng: 132.0002, lat: 34.0018 })).toMatchObject({ row: 0, column: 0, inBounds: true })
    expect(sampleNumericGrid(grid, { lng: 132.0002, lat: 34.0018 }).value).toBeCloseTo(43.8)
    expect(sampleNumericGrid(grid, { lng: 132.0012, lat: 34.0018 }).value).toBeNull()
    expect(sampleNumericGrid(grid, { lng: 131.9, lat: 34.0018 }).inBounds).toBe(false)
  })
})
