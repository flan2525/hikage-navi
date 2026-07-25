const POS_LIST = /<gml:posList(?:\s[^>]*)?>([\s\S]*?)<\/gml:posList>/g
const BUILDING = /<bldg:Building\b([^>]*)>([\s\S]*?)<\/bldg:Building>/g

const textValue = (xml, tag) => new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`).exec(xml)?.[1]?.trim() ?? null
const attributeValue = (attributes, name) => new RegExp(`${name}="([^"]+)"`).exec(attributes)?.[1] ?? null
const isSamePoint = (a, b) => a.lng === b.lng && a.lat === b.lat

function signedArea(points) {
  return points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length]
    return area + point.lng * next.lat - next.lng * point.lat
  }, 0) / 2
}

function parseRing(posList) {
  const values = posList.trim().split(/\s+/).map(Number)
  if (values.length < 9 || values.some((value) => !Number.isFinite(value))) return null
  const points = []
  for (let index = 0; index + 2 < values.length; index += 3) {
    const [lat, lng] = values.slice(index, index + 2)
    if (lat < 20 || lat > 50 || lng < 120 || lng > 155) return null
    points.push({ lng, lat })
  }
  if (points.length > 1 && isSamePoint(points[0], points.at(-1))) points.pop()
  if (points.length < 3 || Math.abs(signedArea(points)) < 1e-12) return null
  return points
}

function posLists(xml) {
  return [...xml.matchAll(POS_LIST)].map((match) => match[1])
}

function selectFootprint(body) {
  const roofEdge = textValue(body, 'bldg:lod0RoofEdge')
  const candidates = posLists(roofEdge ?? body).map(parseRing).filter(Boolean)
  return candidates.sort((a, b) => Math.abs(signedArea(b)) - Math.abs(signedArea(a)))[0] ?? null
}

function geometryHeight(body) {
  const elevations = posLists(body).flatMap((posList) => {
    const values = posList.trim().split(/\s+/).map(Number)
    return values.filter((_, index) => index % 3 === 2 && Number.isFinite(values[index]))
  })
  if (elevations.length < 2) return null
  const height = Math.max(...elevations) - Math.min(...elevations)
  return height >= 1 ? height : null
}

function intersectsTarget(footprint, [minLng, minLat, maxLng, maxLat]) {
  const lngs = footprint.map((point) => point.lng)
  const lats = footprint.map((point) => point.lat)
  return Math.max(...lngs) >= minLng && Math.min(...lngs) <= maxLng && Math.max(...lats) >= minLat && Math.min(...lats) <= maxLat
}

function buildingLod(body) {
  for (const lod of [3, 2, 1]) if (body.includes(`lod${lod}`)) return lod
  return 0
}

export function sourceCrs(xml) {
  return /srsName="([^"]+)"/.exec(xml)?.[1] ?? null
}

export function convertCityGml(xml, metadata) {
  const features = []
  const stats = { parsed: 0, outsideTarget: 0, invalidFootprint: 0, noHeight: 0, measuredHeight: 0, geometryHeight: 0 }
  for (const match of xml.matchAll(BUILDING)) {
    stats.parsed += 1
    const [, attributes, body] = match
    const footprint = selectFootprint(body)
    if (!footprint) { stats.invalidFootprint += 1; continue }
    if (!intersectsTarget(footprint, metadata.target.bbox)) { stats.outsideTarget += 1; continue }
    const measured = Number(textValue(body, 'bldg:measuredHeight'))
    const inferred = geometryHeight(body)
    const height = Number.isFinite(measured) && measured > 0 ? measured : inferred
    if (!height) { stats.noHeight += 1; continue }
    const heightSource = Number.isFinite(measured) && measured > 0 ? 'measuredHeight' : 'geometry_z_range'
    stats[heightSource === 'measuredHeight' ? 'measuredHeight' : 'geometryHeight'] += 1
    features.push({
      type: 'Feature',
      properties: {
        id: attributeValue(attributes, 'gml:id') ?? `${metadata.meshCode}-${stats.parsed}`,
        height: Number(height.toFixed(2)),
        heightSource,
        dataYear: metadata.dataYear,
        lod: buildingLod(body),
        usage: textValue(body, 'bldg:usage'),
        meshCode: metadata.meshCode,
        source: 'PLATEAU',
      },
      geometry: { type: 'Polygon', coordinates: [[...footprint, footprint[0]].map(({ lng, lat }) => [lng, lat])] },
    })
  }
  return { features, stats }
}
