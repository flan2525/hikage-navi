import { useEffect, useRef } from 'react'
import maplibregl, { type GeoJSONSource, type Map } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { DESTINATION, START, demoBuildings } from '../data/hiroshima'
import { buildingShadow } from '../lib/shade'
import type { RoutePlan, ShadeResult } from '../types'

const style = 'https://tiles.openfreemap.org/styles/liberty'
const featureCollection = (routes: RoutePlan[]) => ({ type: 'FeatureCollection' as const, features: routes.map((route) => ({ type: 'Feature' as const, properties: { kind: route.kind }, geometry: { type: 'LineString' as const, coordinates: route.coordinates.map(({ lng, lat }) => [lng, lat]) } })) })
function setSource(map: Map, id: string, data: GeoJSON.GeoJSON) { (map.getSource(id) as GeoJSONSource | undefined)?.setData(data) }
function routeSegments(result: ShadeResult | undefined) { return { type: 'FeatureCollection' as const, features: (result?.points ?? []).slice(1).map((point, index) => ({ type: 'Feature' as const, properties: { shaded: point.shaded }, geometry: { type: 'LineString' as const, coordinates: [[result!.points[index].lng, result!.points[index].lat], [point.lng, point.lat]] } })) } }
function buildingFeatures() { return { type: 'FeatureCollection' as const, features: demoBuildings.map((building) => ({ type: 'Feature' as const, properties: { height: building.heightMeters }, geometry: { type: 'Polygon' as const, coordinates: [[...building.footprint, building.footprint[0]].map(({ lng, lat }) => [lng, lat])] } })) } }
function shadowFeatures(result: ShadeResult | undefined) {
  if (!result) return { type: 'FeatureCollection' as const, features: [] }
  const features = demoBuildings.map((building) => {
    const shadow = buildingShadow(building, result.sunAltitude, result.sunBearing)
    const coordinates = shadow.length > 0 ? [[...shadow, shadow[0]].map(({ lng, lat }) => [lng, lat])] : []
    return { type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates } }
  })
  return { type: 'FeatureCollection' as const, features }
}

export function MapCanvas({ routes, selectedRoute, shadeResult, is3d, onToggle3d, onUnsupported }: { routes: RoutePlan[]; selectedRoute: RoutePlan | undefined; shadeResult: ShadeResult | undefined; departure: Date; is3d: boolean; onToggle3d: () => void; onUnsupported: () => void }) {
  const node = useRef<HTMLDivElement>(null); const map = useRef<Map | null>(null)
  useEffect(() => { if (!node.current) return; if (!window.WebGLRenderingContext) { onUnsupported(); return }; const instance = new maplibregl.Map({ container: node.current, style, center: [132.4633, 34.3967], zoom: 14.2, pitch: 52, bearing: -18 }); map.current = instance; instance.addControl(new maplibregl.NavigationControl(), 'bottom-right'); instance.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'bottom-right'); instance.on('load', () => { instance.addSource('routes', { type: 'geojson', data: featureCollection([]) }); instance.addLayer({ id: 'route-lines', type: 'line', source: 'routes', paint: { 'line-color': ['match', ['get', 'kind'], 'shade', '#20e3d1', '#8492a0'], 'line-width': 6, 'line-opacity': .78 } }); instance.addSource('segments', { type: 'geojson', data: routeSegments(undefined) }); instance.addLayer({ id: 'segments-line', type: 'line', source: 'segments', paint: { 'line-color': ['case', ['get', 'shaded'], '#20e3d1', '#efb35d'], 'line-width': 8 } }); instance.addSource('buildings', { type: 'geojson', data: buildingFeatures() }); instance.addLayer({ id: 'demo-buildings', type: 'fill-extrusion', source: 'buildings', paint: { 'fill-extrusion-color': '#16374b', 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-opacity': .76 } }); instance.addSource('shadows', { type: 'geojson', data: shadowFeatures(undefined) }); instance.addLayer({ id: 'shadows-layer', type: 'fill', source: 'shadows', paint: { 'fill-color': '#020c15', 'fill-opacity': .28 } }); new maplibregl.Marker({ color: '#20e3d1' }).setLngLat([START.lng, START.lat]).setPopup(new maplibregl.Popup().setText('出発：広島駅')).addTo(instance); new maplibregl.Marker({ color: '#f0b35d' }).setLngLat([DESTINATION.lng, DESTINATION.lat]).setPopup(new maplibregl.Popup().setText('到着：平和記念公園')).addTo(instance) }); return () => { instance.remove(); map.current = null } }, [onUnsupported])
  useEffect(() => { const instance = map.current; if (!instance?.isStyleLoaded()) return; setSource(instance, 'routes', featureCollection(routes)); setSource(instance, 'segments', routeSegments(shadeResult)); setSource(instance, 'shadows', shadowFeatures(shadeResult)); if (selectedRoute) instance.fitBounds(selectedRoute.coordinates.reduce((bounds, point) => bounds.extend([point.lng, point.lat]), new maplibregl.LngLatBounds([selectedRoute.coordinates[0].lng, selectedRoute.coordinates[0].lat], [selectedRoute.coordinates[0].lng, selectedRoute.coordinates[0].lat])), { padding: 80, maxZoom: 15, duration: 650 }) }, [routes, selectedRoute, shadeResult])
  useEffect(() => { map.current?.easeTo({ pitch: is3d ? 52 : 0, bearing: is3d ? -18 : 0, duration: 350 }) }, [is3d])
  return <div className="map-wrap"><div className="map" ref={node} aria-label="広島市中心部の地図" /><button className="map-mode" onClick={onToggle3d} aria-pressed={is3d}>{is3d ? '3D' : '2D'}</button><div className="map-legend"><i />日陰推定区間 <span />日なた推定区間</div><p className="map-note">建物は実証用サンプル。PLATEAUデータ導入前です。</p></div>
}
