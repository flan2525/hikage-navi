import { useCallback, useEffect, useMemo, useState } from 'react'
import { IntroSequence } from './components/IntroSequence'
import { MapCanvas } from './components/MapCanvas'
import { MapErrorBoundary } from './components/MapErrorBoundary'
import { MapFallback } from './components/MapFallback'
import { SatelliteAnalysisPanel } from './components/SatelliteAnalysisPanel'
import { SatelliteLayerControl } from './components/SatelliteLayerControl'
import { ShadeValidationPanel } from './components/ShadeValidationPanel'
import { ShadowLegend } from './components/ShadowLegend'
import { ShadowRouteSummary } from './components/ShadowRouteSummary'
import { ShadowTimeControl } from './components/ShadowTimeControl'
import { WeatherPanel } from './components/WeatherPanel'
import { WorldModeToggle } from './components/WorldModeToggle'
import { demoBuildings } from './data/hiroshima'
import { navigationAreas } from './data/navigationAreas'
import { navigationPoints, pointById, positionForPoint } from './data/navigationPoints'
import { validationLocations } from './data/validation'
import { useAsyncResource } from './hooks/useAsyncResource'
import { useSatelliteAnalysis } from './hooks/useSatelliteAnalysis'
import { useSatelliteMetadata } from './hooks/useSatelliteMetadata'
import { calculateRouteMetrics } from './lib/routeMetrics'
import { buildShadowAudit, calculateShade, selectShadeCandidateBuildings } from './lib/shade'
import { buildShadeValidationRecord } from './lib/shadeValidation'
import { datasetIdsForJourney, fetchPlateauBuildingsForRoutes, routeBufferBounds } from './services/buildings'
import { layerForSelection, type SatelliteSelection } from './services/satellite'
import { loadRoutes } from './services/routing'
import { fetchWeather } from './services/weather'
import type { BuildingDisplayMode, RouteKind, SatelliteDebugVisibility, WorldMode } from './types'

type DebugLayer = 'buildings' | 'shadows' | 'points' | 'coverage' | 'buffer'
const nowRounded = () => { const date = new Date(); date.setMinutes(Math.ceil(date.getMinutes() / 10) * 10, 0, 0); return date }
const isShadeDebug = new URLSearchParams(window.location.search).get('debug') === 'shade'
const point = (id: string) => pointById.get(id) ?? navigationPoints[0]

export default function App() {
  const [departure, setDeparture] = useState(nowRounded)
  const [selected, setSelected] = useState<RouteKind>('shade')
  const [worldMode, setWorldMode] = useState<WorldMode>('shadow')
  const [is3d, setIs3d] = useState(!isShadeDebug)
  const [buildingMode, setBuildingMode] = useState<BuildingDisplayMode>(isShadeDebug ? '2d' : 'off')
  const [debugLayers, setDebugLayers] = useState<Record<DebugLayer, boolean>>({ buildings: true, shadows: true, points: true, coverage: false, buffer: false })
  const [satelliteDebugVisibility, setSatelliteDebugVisibility] = useState<SatelliteDebugVisibility>({ highTemperature: false, vegetation: false, noData: false })
  const [satelliteAnalysisOpen, setSatelliteAnalysisOpen] = useState(isShadeDebug)
  const [validationLocationId, setValidationLocationId] = useState(validationLocations[0].id)
  const [areaId, setAreaId] = useState('central')
  const [originId, setOriginId] = useState('hiroshima-station')
  const [destinationId, setDestinationId] = useState('peace-memorial-park')
  const [mapReady, setMapReady] = useState(false)
  const [mapFailure, setMapFailure] = useState<Error | null>(null)
  const [mapKey, setMapKey] = useState(0)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [satelliteSelection, setSatelliteSelection] = useState<SatelliteSelection>('none')
  const [satelliteOpacity, setSatelliteOpacity] = useState(.72)
  const [satelliteMapState, setSatelliteMapState] = useState({ sourceExists: false, layerExists: false })

  const origin = point(originId)
  const destination = point(destinationId)
  const weather = useAsyncResource(fetchWeather)
  const satellite = useSatelliteMetadata(satelliteSelection)
  const satelliteLayer = layerForSelection(satellite.data, satelliteSelection)
  const routesResource = useAsyncResource(useCallback((signal) => loadRoutes(positionForPoint(origin), positionForPoint(destination), signal), [originId, destinationId]))
  const datasetIds = useMemo(() => datasetIdsForJourney(origin.areaId, destination.areaId), [origin.areaId, destination.areaId])
  const routeSignature = routesResource.data?.routes.map((route) => `${route.id}:${route.coordinates.length}`).join('|') ?? ''
  const buildingsResource = useAsyncResource(useCallback((signal) => fetchPlateauBuildingsForRoutes(datasetIds, routesResource.data?.routes ?? [], signal), [datasetIds.join(':'), routeSignature]))
  const routes = routesResource.data?.routes ?? []
  const routeBufferBoundsValue = useMemo(() => routeBufferBounds(routes), [routes])
  const buildingState = buildingsResource.data ? 'plateau' : buildingsResource.error ? 'sample' : 'loading'
  const buildings = buildingsResource.data?.buildings ?? (buildingState === 'sample' ? demoBuildings : [])
  const results = useMemo(() => Object.fromEntries(routes.map((route) => [route.id, calculateShade(route, buildings, departure, undefined, buildingsResource.data?.coverageBounds)])), [routes, buildings, departure, buildingsResource.data?.coverageBounds])
  const selectedRoute = routes.find((route) => route.kind === selected) ?? routes[0]
  const selectedResult = selectedRoute ? results[selectedRoute.id] : undefined
  const metrics = useMemo(() => calculateRouteMetrics(selectedResult), [selectedResult])
  const satelliteAnalysis = useSatelliteAnalysis(isShadeDebug || satelliteAnalysisOpen, routes, results)
  const debugShadows = useMemo(() => !isShadeDebug || !selectedResult ? [] : buildShadowAudit(selectShadeCandidateBuildings(buildings, selectedResult.points), selectedResult.sunAltitude, selectedResult.sunBearing), [buildings, selectedResult])
  const validationLocation = validationLocations.find((location) => location.id === validationLocationId)

  const selectRoute = useCallback((kind: RouteKind) => setSelected(kind), [])
  const cycleBuildingMode = useCallback(() => setBuildingMode((mode) => mode === '3d' ? '2d' : mode === '2d' ? 'off' : '3d'), [])
  const setDebugLayer = useCallback((layer: DebugLayer, visible: boolean) => setDebugLayers((current) => ({ ...current, [layer]: visible })), [])
  const setSatelliteDebugLayer = useCallback((layer: keyof SatelliteDebugVisibility, visible: boolean) => setSatelliteDebugVisibility((current) => ({ ...current, [layer]: visible })), [])
  const reportMapFailure = useCallback((error?: Error) => { setMapReady(false); setMapFailure(error ?? new Error('WebGL map initialization failed')) }, [])
  const handleMapReady = useCallback(() => setMapReady(true), [])
  const handleSatelliteMapState = useCallback((state: { sourceExists: boolean; layerExists: boolean }) => setSatelliteMapState(state), [])
  const retryMap = useCallback(() => { setMapFailure(null); setMapReady(false); setMapKey((key) => key + 1) }, [])
  const setMinutes = useCallback((minutes: number) => { setIsRecalculating(true); setDeparture((date) => { const next = new Date(date); next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0); return next }) }, [])
  const toggleWorld = useCallback((mode: WorldMode) => { setWorldMode(mode); if (mode === 'reality' && buildingMode === 'off') setBuildingMode('3d') }, [buildingMode])
  const changeOrigin = (id: string) => { if (id === destinationId) setDestinationId(originId); setOriginId(id); setAreaId(point(id).areaId) }
  const changeDestination = (id: string) => { if (id === originId) return; setDestinationId(id); setAreaId(point(id).areaId) }
  const swapJourney = () => { setOriginId(destinationId); setDestinationId(originId); setAreaId(destination.areaId) }

  useEffect(() => { if (!isRecalculating) return undefined; const id = window.setTimeout(() => setIsRecalculating(false), 380); return () => window.clearTimeout(id) }, [isRecalculating, results])

  const mapCanvas = mapFailure ? <MapFallback onRetry={retryMap} /> : <MapErrorBoundary resetKey={mapKey} onError={reportMapFailure} fallback={<MapFallback onRetry={retryMap} />}><MapCanvas key={mapKey} routes={routes} selectedRoute={selectedRoute} shadeResult={selectedResult} buildings={buildings} debugShadows={debugShadows} debugEnabled={isShadeDebug} debugLayerVisibility={debugLayers} validationLocation={isShadeDebug ? validationLocation : undefined} origin={origin} destination={destination} area={navigationAreas.find((area) => area.id === areaId)} coverageBounds={buildingsResource.data?.coverageDisplayBounds ?? buildingsResource.data?.coverageBounds ?? []} routeBufferBounds={routeBufferBoundsValue} buildingState={buildingState} buildingMode={buildingMode} worldMode={isShadeDebug ? 'reality' : worldMode} is3d={is3d} satelliteLayer={satelliteLayer} satelliteOpacity={satelliteOpacity} satelliteAnalysis={satelliteAnalysis.data ?? undefined} satelliteDebugVisibility={satelliteDebugVisibility} onSatelliteStateChange={handleSatelliteMapState} onReady={handleMapReady} onToggle3d={() => setIs3d((current) => !current)} onCycleBuildingMode={cycleBuildingMode} onUnsupported={reportMapFailure} /></MapErrorBoundary>
  const loadingMessage = !mapReady ? '広島の建物を呼び出しています' : buildingState === 'loading' ? `${datasetIds.join('・')} の建物データを読込中` : isRecalculating ? '影を動かしています' : routesResource.loading ? '影の道を探しています' : null
  const journeySelector = <div className="journey-selector" aria-label="出発地と目的地"><select aria-label="エリアを選択" value={areaId} onChange={(event) => setAreaId(event.target.value)}>{navigationAreas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select><div><select aria-label="出発地" value={originId} onChange={(event) => changeOrigin(event.target.value)}>{navigationAreas.map((area) => <optgroup key={area.id} label={area.name}>{navigationPoints.filter((item) => item.areaId === area.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</optgroup>)}</select><button className="journey-swap" aria-label="出発地と目的地を入れ替える" onClick={swapJourney}>⇄</button><select aria-label="目的地" value={destinationId} onChange={(event) => changeDestination(event.target.value)}>{navigationAreas.map((area) => <optgroup key={area.id} label={area.name}>{navigationPoints.filter((item) => item.id !== originId && item.areaId === area.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</optgroup>)}</select></div></div>

  if (isShadeDebug) return <main className="debug-app"><aside className="debug-panel"><header><div className="brand-mark">◒</div><div><p>SHADE CALCULATION LAB</p><h1>日陰ナビ</h1></div></header>{journeySelector}<label className="debug-time">出発時刻<input type="time" step="600" value={`${String(departure.getHours()).padStart(2, '0')}:${String(departure.getMinutes()).padStart(2, '0')}`} onChange={(event) => { const [hours, minutes] = event.target.value.split(':').map(Number); setMinutes(hours * 60 + minutes) }} /></label><WeatherPanel resource={weather} /><SatelliteLayerControl selection={satelliteSelection} onSelectionChange={setSatelliteSelection} opacity={satelliteOpacity} onOpacityChange={setSatelliteOpacity} resource={satellite} debug /><SatelliteAnalysisPanel open={satelliteAnalysisOpen} onToggle={setSatelliteAnalysisOpen} resource={satelliteAnalysis} selectedRouteId={selectedRoute?.id} selectedRouteKind={selected} debug debugVisibility={satelliteDebugVisibility} onDebugVisibilityChange={setSatelliteDebugLayer} />{routesResource.loading && <p className="muted">徒歩経路を取得中…</p>}{routesResource.data?.fallbackReason && <p className="notice">実証用サンプル経路：{routesResource.data.fallbackReason}</p>}<ShadeValidationPanel result={selectedResult} location={validationLocation} locations={validationLocations} layerVisibility={debugLayers} onLayerVisibilityChange={setDebugLayer} onLocationChange={setValidationLocationId} onHourChange={(hour) => setMinutes(hour * 60)} buildRecord={(note) => selectedRoute && selectedResult ? JSON.stringify(buildShadeValidationRecord(selectedRoute, selectedResult, buildingsResource.data?.metadata, departure, note, origin, destination, buildingsResource.data?.datasetIds), null, 2) : '{}'} /><p className="debug-data-note">読込済み：{buildingsResource.data?.datasetIds?.join('、') ?? (buildingState === 'loading' ? '読込中' : '実証用サンプル')} ／ {buildings.length}棟{buildingsResource.data?.duplicateBuildingCount ? `（重複除外 ${buildingsResource.data.duplicateBuildingCount}）` : ''}</p><p className="debug-data-note">ORS {routesResource.data?.requestMilliseconds?.toFixed(0) ?? '—'}ms / GeoJSON {buildingsResource.data?.performance?.datasetLoadMilliseconds.toFixed(0) ?? '—'}ms / 解析 {buildingsResource.data?.performance?.parseMilliseconds.toFixed(0) ?? '—'}ms / 統合 {buildingsResource.data?.performance?.dedupeMilliseconds.toFixed(0) ?? '—'}ms</p><p className="debug-data-note">衛星 source: {satelliteMapState.sourceExists ? 'あり' : 'なし'} / layer: {satelliteMapState.layerExists ? 'あり' : 'なし'}</p>{buildingsResource.data?.failedDatasetIds?.length ? <p className="notice">読み込めなかったデータ：{buildingsResource.data.failedDatasetIds.join('、')}</p> : null}</aside><section className="debug-map-area">{mapCanvas}</section></main>

  return <main className="shadow-app"><section className="world-map-area">{mapCanvas}{loadingMessage && <div className="world-loading" role="status">{loadingMessage}</div>}</section><header className="world-header"><div className="brand"><span className="brand-mark">◒</span><div><p>日陰ナビ</p><h1>影の広島</h1><span>太陽の下では見えない、もう一つの街。</span></div></div><WorldModeToggle mode={worldMode} onChange={toggleWorld} /></header>{journeySelector}<aside className="world-controls"><ShadowTimeControl value={departure} onCommit={setMinutes} /><div className="world-status"><span>{weather.data?.temperature == null ? '気象を取得中' : `${weather.data.temperature.toFixed(1)}°C / 体感 ${weather.data.apparentTemperature?.toFixed(1) ?? '—'}°C`}</span><span>{buildingState === 'plateau' ? 'PLATEAU 2024・建物影推定' : buildingState === 'loading' ? '建物データ読込中' : '建物は実証用サンプル'}</span></div><SatelliteLayerControl selection={satelliteSelection} onSelectionChange={setSatelliteSelection} opacity={satelliteOpacity} onOpacityChange={setSatelliteOpacity} resource={satellite} />{routesResource.data?.fallbackReason && <p className="world-notice">実証用サンプル経路：{routesResource.data.fallbackReason}</p>}{buildingsResource.data?.failedDatasetIds?.length ? <p className="world-notice">一部建物データを読み込めません：{buildingsResource.data.failedDatasetIds.join('、')}</p> : null}</aside><aside className="world-summary"><ShadowRouteSummary route={selectedRoute} routeKind={selected} onRouteChange={selectRoute} metrics={metrics} isFallback={routesResource.data?.isFallback ?? true} shadePercent={selectedResult?.shadePercent} outsideCoverageMeters={selectedResult?.outsideCoverageDistanceMeters ?? 0} /><SatelliteAnalysisPanel open={satelliteAnalysisOpen} onToggle={setSatelliteAnalysisOpen} resource={satelliteAnalysis} selectedRouteId={selectedRoute?.id} selectedRouteKind={selected} /><p className="world-disclaimer">PLATEAU広島市2024年度建物データから推定。樹木・屋根・現地工事は未反映で、実際の日陰と異なる場合があります。</p></aside><ShadowLegend /><IntroSequence /></main>
}
