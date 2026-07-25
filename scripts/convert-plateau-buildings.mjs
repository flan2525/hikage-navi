import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { convertCityGml, sourceCrs } from './lib/plateau-conversion.mjs'
import { plateauConfig } from './plateau-config.mjs'

const allFeatures = []
const sourceStats = []
for (const source of plateauConfig.sourceFiles) {
  const xml = await readFile(source.path, 'utf8')
  const { features, stats } = convertCityGml(xml, { ...plateauConfig, meshCode: source.meshCode })
  allFeatures.push(...features)
  sourceStats.push({ meshCode: source.meshCode, maxLod: source.maxLod, sourceCrs: sourceCrs(xml), ...stats, written: features.length })
}
allFeatures.sort((a, b) => a.properties.id.localeCompare(b.properties.id))
const collection = { type: 'FeatureCollection', name: 'hiroshima-central-plateau-buildings', features: allFeatures }
await mkdir(dirname(plateauConfig.output.geojson), { recursive: true })
await writeFile(plateauConfig.output.geojson, JSON.stringify(collection))
const geojsonBytes = (await stat(plateauConfig.output.geojson)).size
const metadata = {
  ...plateauConfig,
  generatedAt: new Date().toISOString(),
  buildingCount: allFeatures.length,
  geojsonBytes,
  sourceStats,
}
await writeFile(plateauConfig.output.metadata, JSON.stringify(metadata, null, 2))
console.log(`PLATEAU building conversion complete: ${allFeatures.length} buildings, ${(geojsonBytes / 1024 / 1024).toFixed(2)} MiB`)
