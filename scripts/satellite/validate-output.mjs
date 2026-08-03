import { readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

const root = resolve(import.meta.dirname, '../..')
const metadataPath = resolve(root, 'public/data/satellite/metadata.json')
const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
if (!Array.isArray(metadata.layers) || metadata.layers.length !== 2) throw new Error('衛星レイヤーは2件必要です')
if (!Array.isArray(metadata.target?.bounds) || metadata.target.bounds.length !== 4) throw new Error('対象boundsがありません')
for (const layer of metadata.layers) {
  if (!/^https:\/\/(planetarycomputer\.microsoft\.com|landsat\.usgs\.gov|sentinel\.esa\.int)/.test(layer.sourceUrl)) throw new Error(`${layer.id}: 出典URLが公式ドメインではありません`)
  if (!(layer.validPixelRatio > 0 && layer.validPixelRatio <= 1)) throw new Error(`${layer.id}: validPixelRatioが不正です`)
  if (!layer.imageUrl.endsWith('.webp')) throw new Error(`${layer.id}: WebP画像ではありません`)
  const imagePath = resolve(root, `public${layer.imageUrl}`)
  const previewPath = resolve(root, `public${layer.previewUrl}`)
  const imageStat = await stat(imagePath)
  const previewStat = await stat(previewPath)
  if (imageStat.size >= 25 * 1024 * 1024) throw new Error(`${layer.id}: Pagesの1ファイル上限を超えています`)
  const imageMetadata = await sharp(imagePath).metadata()
  if (imageMetadata.width !== layer.processing.width || imageMetadata.height !== layer.processing.height) throw new Error(`${layer.id}: metadataの画像サイズと実ファイルが一致しません`)
  console.log(`${layer.id}: image=${imageStat.size} bytes, preview=${previewStat.size} bytes, ${imageMetadata.width}x${imageMetadata.height}, valid=${(layer.validPixelRatio * 100).toFixed(1)}%`)
}
console.log('Satellite output validation passed')
