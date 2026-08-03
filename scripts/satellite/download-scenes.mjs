import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fetchJson, formatBytes, signedAssetHref } from './lib.mjs'

const root = resolve(import.meta.dirname, '../..')
const config = JSON.parse(await readFile(resolve(root, 'scripts/satellite/scene-config.json'), 'utf8'))
const outputRoot = resolve(root, 'data/raw/satellite')
await mkdir(outputRoot, { recursive: true })

for (const group of Object.values(config.selected)) {
  const item = await fetchJson(`${config.stacApi}/collections/${group.collection}/items/${group.item}`)
  const sceneDir = resolve(outputRoot, group.id)
  await mkdir(sceneDir, { recursive: true })
  const manifest = { id: group.id, collection: group.collection, item: group.item, properties: item.properties, bbox: item.bbox, assets: {} }
  for (const key of group.assetKeys) {
    const asset = item.assets[key]
    if (!asset?.href) throw new Error(`${group.item} の ${key} 資産が見つかりません`)
    const signedHref = await signedAssetHref(asset.href)
    const filename = asset.href.split('/').pop()
    const outputPath = resolve(sceneDir, filename)
    let bytes
    try {
      bytes = (await stat(outputPath)).size
      if (!bytes) throw new Error('empty')
      console.log(`${group.id} ${key}: 既存ファイルを再利用 ${formatBytes(bytes)}`)
    } catch {
      const response = await fetch(signedHref)
      if (!response.ok) throw new Error(`${key} の取得に失敗しました: ${response.status} ${response.statusText}`)
      const data = Buffer.from(await response.arrayBuffer())
      await writeFile(outputPath, data)
      bytes = data.byteLength
      console.log(`${group.id} ${key}: ${formatBytes(bytes)}`)
    }
    manifest.assets[key] = { href: asset.href, path: filename, bytes, type: asset.type, title: asset.title }
  }
  await writeFile(resolve(sceneDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
}
