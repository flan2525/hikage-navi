import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { gzipSync } from 'node:zlib'
import { convertCityGml } from './lib/plateau-conversion.mjs'
import { plateauConfig } from './plateau-config.mjs'

const xmlByMesh = new Map()
const targetFeatures = new Map()
const targetStats = new Map()
const COVERAGE_GRID_DEGREES = 0.001
const cellKey = (lng, lat) => `${Math.floor(lng / COVERAGE_GRID_DEGREES)}:${Math.floor(lat / COVERAGE_GRID_DEGREES)}`
const featureCoordinates = (feature) => {
  const coordinates = feature.geometry?.coordinates ?? []
  const flat = []
  const visit = (value) => { if (Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number') flat.push(value); else if (Array.isArray(value)) value.forEach(visit) }
  visit(coordinates)
  return flat
}
const coverageCells = (features, excluded = new Set()) => {
  const cells = new Set()
  for (const feature of features) for (const [lng, lat] of featureCoordinates(feature)) cells.add(cellKey(lng, lat))
  return [...cells].filter((key) => !excluded.has(key)).map((key) => {
    const [x, y] = key.split(':').map(Number); const minLng = x * COVERAGE_GRID_DEGREES; const minLat = y * COVERAGE_GRID_DEGREES
    return [[[minLng, minLat], [minLng + COVERAGE_GRID_DEGREES, minLat], [minLng + COVERAGE_GRID_DEGREES, minLat + COVERAGE_GRID_DEGREES], [minLng, minLat + COVERAGE_GRID_DEGREES], [minLng, minLat]]]
  })
}
for (const dataset of plateauConfig.datasets) {
  const features = []
  const stats = { parsed: 0, outsideTarget: 0, invalidFootprint: 0, noHeight: 0, measuredHeight: 0, geometryHeight: 0 }
  for (const source of plateauConfig.sourceFiles.filter((item) => dataset.meshCodes.includes(item.meshCode))) {
    const xml = xmlByMesh.get(source.meshCode) ?? await readFile(source.path, 'utf8')
    xmlByMesh.set(source.meshCode, xml)
    const converted = convertCityGml(xml, { ...plateauConfig, target: { name: dataset.label, bbox: dataset.bbox, bufferMeters: dataset.bufferMeters }, meshCode: source.meshCode })
    features.push(...converted.features)
    for (const key of Object.keys(stats)) stats[key] += converted.stats[key]
  }
  targetFeatures.set(dataset.id, features)
  targetStats.set(dataset.id, stats)
}
const manifestDatasets = []
const baseCoverage = new Set()
for (const dataset of plateauConfig.datasets.filter((item) => !item.id.startsWith('corridor-'))) for (const cell of coverageCells([...new Map(targetFeatures.get(dataset.id).map((feature) => [feature.properties.id, feature])).values()])) { const [lng, lat] = cell[0][0]; baseCoverage.add(cellKey(lng, lat)) }
for (const dataset of plateauConfig.datasets) {
  const features = [...new Map(targetFeatures.get(dataset.id).map((feature) => [feature.properties.id, feature])).values()]
  const stats = targetStats.get(dataset.id)
  features.sort((a, b) => a.properties.id.localeCompare(b.properties.id))
  const collection = { type: 'FeatureCollection', name: `hiroshima-${dataset.id}-plateau-buildings`, features }
  await mkdir(dirname(dataset.output), { recursive: true })
  await writeFile(dataset.output, JSON.stringify(collection))
  const fileSizeBytes = (await stat(dataset.output)).size
  const duplicateBuildingCount = targetFeatures.get(dataset.id).length - features.length
  const effectiveCoverage = coverageCells(features, dataset.id.startsWith('corridor-') ? new Set(baseCoverage) : new Set())
  manifestDatasets.push({ id: dataset.id, label: dataset.label, url: dataset.output.slice('public'.length), areaIds: dataset.areaIds, routeKeys: dataset.routeKeys, bounds: dataset.bbox, coverage: { type: 'MultiPolygon', coordinates: effectiveCoverage, gridSizeDegrees: COVERAGE_GRID_DEGREES }, supplemental: dataset.id.startsWith('corridor-'), buildingCount: features.length, dataYear: plateauConfig.dataYear, version: 'v1', fileSizeBytes, gzipBytes: gzipSync(JSON.stringify(collection)).length, measuredHeightCount: stats.measuredHeight, geometryHeightCount: stats.geometryHeight, heightExcludedCount: stats.noHeight, duplicateBuildingCount, meshCodes: dataset.meshCodes, source: 'PLATEAU広島市 2024年度・仕様4.1・CityGML 2.0 / PLATEAU Data License 1.0' })
  console.log(`${dataset.id}: ${features.length} buildings, ${(fileSizeBytes / 1024 / 1024).toFixed(2)} MiB`)
}
await writeFile('public/data/plateau/areas.json', JSON.stringify({ version: 1, source: 'PLATEAU Hiroshima 2024', datasets: manifestDatasets }, null, 2))
