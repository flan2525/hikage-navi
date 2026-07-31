import type { Building, CoolSpot, Position, RoutePlan } from '../types'

export const HIROSHIMA_CENTER: Position = { lng: 132.4633, lat: 34.3967 }
export const START: Position = { lng: 132.4753, lat: 34.3978 }
export const DESTINATION: Position = { lng: 132.4537, lat: 34.3955 }

export const fallbackRoutes: RoutePlan[] = [
  { id: 'sample-shade', kind: 'shade', label: '影渡り（実証用サンプル）', source: 'fallback', distanceMeters: 2650, durationSeconds: 2040, coordinates: [START, { lng: 132.4717, lat: 34.3973 }, { lng: 132.4678, lat: 34.3968 }, { lng: 132.4644, lat: 34.3955 }, { lng: 132.4600, lat: 34.3946 }, { lng: 132.4565, lat: 34.3942 }, DESTINATION] },
  { id: 'sample-shortest', kind: 'shortest', label: '灼熱ルート（実証用サンプル）', source: 'fallback', distanceMeters: 2380, durationSeconds: 1810, coordinates: [START, { lng: 132.4706, lat: 34.3978 }, { lng: 132.4652, lat: 34.3974 }, { lng: 132.4595, lat: 34.3967 }, DESTINATION] },
]

// PLATEAU配信データを導入するまでの、表示・計算確認専用の小範囲サンプル。
export const demoBuildings: Building[] = [
  { id: 'demo-1', name: '駅前建物（実証用）', heightMeters: 33, source: '実証用サンプル', isSample: true, footprint: [{ lng: 132.4712, lat: 34.3975 }, { lng: 132.4719, lat: 34.3975 }, { lng: 132.4719, lat: 34.3979 }, { lng: 132.4712, lat: 34.3979 }] },
  { id: 'demo-2', name: '八丁堀建物（実証用）', heightMeters: 45, source: '実証用サンプル', isSample: true, footprint: [{ lng: 132.4646, lat: 34.3966 }, { lng: 132.4653, lat: 34.3966 }, { lng: 132.4653, lat: 34.3970 }, { lng: 132.4646, lat: 34.3970 }] },
  { id: 'demo-3', name: '紙屋町建物（実証用）', heightMeters: 29, source: '実証用サンプル', isSample: true, footprint: [{ lng: 132.4582, lat: 34.3946 }, { lng: 132.4589, lat: 34.3946 }, { lng: 132.4589, lat: 34.3950 }, { lng: 132.4582, lat: 34.3950 }] },
]

export const coolSpots: CoolSpot[] = [
  { id: 'hondori-arcade', type: 'arcade', name: '本通商店街アーケード', activeHours: '通行可能時間に準拠', shadeBonus: 1, passable: true, source: '実証用登録（要現地確認）', lastVerified: '2026-07-25', geometry: [{ lng: 132.4589, lat: 34.3941 }, { lng: 132.4646, lat: 34.3951 }] },
]
