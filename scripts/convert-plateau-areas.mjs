import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { convertCityGml } from './lib/plateau-conversion.mjs'
import { plateauConfig } from './plateau-config.mjs'

const xmlByMesh = new Map()
const targetFeatures = new Map()
for (const dataset of plateauConfig.datasets) {
  const features = []
  for (const source of plateauConfig.sourceFiles.filter((item) => dataset.meshCodes.includes(item.meshCode))) {
    const xml = xmlByMesh.get(source.meshCode) ?? await readFile(source.path, 'utf8')
    xmlByMesh.set(source.meshCode, xml)
    features.push(...convertCityGml(xml, { ...plateauConfig, target: { name: dataset.label, bbox: dataset.bbox, bufferMeters: dataset.bufferMeters }, meshCode: source.meshCode }).features)
  }
  targetFeatures.set(dataset.id, features)
}
const manifestDatasets = []
for (const dataset of plateauConfig.datasets) {
  const features = targetFeatures.get(dataset.id)
  features.sort((a, b) => a.properties.id.localeCompare(b.properties.id))
  const collection = { type: 'FeatureCollection', name: `hiroshima-${dataset.id}-plateau-buildings`, features }
  await mkdir(dirname(dataset.output), { recursive: true })
  await writeFile(dataset.output, JSON.stringify(collection))
  const fileSizeBytes = (await stat(dataset.output)).size
  manifestDatasets.push({ id: dataset.id, label: dataset.label, url: dataset.output.slice('public'.length), areaIds: dataset.areaIds, routeKeys: dataset.routeKeys, bounds: dataset.bbox, buildingCount: features.length, dataYear: plateauConfig.dataYear, version: 'v1', fileSizeBytes, source: 'PLATEAU広島市 2024年度・仕様4.1・CityGML 2.0 / PLATEAU Data License 1.0' })
  console.log(`${dataset.id}: ${features.length} buildings, ${(fileSizeBytes / 1024 / 1024).toFixed(2)} MiB`)
}
await writeFile('public/data/plateau/areas.json', JSON.stringify({ version: 1, source: 'PLATEAU Hiroshima 2024', datasets: manifestDatasets }, null, 2))
