import type { ShadeResult, ShadeStatus } from '../types'

export type RouteMetrics = {
  totalShadeMeters: number
  longestShadeMeters: number
  sunnyMeters: number
  sunnySeconds: number
  maxSunnyCrossingMeters: number
  sunnyCrossings: number
  nextShadeDistanceMeters: number | null
  outsideCoverageMeters: number
}

const walkingSpeed = 1.25

export function calculateRouteMetrics(result: ShadeResult | undefined): RouteMetrics {
  if (!result || result.points.length < 2) return { totalShadeMeters: 0, longestShadeMeters: 0, sunnyMeters: 0, sunnySeconds: 0, maxSunnyCrossingMeters: 0, sunnyCrossings: 0, nextShadeDistanceMeters: null, outsideCoverageMeters: 0 }
  let totalShadeMeters = 0; let longestShadeMeters = 0; let sunnyMeters = 0; let maxSunnyCrossingMeters = 0; let sunnyCrossings = 0; let activeStatus: ShadeStatus | null = null; let activeDistance = 0; let nextShadeDistanceMeters: number | null = null
  const closeSegment = () => {
    if (activeStatus === 'shaded') longestShadeMeters = Math.max(longestShadeMeters, activeDistance)
    if (activeStatus === 'sunny') { maxSunnyCrossingMeters = Math.max(maxSunnyCrossingMeters, activeDistance); if (activeDistance > 0) sunnyCrossings += 1 }
  }
  for (let index = 1; index < result.points.length; index += 1) {
    const point = result.points[index]; const previous = result.points[index - 1]; const distance = Math.max(0, point.distanceFromStart - previous.distanceFromStart); const status = point.status
    if (activeStatus !== status) { closeSegment(); activeStatus = status; activeDistance = 0 }
    activeDistance += distance
    if (status === 'shaded') totalShadeMeters += distance
    if (status === 'sunny') sunnyMeters += distance
  }
  closeSegment()
  if (result.points[0]?.status === 'sunny') {
    const firstShade = result.points.find((point) => point.status === 'shaded')
    nextShadeDistanceMeters = firstShade ? firstShade.distanceFromStart : null
  } else nextShadeDistanceMeters = 0
  return { totalShadeMeters, longestShadeMeters, sunnyMeters, sunnySeconds: sunnyMeters / walkingSpeed, maxSunnyCrossingMeters, sunnyCrossings, nextShadeDistanceMeters, outsideCoverageMeters: result.outsideCoverageDistanceMeters }
}
