export type Position = { lng: number; lat: number }
export type Bounds = [number, number, number, number]
export type PlateauCoverage = { type: 'MultiPolygon'; coordinates: number[][][][]; gridSizeDegrees?: number }
export type NavigationPoint = {
  id: string
  name: string
  shortName: string
  areaId: string
  category: 'station' | 'tram' | 'shopping' | 'park' | 'riverside' | 'landmark'
  coordinates: [number, number]
  description?: string
  source: string
}
export type NavigationArea = { id: string; name: string; description: string; center: [number, number]; defaultZoom: number; pointIds: string[]; buildingDatasetIds: string[] }
export type EnvironmentalLayerMetadata = { id: string; type: 'land-surface-temperature' | 'ndvi'; label: string; observedAt: string; source: string; bounds: Bounds; resolutionMeters: number; url: string }
export type RouteKind = 'shade' | 'shortest'
export type RouteSource = 'api' | 'fallback'
export type RoutePlan = { id: string; kind: RouteKind; label: string; coordinates: Position[]; distanceMeters: number; durationSeconds: number; source: RouteSource }
export type Weather = { temperature: number | null; apparentTemperature: number | null; humidity: number | null; windSpeed: number | null; radiation: number | null; hourly: HourWeather[]; observedAt: string | null }
export type HourWeather = { time: string; temperature: number | null; apparentTemperature: number | null; radiation: number | null }
export type Building = { id: string; name?: string; heightMeters: number; footprint: Position[]; source: string; isSample: boolean; heightSource?: 'measuredHeight' | 'geometry_z_range' | 'sample'; dataYear?: number; lod?: number; usage?: string | null }
export type BuildingDataMetadata = { cityName: string; dataYear: number; specification: string; cityGmlVersion: string; sourceCrs: string; outputCrs: string; buildingCount: number; geojsonBytes: number; target: { name: string; bbox: Bounds; bufferMeters: number } }
export type PlateauDataset = { id: string; label: string; url: string; areaIds: string[]; routeKeys: string[]; bounds: Bounds; coverage?: PlateauCoverage; supplemental?: boolean; buildingCount: number; dataYear: number; version: string; fileSizeBytes: number; gzipBytes?: number; measuredHeightCount?: number; geometryHeightCount?: number; heightExcludedCount?: number; duplicateBuildingCount?: number; meshCodes?: string[]; source: string }
export type PlateauManifest = { version: number; source: string; datasets: PlateauDataset[] }
export type BuildingData = { buildings: Building[]; metadata: BuildingDataMetadata; datasetIds?: string[]; failedDatasetIds?: string[]; duplicateBuildingCount?: number; coverageBounds?: Bounds[]; coverageDisplayBounds?: Bounds[]; performance?: { totalMilliseconds: number; datasetLoadMilliseconds: number; parseMilliseconds: number; dedupeMilliseconds: number } }
export type BuildingDisplayMode = '3d' | '2d' | 'off'
export type WorldMode = 'shadow' | 'reality'
export type CoolSpot = { id: string; type: 'arcade' | 'park' | 'public_facility' | 'cooling_shelter' | 'water' | 'rest'; name: string; geometry: Position[]; activeHours: string; shadeBonus: number; passable: boolean; source: string; lastVerified: string }
export type ValidationLocation = { id: string; name: string; position: Position; zoom: number; note: string }
export type CoveredWalkway = { id: string; name: string; type: 'covered_walkway'; geometry: { type: 'LineString'; coordinates: Position[] }; activeHours: string; alwaysShaded: boolean; passable: boolean; source: string; lastVerified: string; note: string; isVerificationData: boolean }
export type ShadeValidationRecord = { recordedAt: string; timezone: string; departure: { name: string; position: Position }; destination: { name: string; position: Position }; route: { id: string; label: string; source: RouteSource; coordinates: Position[] }; sun: { altitude: number; bearing: number; shadowBearing: number }; shade: { percent: number; shadedPoints: number; sunnyPoints: number; indeterminatePoints: number; outsideCoveragePoints: number }; plateau: { dataYear: number | undefined; buildingCount: number; datasetIds?: string[] }; appVersion: string; note: string }
export type ShadeStatus = 'shaded' | 'sunny' | 'indeterminate' | 'outside'
export type ShadePoint = Position & { shaded: boolean; status: ShadeStatus; distanceFromStart: number; arrivalAt: Date }
export type BuildingShadow = { buildingId: string; heightMeters: number; heightSource: Building['heightSource']; dataYear: number | undefined; lod: number | undefined; shadowLengthMeters: number; shadowBearing: number; polygons: Position[][]; isShadeCandidate: boolean }
export type ShadeAudit = { shadowBearing: number; routeSampleCount: number; shadedPointCount: number; sunnyPointCount: number; indeterminatePointCount: number; outsideCoveragePointCount: number; candidateBuildingCount: number; shadowPolygonCount: number; processingMilliseconds: number }
export type ShadeResult = { points: ShadePoint[]; shadedDistanceMeters: number; totalDistanceMeters: number; evaluatedDistanceMeters: number; outsideCoverageDistanceMeters: number; shadePercent: number; sunAltitude: number; sunBearing: number; audit: ShadeAudit }
