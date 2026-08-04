import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const manifest = JSON.parse(await readFile(resolve(root, 'public/data/satellite/metadata.json'), 'utf8'))

const points = [
  ['hiroshima-station-south', '広島駅南口', 132.4753, 34.3978, '駅前・建物密集'],
  ['hacchobori', '八丁堀', 132.4644, 34.3968, '交差点・商業地'],
  ['hondori', '本通', 132.4602, 34.3946, '商店街・アーケード近傍'],
  ['atomic-bomb-dome', '原爆ドーム周辺', 132.4537, 34.3955, '河川沿い・開放地'],
  ['peace-memorial-park', '平和記念公園', 132.4527, 34.3928, '公園・樹木要因'],
  ['astram-hakushima', 'アストラムライン白島駅', 132.4627488, 34.4109218, '駅前'],
  ['jr-yokogawa', 'JR横川駅', 132.4503303, 34.4102588, '駅前・商業地'],
  ['jr-nishi-hiroshima', 'JR西広島駅', 132.4281626, 34.3981397, '駅前・丘陵周辺'],
]

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)) }
function format(value, digits = 3) { return value == null ? 'NoData' : value.toFixed(digits) }
function interpolateColor(stops, value) {
  if (!stops?.length || value == null) return 'NoData'
  if (value <= stops[0][0]) return stops[0][1]
  if (value >= stops.at(-1)[0]) return stops.at(-1)[1]
  for (let index = 1; index < stops.length; index += 1) {
    const [rightValue, rightColor] = stops[index]
    const [leftValue, leftColor] = stops[index - 1]
    if (value <= rightValue) return `${leftColor}→${rightColor}`
  }
  return stops.at(-1)[1]
}
async function readGrid(layer) {
  const bytes = await readFile(resolve(root, `public${layer.numericGrid.dataUrl}`))
  const values = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2)
  return { layer, values }
}
function sample(grid, lng, lat) {
  const { layer, values } = grid
  const [west, south, east, north] = layer.numericGrid.bounds
  if (lng < west || lng > east || lat < south || lat > north) return null
  const column = clamp(Math.floor((lng - west) / (east - west) * layer.numericGrid.width), 0, layer.numericGrid.width - 1)
  const row = clamp(Math.floor((north - lat) / (north - south) * layer.numericGrid.height), 0, layer.numericGrid.height - 1)
  const raw = values[row * layer.numericGrid.width + column]
  return raw === layer.numericGrid.noData ? null : { row, column, value: raw * layer.numericGrid.scale + layer.numericGrid.offset }
}

const grids = await Promise.all(manifest.layers.map(readGrid))
console.log('# 衛星代表地点サンプリング')
console.log('')
console.log(`生成メタデータ: ${manifest.generatedAt}`)
console.log('')
console.log('| 地点 | 用途のメモ | LST (°C) | LSTセル | LST表示色帯 | NDVI | NDVIセル | NDVI表示色帯 |')
console.log('|---|---|---:|---|---|---:|---|---|')
for (const [, name, lng, lat, note] of points) {
  const lstGrid = grids.find(({ layer }) => layer.type === 'land-surface-temperature')
  const ndviGrid = grids.find(({ layer }) => layer.type === 'ndvi')
  const lst = sample(lstGrid, lng, lat)
  const ndvi = sample(ndviGrid, lng, lat)
  console.log(`| ${name} | ${note} | ${format(lst?.value)} | ${lst ? `${lst.column},${lst.row}` : 'NoData'} | ${interpolateColor(lstGrid.layer.colorStops, lst?.value)} | ${format(ndvi?.value)} | ${ndvi ? `${ndvi.column},${ndvi.row}` : 'NoData'} | ${interpolateColor(ndviGrid.layer.colorStops, ndvi?.value)} |`)
}
console.log('')
console.log('判定: 表の値は数値グリッドの最近傍セル値。表示色帯は同じセル値をmetadata.jsonのcolorStopsへ渡した区間の記録であり、現地の実測温度・樹冠率・日陰を意味しない。')
