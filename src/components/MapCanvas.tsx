import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, { type GeoJSONSource, type Map } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { DESTINATION, START } from '../data/hiroshima'
import { buildingShadowPolygons } from '../lib/shade'
import type { Building, BuildingDisplayMode, BuildingShadow, RoutePlan, ShadeResult, ValidationLocation } from '../types'

const style = 'https://tiles.openfreemap.org/styles/liberty'
const VISUAL_SHADOW_CORRIDOR_METERS = 120
const featureCollection = (routes: RoutePlan[]) => ({ type: 'FeatureCollection' as const, features: routes.map((route) => ({ type: 'Feature' as const, properties: { kind: route.kind }, geometry: { type: 'LineString' as const, coordinates: route.coordinates.map(({ lng, lat }) => [lng, lat]) } })) })
function setSource(map: Map, id: string, data: GeoJSON.GeoJSON) { (map.getSource(id) as GeoJSONSource | undefined)?.setData(data) }
function routeSegments(result: ShadeResult | undefined) { return { type: 'FeatureCollection' as const, features: (result?.points ?? []).slice(1).map((point, index) => ({ type: 'Feature' as const, properties: { shaded: point.shaded }, geometry: { type: 'LineString' as const, coordinates: [[result!.points[index].lng, result!.points[index].lat], [point.lng, point.lat]] } })) } }
function buildingFeatures(buildings: Building[]) { return { type: 'FeatureCollection' as const, features: buildings.map((building) => ({ type: 'Feature' as const, properties: { id: building.id, height: building.heightMeters, heightSource: building.heightSource ?? 'sample', dataYear: building.dataYear ?? '', lod: building.lod ?? '', source: building.source }, geometry: { type: 'Polygon' as const, coordinates: [[...building.footprint, building.footprint[0]].map(({ lng, lat }) => [lng, lat])] } })) } }
function nearRoute(building: Building, result: ShadeResult) { const latBuffer = VISUAL_SHADOW_CORRIDOR_METERS / 110_540; return building.footprint.some((vertex) => result.points.some((point) => Math.abs(point.lat - vertex.lat) < latBuffer && Math.abs(point.lng - vertex.lng) < latBuffer / Math.cos(point.lat * Math.PI / 180))) }
function shadowFeatures(buildings: Building[], result: ShadeResult | undefined) { if (!result || result.sunAltitude <= 3) return { type: 'FeatureCollection' as const, features: [] }; return { type: 'FeatureCollection' as const, features: buildings.filter((building) => nearRoute(building, result)).map((building) => ({ type: 'Feature' as const, properties: { id: building.id }, geometry: { type: 'MultiPolygon' as const, coordinates: buildingShadowPolygons(building, result.sunAltitude, result.sunBearing).map((polygon) => [[...polygon, polygon[0]].map(({ lng, lat }) => [lng, lat])]) } })) } }
function debugShadowFeatures(shadows: BuildingShadow[]) {
  return {
    type: 'FeatureCollection' as const,
    features: shadows.flatMap((shadow) => shadow.polygons.map((polygon, index) => ({
      type: 'Feature' as const,
      properties: { id: shadow.buildingId, shadowLength: shadow.shadowLengthMeters, shadowBearing: shadow.shadowBearing, polygonIndex: index },
      geometry: { type: 'Polygon' as const, coordinates: [[...polygon, polygon[0]].map(({ lng, lat }) => [lng, lat])] },
    }))),
  }
}
function debugPointFeatures(result: ShadeResult | undefined) { return { type: 'FeatureCollection' as const, features: (result?.points ?? []).map((point) => ({ type: 'Feature' as const, properties: { status: point.status }, geometry: { type: 'Point' as const, coordinates: [point.lng, point.lat] } })) } }

type Props = { routes: RoutePlan[]; selectedRoute: RoutePlan | undefined; shadeResult: ShadeResult | undefined; buildings: Building[]; debugShadows: BuildingShadow[]; debugEnabled: boolean; validationLocation: ValidationLocation | undefined; buildingState: 'loading' | 'plateau' | 'sample'; buildingMode: BuildingDisplayMode; is3d: boolean; onToggle3d: () => void; onCycleBuildingMode: () => void; onUnsupported: () => void }

export function MapCanvas({ routes, selectedRoute, shadeResult, buildings, debugShadows, debugEnabled, validationLocation, buildingState, buildingMode, is3d, onToggle3d, onCycleBuildingMode, onUnsupported }: Props) {
  const node = useRef<HTMLDivElement>(null); const map = useRef<Map | null>(null); const [ready, setReady] = useState(false); const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null)
  const selectedBuilding = useMemo(() => buildings.find((building) => building.id === selectedBuildingId), [buildings, selectedBuildingId])
  const selectedShadow = useMemo(() => debugShadows.find((shadow) => shadow.buildingId === selectedBuildingId), [debugShadows, selectedBuildingId])
  useEffect(() => {
    if (!node.current) return undefined
    if (!window.WebGLRenderingContext) { onUnsupported(); return undefined }
    const instance = new maplibregl.Map({ container: node.current, style, center: [132.4633, 34.3967], zoom: 14.2, pitch: 52, bearing: -18 })
    map.current = instance
    instance.addControl(new maplibregl.NavigationControl(), 'bottom-right'); instance.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'bottom-right')
    instance.on('load', () => {
      instance.addSource('routes', { type: 'geojson', data: featureCollection([]) }); instance.addLayer({ id: 'route-lines', type: 'line', source: 'routes', paint: { 'line-color': ['match', ['get', 'kind'], 'shade', '#20e3d1', '#8492a0'], 'line-width': 6, 'line-opacity': .78 } })
      instance.addSource('segments', { type: 'geojson', data: routeSegments(undefined) }); instance.addLayer({ id: 'segments-line', type: 'line', source: 'segments', paint: { 'line-color': ['case', ['get', 'shaded'], '#20e3d1', '#efb35d'], 'line-width': 8 } })
      instance.addSource('buildings', { type: 'geojson', data: buildingFeatures([]) }); instance.addLayer({ id: 'plateau-buildings-2d', type: 'fill', source: 'buildings', layout: { visibility: 'none' }, paint: { 'fill-color': '#1c5a70', 'fill-opacity': .65 } }); instance.addLayer({ id: 'plateau-buildings-3d', type: 'fill-extrusion', source: 'buildings', paint: { 'fill-extrusion-color': '#16374b', 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-opacity': .76 } })
      instance.addSource('shadows', { type: 'geojson', data: shadowFeatures([], undefined) }); instance.addLayer({ id: 'shadows-layer', type: 'fill', source: 'shadows', paint: { 'fill-color': '#020c15', 'fill-opacity': .12 } })
      instance.addSource('debug-shadows', { type: 'geojson', data: debugShadowFeatures([]) }); instance.addLayer({ id: 'debug-shadows-layer', type: 'line', source: 'debug-shadows', layout: { visibility: 'none' }, paint: { 'line-color': '#8ca6ff', 'line-width': 1.5, 'line-opacity': .9 } })
      instance.addSource('debug-points', { type: 'geojson', data: debugPointFeatures(undefined) }); instance.addLayer({ id: 'debug-points-layer', type: 'circle', source: 'debug-points', layout: { visibility: 'none' }, paint: { 'circle-radius': 3, 'circle-color': ['match', ['get', 'status'], 'shaded', '#20e3d1', 'sunny', '#efb35d', '#8492a0'], 'circle-stroke-color': '#071827', 'circle-stroke-width': 1 } })
      instance.moveLayer('route-lines'); instance.moveLayer('segments-line'); instance.moveLayer('debug-shadows-layer'); instance.moveLayer('debug-points-layer')
      const selectFeature = (event: maplibregl.MapLayerMouseEvent) => { const id = event.features?.[0]?.properties?.id; if (typeof id === 'string') setSelectedBuildingId(id) }
      instance.on('click', 'plateau-buildings-3d', selectFeature); instance.on('click', 'plateau-buildings-2d', selectFeature); instance.on('click', 'debug-shadows-layer', selectFeature)
      new maplibregl.Marker({ color: '#20e3d1' }).setLngLat([START.lng, START.lat]).setPopup(new maplibregl.Popup().setText('出発：広島駅')).addTo(instance); new maplibregl.Marker({ color: '#f0b35d' }).setLngLat([DESTINATION.lng, DESTINATION.lat]).setPopup(new maplibregl.Popup().setText('到着：平和記念公園')).addTo(instance); setReady(true)
    })
    return () => { setReady(false); instance.remove(); map.current = null }
  }, [onUnsupported])
  useEffect(() => { const instance = map.current; if (!ready || !instance) return; setSource(instance, 'routes', featureCollection(routes)); setSource(instance, 'segments', routeSegments(shadeResult)); setSource(instance, 'buildings', buildingFeatures(buildings)); setSource(instance, 'shadows', shadowFeatures(buildings, shadeResult)); setSource(instance, 'debug-shadows', debugShadowFeatures(debugShadows)); setSource(instance, 'debug-points', debugPointFeatures(shadeResult)) }, [ready, routes, shadeResult, buildings, debugShadows])
  useEffect(() => { const instance = map.current; if (!ready || !instance) return; instance.setLayoutProperty('plateau-buildings-3d', 'visibility', buildingMode === '3d' ? 'visible' : 'none'); instance.setLayoutProperty('plateau-buildings-2d', 'visibility', buildingMode === '2d' ? 'visible' : 'none'); instance.setLayoutProperty('debug-shadows-layer', 'visibility', debugEnabled ? 'visible' : 'none'); instance.setLayoutProperty('debug-points-layer', 'visibility', debugEnabled ? 'visible' : 'none') }, [ready, buildingMode, debugEnabled])
  useEffect(() => { const instance = map.current; if (!ready || !instance || !selectedRoute) return; const [first] = selectedRoute.coordinates; const bounds = selectedRoute.coordinates.reduce((current, point) => current.extend([point.lng, point.lat]), new maplibregl.LngLatBounds([first.lng, first.lat], [first.lng, first.lat])); instance.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 650 }) }, [ready, selectedRoute])
  useEffect(() => { if (validationLocation && ready) map.current?.flyTo({ center: [validationLocation.position.lng, validationLocation.position.lat], zoom: validationLocation.zoom, duration: 650 }) }, [ready, validationLocation])
  useEffect(() => { map.current?.easeTo({ pitch: is3d ? 52 : 0, bearing: is3d ? -18 : 0, duration: 350 }) }, [is3d])
  const buildingLabel = buildingMode === '3d' ? '建物: 3D' : buildingMode === '2d' ? '建物: 2D' : '建物: OFF'; const note = buildingState === 'loading' ? 'PLATEAU建物データを読み込み中…' : buildingState === 'sample' ? 'PLATEAUの読み込みに失敗。実証用サンプル建物を表示中。' : 'PLATEAU広島市・2024年度建物データ。建物データから推定。'
  return <div className="map-wrap"><div className="map" ref={node} aria-label="広島市中心部の地図" /><button className="map-mode" onClick={onToggle3d} aria-pressed={is3d}>{is3d ? '3D' : '2D'}</button><button className="building-mode" onClick={onCycleBuildingMode} aria-label="建物表示を切り替え" aria-pressed={buildingMode !== 'off'}>{buildingLabel}</button><div className="map-legend"><i />日陰推定区間 <span />日なた推定区間</div><p className="map-note">{note}</p>{debugEnabled && selectedBuilding && <aside className="debug-building-inspector" aria-live="polite"><strong>建物検証</strong><span>ID: {selectedBuilding.id}</span><span>採用高: {selectedBuilding.heightMeters.toFixed(1)}m（{selectedBuilding.heightSource ?? 'sample'}）</span><span>measuredHeight: {selectedBuilding.heightSource === 'measuredHeight' ? `${selectedBuilding.heightMeters.toFixed(1)}m` : '未採用'}</span><span>geometry_z_range: {selectedBuilding.heightSource === 'geometry_z_range' ? `${selectedBuilding.heightMeters.toFixed(1)}m` : '未採用'}</span><span>影長: {selectedShadow?.shadowLengthMeters.toFixed(1) ?? '0.0'}m / 方位: {selectedShadow?.shadowBearing.toFixed(1) ?? '-'}°</span><span>年度: {selectedBuilding.dataYear ?? '-'} / LOD: {selectedBuilding.lod ?? '-'}</span><span>日陰計算対象: {selectedShadow ? '対象' : '対象外'}</span></aside>}</div>
}
