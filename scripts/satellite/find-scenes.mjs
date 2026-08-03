import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { computeTargetBounds, fetchJson } from './lib.mjs'

const root = resolve(import.meta.dirname, '../..')
const config = JSON.parse(await (await import('node:fs/promises')).readFile(resolve(root, 'scripts/satellite/scene-config.json'), 'utf8'))
const target = await computeTargetBounds({ projectRoot: root, routesFile: process.env.SATELLITE_ROUTES_FILE })
const start = process.env.SATELLITE_START ?? '2024-06-01T00:00:00Z'
const end = process.env.SATELLITE_END ?? new Date().toISOString()
const maxCloud = Number(process.env.SATELLITE_MAX_CLOUD ?? 30)

async function search(collection) {
  const response = await fetchJson(`${config.stacApi}/search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ collections: [collection], bbox: target.bounds, datetime: `${start}/${end}`, limit: 100, query: { 'eo:cloud_cover': { lt: maxCloud } } }),
  })
  return response.features.map((item) => ({ id: item.id, collection, datetime: item.properties.datetime, platform: item.properties.platform, cloudCover: item.properties['eo:cloud_cover'], tile: item.properties['s2:mgrs_tile'], bbox: item.bbox }))
}

const result = { generatedAt: new Date().toISOString(), target, queries: { start, end, maxCloud }, landsat: await search('landsat-c2-l2'), sentinel2: await search('sentinel-2-l2a') }
await writeFile(resolve(root, 'data/raw/satellite-scene-search.json'), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
