import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const EARTH_RADIUS_METERS = 6_378_137

export async function readJson(path) {
  return JSON.parse(await readFile(resolve(path), 'utf8'))
}

function addPoint(points, lng, lat) {
  if (Number.isFinite(lng) && Number.isFinite(lat)) points.push([lng, lat])
}

function boundsFromPoints(points) {
  const valid = points.filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))
  if (!valid.length) throw new Error('対象範囲を構成する座標が見つかりません')
  return [
    Math.min(...valid.map(([lng]) => lng)),
    Math.min(...valid.map(([, lat]) => lat)),
    Math.max(...valid.map(([lng]) => lng)),
    Math.max(...valid.map(([, lat]) => lat)),
  ]
}

function collectCoveragePoints(value, points) {
  if (!Array.isArray(value)) return
  if (value.length && typeof value[0] === 'number' && value.length >= 2) {
    addPoint(points, Number(value[0]), Number(value[1]))
    return
  }
  for (const child of value) collectCoveragePoints(child, points)
}

function collectRoutePoints(value, points) {
  if (Array.isArray(value)) {
    if (value.length && typeof value[0] === 'number') {
      addPoint(points, Number(value[0]), Number(value[1]))
      return
    }
    for (const child of value) collectRoutePoints(child, points)
    return
  }
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value.coordinates)) collectRoutePoints(value.coordinates, points)
  if (Array.isArray(value.features)) collectRoutePoints(value.features, points)
  if (Array.isArray(value.routes)) collectRoutePoints(value.routes, points)
  if (value.geometry) collectRoutePoints(value.geometry, points)
}

export async function computeTargetBounds({ projectRoot = '.', routesFile } = {}) {
  const pointsSource = await readFile(resolve(projectRoot, 'src/data/navigationPoints.ts'), 'utf8')
  const areasSource = await readFile(resolve(projectRoot, 'src/data/navigationAreas.ts'), 'utf8')
  const manifest = await readJson(resolve(projectRoot, 'public/data/plateau/areas.json'))
  const points = []
  for (const source of [pointsSource, areasSource]) {
    const pattern = /(?:coordinates|center):\s*\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/g
    for (const match of source.matchAll(pattern)) addPoint(points, Number(match[1]), Number(match[2]))
  }
  for (const dataset of manifest.datasets ?? []) {
    const bounds = dataset.bounds ?? []
    addPoint(points, bounds[0], bounds[1])
    addPoint(points, bounds[2], bounds[3])
    collectCoveragePoints(dataset.coverage?.coordinates, points)
  }
  if (routesFile) collectRoutePoints(await readJson(resolve(projectRoot, routesFile)), points)
  const bounds = boundsFromPoints(points)
  const marginMeters = 250
  const centerLatRadians = ((bounds[1] + bounds[3]) / 2) * Math.PI / 180
  const latMargin = marginMeters / EARTH_RADIUS_METERS * 180 / Math.PI
  const lngMargin = marginMeters / (EARTH_RADIUS_METERS * Math.cos(centerLatRadians)) * 180 / Math.PI
  const expanded = [bounds[0] - lngMargin, bounds[1] - latMargin, bounds[2] + lngMargin, bounds[3] + latMargin]
  return { bounds: expanded, sourceBounds: bounds, marginMeters, pointCount: points.length, routesFile: routesFile ?? null }
}

export async function fetchJson(url, options) {
  const response = await fetch(url, options)
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`)
  return response.json()
}

export async function signedAssetHref(href) {
  const response = await fetch(`https://planetarycomputer.microsoft.com/api/sas/v1/sign?href=${encodeURIComponent(href)}`)
  if (!response.ok) throw new Error(`SAS署名に失敗しました: ${response.status} ${response.statusText}`)
  return (await response.json()).href
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${(bytes / 1024 ** 2).toFixed(2)} MiB`
}
