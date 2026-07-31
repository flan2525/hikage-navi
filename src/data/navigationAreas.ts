import type { NavigationArea } from '../types'

export const navigationAreas: NavigationArea[] = [
  { id: 'central', name: '広島中心部', description: '広島駅・八丁堀・本通・平和記念公園', center: [132.4633, 34.3967], defaultZoom: 14.2, pointIds: ['hiroshima-station', 'hacchobori', 'hondori', 'atomic-bomb-dome', 'peace-memorial-park'], buildingDatasetIds: ['central'] },
  { id: 'hakushima', name: '白島・新白島', description: 'アストラムライン白島駅と新白島駅', center: [132.4619, 34.4097], defaultZoom: 15.2, pointIds: ['astram-hakushima', 'shinhakushima'], buildingDatasetIds: ['hakushima'] },
  { id: 'yokogawa', name: '横川', description: 'JR・広電横川駅、商店街、河川沿い', center: [132.4495, 34.409], defaultZoom: 14.8, pointIds: ['jr-yokogawa', 'hiroden-yokogawa', 'yokogawa-shopping', 'ota-river-side'], buildingDatasetIds: ['yokogawa'] },
  { id: 'nishi-hiroshima', name: '西広島', description: 'JR・広電西広島駅と己斐地区', center: [132.428, 34.398], defaultZoom: 14.8, pointIds: ['jr-nishi-hiroshima', 'hiroden-nishi-hiroshima', 'koi'], buildingDatasetIds: ['nishi-hiroshima'] },
]

export const areaById = new Map(navigationAreas.map((area) => [area.id, area]))
