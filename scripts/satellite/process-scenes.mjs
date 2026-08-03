import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fromFile } from 'geotiff'
import sharp from 'sharp'
import { computeTargetBounds, formatBytes } from './lib.mjs'
import { isLandsatQaValid, isSentinelSclValid, landsatSurfaceTemperatureCelsius, ndviFromDigitalNumbers } from './math.mjs'

const root = resolve(import.meta.dirname, '../..')
const rawRoot = resolve(root, 'data/raw/satellite')
const outputRoot = resolve(root, 'public/data/satellite')
await mkdir(resolve(outputRoot, 'preview'), { recursive: true })

const config = JSON.parse(await readFile(resolve(root, 'scripts/satellite/scene-config.json'), 'utf8'))
const target = await computeTargetBounds({ projectRoot: root, routesFile: process.env.SATELLITE_ROUTES_FILE })
const EARTH_RADIUS = 6_378_137

function wgs84ToUtm(lng, lat, zone = 53) {
  const a = 6378137
  const eccSquared = 0.00669438
  const k0 = 0.9996
  const latRad = lat * Math.PI / 180
  const lngRad = lng * Math.PI / 180
  const longOrigin = (zone - 1) * 6 - 180 + 3
  const longOriginRad = longOrigin * Math.PI / 180
  const eccPrimeSquared = eccSquared / (1 - eccSquared)
  const N = a / Math.sqrt(1 - eccSquared * Math.sin(latRad) ** 2)
  const T = Math.tan(latRad) ** 2
  const C = eccPrimeSquared * Math.cos(latRad) ** 2
  const A = Math.cos(latRad) * (lngRad - longOriginRad)
  const M = a * ((1 - eccSquared / 4 - 3 * eccSquared ** 2 / 64 - 5 * eccSquared ** 3 / 256) * latRad - (3 * eccSquared / 8 + 3 * eccSquared ** 2 / 32 + 45 * eccSquared ** 3 / 1024) * Math.sin(2 * latRad) + (15 * eccSquared ** 2 / 256 + 45 * eccSquared ** 3 / 1024) * Math.sin(4 * latRad) - (35 * eccSquared ** 3 / 3072) * Math.sin(6 * latRad))
  return {
    easting: k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T ** 2 + 72 * C - 58 * eccPrimeSquared) * A ** 5 / 120) + 500000,
    northing: k0 * (M + N * Math.tan(latRad) * (A ** 2 / 2 + (5 - T + 9 * C + 4 * C ** 2) * A ** 4 / 24 + (61 - 58 * T + T ** 2 + 600 * C - 330 * eccPrimeSquared) * A ** 6 / 720)),
  }
}

function readWindowForPoint(image, bounds, lng, lat, pixelSize) {
  const { easting, northing } = wgs84ToUtm(lng, lat)
  const x = Math.floor((easting - bounds[0]) / pixelSize)
  const y = Math.floor((bounds[3] - northing) / pixelSize)
  return [x, y]
}

async function raster(path, requestedBounds) {
  const tiff = await fromFile(path)
  const image = await tiff.getImage()
  const imageBounds = image.getBoundingBox()
  const [pixelX, pixelY] = image.getResolution()
  const pixelSize = Math.abs(pixelX)
  if (image.getGeoKeys()?.ProjectedCSTypeGeoKey !== 32653) throw new Error(`${path} のCRSがEPSG:32653ではありません`)
  const corners = [
    readWindowForPoint(image, imageBounds, requestedBounds[0], requestedBounds[3], pixelSize),
    readWindowForPoint(image, imageBounds, requestedBounds[2], requestedBounds[1], pixelSize),
  ]
  const x0 = Math.max(0, Math.min(corners[0][0], corners[1][0]) - 2)
  const y0 = Math.max(0, Math.min(corners[0][1], corners[1][1]) - 2)
  const x1 = Math.min(image.getWidth(), Math.max(corners[0][0], corners[1][0]) + 3)
  const y1 = Math.min(image.getHeight(), Math.max(corners[0][1], corners[1][1]) + 3)
  const values = await image.readRasters({ window: [x0, y0, x1, y1], interleave: true })
  return { image, values, x0, y0, width: x1 - x0, height: y1 - y0, imageBounds, pixelSize }
}

function sample(data, lng, lat) {
  const [x, y] = readWindowForPoint(data.image, data.imageBounds, lng, lat, data.pixelSize)
  const localX = Math.max(0, Math.min(data.width - 1, x - data.x0))
  const localY = Math.max(0, Math.min(data.height - 1, y - data.y0))
  return Number(data.values[localY * data.width + localX])
}

function outputSize(bounds, displayResolutionMeters) {
  const centerLat = (bounds[1] + bounds[3]) / 2 * Math.PI / 180
  const widthMeters = (bounds[2] - bounds[0]) * Math.PI / 180 * EARTH_RADIUS * Math.cos(centerLat)
  const heightMeters = (bounds[3] - bounds[1]) * Math.PI / 180 * EARTH_RADIUS
  return { width: Math.max(1, Math.ceil(widthMeters / displayResolutionMeters)), height: Math.max(1, Math.ceil(heightMeters / displayResolutionMeters)) }
}

function rgba(hex, alpha) {
  const value = hex.replace('#', '')
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16), alpha]
}

function interpolateColor(stops, value) {
  if (value <= stops[0][0]) return stops[0][1]
  if (value >= stops[stops.length - 1][0]) return stops[stops.length - 1][1]
  for (let index = 1; index < stops.length; index += 1) {
    if (value > stops[index][0]) continue
    const [a, colorA] = stops[index - 1]
    const [b, colorB] = stops[index]
    const ratio = (value - a) / (b - a)
    return colorA.map((channel, channelIndex) => Math.round(channel + (colorB[channelIndex] - channel) * ratio))
  }
  return stops[stops.length - 1][1]
}

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const quantile = (ratio) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))]
  return { min: sorted[0], max: sorted[sorted.length - 1], q05: quantile(.05), q50: quantile(.5), q95: quantile(.95) }
}

async function writeImage(id, pixels, width, height) {
  const filename = `${id}.webp`
  const previewFilename = `${id}.png`
  const input = sharp(Buffer.from(pixels), { raw: { width, height, channels: 4 } })
  await input.clone().webp({ quality: 86, alphaQuality: 100 }).toFile(resolve(outputRoot, filename))
  await input.clone().png().toFile(resolve(outputRoot, 'preview', previewFilename))
  const imageStat = await stat(resolve(outputRoot, filename))
  const previewStat = await stat(resolve(outputRoot, 'preview', previewFilename))
  console.log(`${filename}: ${formatBytes(imageStat.size)}, preview: ${formatBytes(previewStat.size)} (${width}x${height})`)
  return { imageUrl: `/data/satellite/${filename}`, previewUrl: `/data/satellite/preview/${previewFilename}`, imageBytes: imageStat.size, previewBytes: previewStat.size, width, height }
}

const landsat = config.selected.landsat
const landsatDir = resolve(rawRoot, landsat.id)
const landsatManifest = JSON.parse(await readFile(resolve(landsatDir, 'manifest.json'), 'utf8'))
const lstRaster = await raster(resolve(landsatDir, landsatManifest.assets.lwir11.path), target.bounds)
const lstQa = await raster(resolve(landsatDir, landsatManifest.assets.qa_pixel.path), target.bounds)
const lstSize = outputSize(target.bounds, 30)
const lstPixels = new Uint8Array(lstSize.width * lstSize.height * 4)
const lstValues = []
const lstStopsBase = [[0, rgba('#2e3a9b', 220)], [1, rgba('#278bc4', 220)], [2, rgba('#f1d45b', 225)], [3, rgba('#ef8a42', 230)], [4, rgba('#c73639', 235)]]
for (let y = 0; y < lstSize.height; y += 1) for (let x = 0; x < lstSize.width; x += 1) {
  const lng = target.bounds[0] + (x + .5) / lstSize.width * (target.bounds[2] - target.bounds[0])
  const lat = target.bounds[3] - (y + .5) / lstSize.height * (target.bounds[3] - target.bounds[1])
  const dn = sample(lstRaster, lng, lat)
  const qa = sample(lstQa, lng, lat)
  const invalid = !isLandsatQaValid(dn, qa)
  const offset = (y * lstSize.width + x) * 4
  if (invalid) { lstPixels[offset + 3] = 0; continue }
  const celsius = landsatSurfaceTemperatureCelsius(dn)
  lstValues.push(celsius)
  lstPixels.set([0, 0, 0, 255], offset)
}
const lstStats = stats(lstValues)
const lstColorStops = [[lstStats.q05, '#2e3a9b'], [lstStats.q50, '#f1d45b'], [lstStats.q95, '#c73639']]
for (let y = 0; y < lstSize.height; y += 1) for (let x = 0; x < lstSize.width; x += 1) {
  const lng = target.bounds[0] + (x + .5) / lstSize.width * (target.bounds[2] - target.bounds[0])
  const lat = target.bounds[3] - (y + .5) / lstSize.height * (target.bounds[3] - target.bounds[1])
  const dn = sample(lstRaster, lng, lat)
  const qa = sample(lstQa, lng, lat)
  if (!isLandsatQaValid(dn, qa)) continue
  const celsius = landsatSurfaceTemperatureCelsius(dn)
  const lower = lstStats.q05
  const upper = lstStats.q95
  const t = Math.max(0, Math.min(1, (celsius - lower) / Math.max(.001, upper - lower)))
  const mapped = interpolateColor(lstStopsBase, t * 4)
  const offset = (y * lstSize.width + x) * 4
  lstPixels.set(mapped, offset)
}
const lstImage = await writeImage(landsat.id, lstPixels, lstSize.width, lstSize.height)

const sentinel = config.selected.sentinel2
const sentinelDir = resolve(rawRoot, sentinel.id)
const sentinelManifest = JSON.parse(await readFile(resolve(sentinelDir, 'manifest.json'), 'utf8'))
const redRaster = await raster(resolve(sentinelDir, sentinelManifest.assets.B04.path), target.bounds)
const nirRaster = await raster(resolve(sentinelDir, sentinelManifest.assets.B08.path), target.bounds)
const sclRaster = await raster(resolve(sentinelDir, sentinelManifest.assets.SCL.path), target.bounds)
const ndviSize = outputSize(target.bounds, 10)
const ndviPixels = new Uint8Array(ndviSize.width * ndviSize.height * 4)
const ndviValues = []
const ndviStops = [[-1, rgba('#53636a', 35)], [0, rgba('#6c6b5e', 60)], [.2, rgba('#9c9b61', 145)], [.5, rgba('#55a66f', 220)], [.8, rgba('#1f8f58', 230)], [1, rgba('#0a633f', 235)]]
for (let y = 0; y < ndviSize.height; y += 1) for (let x = 0; x < ndviSize.width; x += 1) {
  const lng = target.bounds[0] + (x + .5) / ndviSize.width * (target.bounds[2] - target.bounds[0])
  const lat = target.bounds[3] - (y + .5) / ndviSize.height * (target.bounds[3] - target.bounds[1])
  const scl = sample(sclRaster, lng, lat)
  const offset = (y * ndviSize.width + x) * 4
  const value = ndviFromDigitalNumbers(sample(nirRaster, lng, lat), sample(redRaster, lng, lat))
  if (!isSentinelSclValid(scl) || value == null) { ndviPixels[offset + 3] = 0; continue }
  ndviValues.push(value)
  ndviPixels.set(interpolateColor(ndviStops, value), offset)
}
const ndviStats = stats(ndviValues)
const ndviImage = await writeImage(sentinel.id, ndviPixels, ndviSize.width, ndviSize.height)

const landsatItemUrl = `${config.stacApi}/collections/${landsat.collection}/items/${landsat.item}`
const sentinelItemUrl = `${config.stacApi}/collections/${sentinel.collection}/items/${sentinel.item}`
const metadata = {
  generatedAt: new Date().toISOString(),
  target: { bounds: target.bounds, sourceBounds: target.sourceBounds, marginMeters: target.marginMeters, pointCount: target.pointCount },
  layers: [
    {
      id: landsat.id, type: 'land-surface-temperature', label: '地表面温度', observedAt: '2026-07-23T01:40:39.524309Z', source: 'USGS Landsat Collection 2 Level-2 via Microsoft Planetary Computer', satellite: 'Landsat 9', sensor: 'OLI-2 / TIRS', product: 'Collection 2 Level-2 Surface Temperature', bounds: target.bounds, resolutionMeters: 30, nativeResolutionMeters: 100, displayResolutionMeters: 30, cloudCover: 8.23, validPixelRatio: lstValues.length / (lstSize.width * lstSize.height), unit: '°C', min: lstStats.min, max: lstStats.max, colorStops: lstColorStops.map(([value, color]) => [value, color]), imageUrl: lstImage.imageUrl, previewUrl: lstImage.previewUrl, sourceUrl: landsatItemUrl, attribution: 'U.S. Geological Survey / NASA Landsat 9; processed from Collection 2 Level-2 ST_B10 and QA_PIXEL', license: 'USGS Landsat data policy / public domain', version: 'v1', limitations: ['地表面温度であり、現在の気温ではありません。', 'TIRSの元熱赤外観測は約100mで、表示画像は30mグリッドへ再配置しています。', '雲・雲影・雪・NoDataをQA_PIXELで除外しています。', '観測日時は2026-07-23 01:40 UTC（日本時間10:40頃）です。'], processing: { scale: 'ST_K = DN × 0.00341802 + 149.0; °C = K - 273.15', qaPixelInvalidBits: [0, 1, 2, 3, 4, 5], imageBytes: lstImage.imageBytes, previewBytes: lstImage.previewBytes, width: lstImage.width, height: lstImage.height }, rawAssets: landsatManifest.assets,
    },
    {
      id: sentinel.id, type: 'ndvi', label: '植生（NDVI）', observedAt: '2026-07-24T01:56:49.024Z', source: 'Copernicus Sentinel-2 Level-2A via Microsoft Planetary Computer', satellite: 'Sentinel-2B', sensor: 'MSI', product: 'Level-2A Surface Reflectance', bounds: target.bounds, resolutionMeters: 10, nativeResolutionMeters: 10, displayResolutionMeters: 10, cloudCover: 2.92, validPixelRatio: ndviValues.length / (ndviSize.width * ndviSize.height), unit: 'NDVI', min: ndviStats.min, max: ndviStats.max, colorStops: ndviStops.map(([value, color]) => [value, `rgba(${color[0]},${color[1]},${color[2]},${(color[3] / 255).toFixed(2)})`]), imageUrl: ndviImage.imageUrl, previewUrl: ndviImage.previewUrl, sourceUrl: sentinelItemUrl, attribution: 'Copernicus Sentinel data 2026, processed by European Space Agency / Microsoft Planetary Computer; B04, B08, SCL', license: 'Copernicus Sentinel Data Terms and Conditions', version: 'v1', limitations: ['植生・緑被の傾向を示すNDVIで、樹木一本の形状や正確な影ではありません。', 'B04/B08は10mグリッドで処理しています。', 'SCLの雲・雲影・NoData・欠損・飽和クラスを除外しています。', '観測日時は2026-07-24 01:56 UTC（日本時間10:56頃）です。'], processing: { formula: 'NDVI = (B08 - B04) / (B08 + B04)', reflectanceScale: 'reflectance = DN / 10000', maskedSclClasses: [0, 1, 3, 7, 8, 9, 10, 11], imageBytes: ndviImage.imageBytes, previewBytes: ndviImage.previewBytes, width: ndviImage.width, height: ndviImage.height }, rawAssets: sentinelManifest.assets,
    },
  ],
}
await writeFile(resolve(outputRoot, 'metadata.json'), JSON.stringify(metadata, null, 2))
console.log(`metadata.json: ${formatBytes((await stat(resolve(outputRoot, 'metadata.json'))).size)}`)
