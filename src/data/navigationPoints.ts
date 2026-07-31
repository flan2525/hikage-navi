import type { NavigationPoint, Position } from '../types'

// 座標は OpenStreetMap の該当駅・地物（2026-07-31確認）に基づく。代表地点は説明で明示する。
export const navigationPoints: NavigationPoint[] = [
  { id: 'hiroshima-station', name: 'JR広島駅', shortName: '広島駅', areaId: 'central', category: 'station', coordinates: [132.4755766, 34.3978256], source: 'OpenStreetMap way 121045837' },
  { id: 'hacchobori', name: '八丁堀', shortName: '八丁堀', areaId: 'central', category: 'landmark', coordinates: [132.463245, 34.39616], source: 'OpenStreetMap node 1949391962' },
  { id: 'hondori', name: '本通', shortName: '本通', areaId: 'central', category: 'landmark', coordinates: [132.4569775, 34.3931587], source: 'OpenStreetMap node 9623798507' },
  { id: 'atomic-bomb-dome', name: '原爆ドーム', shortName: '原爆ドーム', areaId: 'central', category: 'landmark', coordinates: [132.4535245, 34.3954661], source: 'OpenStreetMap relation 1506282' },
  { id: 'peace-memorial-park', name: '平和記念公園', shortName: '平和公園', areaId: 'central', category: 'park', coordinates: [132.4523008, 34.3931714], source: 'OpenStreetMap relation 1971933' },
  { id: 'astram-hakushima', name: 'アストラムライン白島駅', shortName: '白島駅', areaId: 'hakushima', category: 'station', coordinates: [132.4627488, 34.4109218], source: 'OpenStreetMap node 5205871583' },
  { id: 'shinhakushima', name: 'JR・アストラムライン新白島駅', shortName: '新白島駅', areaId: 'hakushima', category: 'station', coordinates: [132.4616303, 34.4083746], source: 'OpenStreetMap relation 7702659' },
  { id: 'jr-yokogawa', name: 'JR横川駅', shortName: 'JR横川駅', areaId: 'yokogawa', category: 'station', coordinates: [132.4503303, 34.4102588], source: 'OpenStreetMap relation 11680029' },
  { id: 'hiroden-yokogawa', name: '広電横川駅', shortName: '広電横川駅', areaId: 'yokogawa', category: 'tram', coordinates: [132.4505209, 34.4095196], source: 'OpenStreetMap relation 17871622' },
  { id: 'yokogawa-shopping', name: '横川商店街（駅側代表地点）', shortName: '横川商店街', areaId: 'yokogawa', category: 'shopping', coordinates: [132.44992, 34.408067], description: '駅前側の代表地点。商店街全体の境界ではない。', source: 'OpenStreetMap 横川駅前道路座標' },
  { id: 'ota-river-side', name: '太田川放水路沿い（代表地点）', shortName: '河川沿い', areaId: 'yokogawa', category: 'riverside', coordinates: [132.431929, 34.397813], description: '河川沿い比較用の代表地点。河川区間全体を表すものではない。', source: 'OpenStreetMap relation 9218690' },
  { id: 'jr-nishi-hiroshima', name: 'JR西広島駅', shortName: 'JR西広島駅', areaId: 'nishi-hiroshima', category: 'station', coordinates: [132.4281626, 34.3981397], source: 'OpenStreetMap relation 17871912' },
  { id: 'hiroden-nishi-hiroshima', name: '広電西広島駅', shortName: '広電西広島駅', areaId: 'nishi-hiroshima', category: 'tram', coordinates: [132.4277247, 34.3967956], source: 'OpenStreetMap relation 17871911' },
  { id: 'koi', name: '己斐地区（代表地点）', shortName: '己斐地区', areaId: 'nishi-hiroshima', category: 'landmark', coordinates: [132.4268228, 34.3986838], description: '地区比較用の代表地点。地区境界ではない。', source: 'OpenStreetMap node 7658457790' },
]

export const pointById = new Map(navigationPoints.map((point) => [point.id, point]))
export const positionForPoint = (point: NavigationPoint): Position => ({ lng: point.coordinates[0], lat: point.coordinates[1] })
