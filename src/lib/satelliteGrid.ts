import type { Position, SatelliteNumericGridMetadata } from '../types'

export type DecodedSatelliteGrid = {
  metadata: SatelliteNumericGridMetadata
  values: Int16Array
}

export type GridSample = {
  inBounds: boolean
  row: number | null
  column: number | null
  pixelKey: string | null
  value: number | null
}

export function encodeInt16LittleEndian(values: ArrayLike<number>): ArrayBuffer {
  const buffer = new ArrayBuffer(values.length * 2)
  const view = new DataView(buffer)
  for (let index = 0; index < values.length; index += 1) view.setInt16(index * 2, values[index], true)
  return buffer
}

export function decodeInt16LittleEndian(buffer: ArrayBuffer, width: number, height: number): Int16Array {
  if (buffer.byteLength !== width * height * 2) throw new Error(`衛星数値グリッドのサイズが不正です（${buffer.byteLength} bytes）`)
  const values = new Int16Array(width * height)
  const view = new DataView(buffer)
  for (let index = 0; index < values.length; index += 1) values[index] = view.getInt16(index * 2, true)
  return values
}

export function gridCoordinateForPosition(metadata: SatelliteNumericGridMetadata, position: Position): { row: number; column: number; pixelKey: string } | null {
  const [minLng, minLat, maxLng, maxLat] = metadata.bounds
  if (!Number.isFinite(position.lng) || !Number.isFinite(position.lat) || position.lng < minLng || position.lng > maxLng || position.lat < minLat || position.lat > maxLat) return null
  const column = Math.min(metadata.width - 1, Math.max(0, Math.floor((position.lng - minLng) / (maxLng - minLng) * metadata.width)))
  const row = Math.min(metadata.height - 1, Math.max(0, Math.floor((maxLat - position.lat) / (maxLat - minLat) * metadata.height)))
  return { row, column, pixelKey: `${row}:${column}` }
}

export function sampleNumericGrid(grid: DecodedSatelliteGrid, position: Position): GridSample {
  const coordinate = gridCoordinateForPosition(grid.metadata, position)
  if (!coordinate) return { inBounds: false, row: null, column: null, pixelKey: null, value: null }
  const raw = grid.values[coordinate.row * grid.metadata.width + coordinate.column]
  const value = raw === grid.metadata.noData ? null : raw * grid.metadata.scale + grid.metadata.offset
  return { inBounds: true, row: coordinate.row, column: coordinate.column, pixelKey: coordinate.pixelKey, value }
}
