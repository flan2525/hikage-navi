import { DESTINATION, START } from '../data/hiroshima'
import type { BuildingDataMetadata, RoutePlan, ShadeResult, ShadeValidationRecord } from '../types'

export const APP_VERSION = '0.2.0-shade-validation'
export function buildShadeValidationRecord(route: RoutePlan, result: ShadeResult, metadata: BuildingDataMetadata | undefined, departure: Date, note: string): ShadeValidationRecord {
  return { recordedAt: departure.toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, departure: { name: '広島駅', position: START }, destination: { name: '平和記念公園', position: DESTINATION }, route: { id: route.id, label: route.label, source: route.source, coordinates: route.coordinates }, sun: { altitude: result.sunAltitude, bearing: result.sunBearing, shadowBearing: result.audit.shadowBearing }, shade: { percent: result.shadePercent, shadedPoints: result.audit.shadedPointCount, sunnyPoints: result.audit.sunnyPointCount, indeterminatePoints: result.audit.indeterminatePointCount }, plateau: { dataYear: metadata?.dataYear, buildingCount: metadata?.buildingCount ?? 0 }, appVersion: APP_VERSION, note }
}
