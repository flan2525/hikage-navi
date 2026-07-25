import type { CoveredWalkway, ValidationLocation } from '../types'

export const validationLocations: ValidationLocation[] = [
  { id: 'hiroshima-station-south', name: '広島駅南口', position: { lng: 132.4753, lat: 34.3978 }, zoom: 16.5, note: '駅前の高層建物と午前・午後の影を確認' },
  { id: 'hacchobori', name: '八丁堀', position: { lng: 132.4644, lat: 34.3968 }, zoom: 16.5, note: '交差点周辺の建物影を確認' },
  { id: 'hondori', name: '本通', position: { lng: 132.4602, lat: 34.3946 }, zoom: 16.5, note: 'アーケードと建物影を分けて確認' },
  { id: 'atomic-bomb-dome', name: '原爆ドーム周辺', position: { lng: 132.4537, lat: 34.3955 }, zoom: 16, note: '河川沿いの開けた場所との比較' },
  { id: 'peace-memorial-park', name: '平和記念公園', position: { lng: 132.4527, lat: 34.3928 }, zoom: 15.8, note: '公園内は樹木影を別要因として記録' },
]

// 位置・運用情報の一次確認前に使う検証用の概略線。実データとして扱わない。
export const coveredWalkways: CoveredWalkway[] = [
  { id: 'verification-hondori-arcade', name: '本通商店街アーケード（検証用概略）', type: 'covered_walkway', geometry: { type: 'LineString', coordinates: [{ lng: 132.4591, lat: 34.3941 }, { lng: 132.4614, lat: 34.3946 }, { lng: 132.4644, lat: 34.3951 }] }, activeHours: '要確認', alwaysShaded: true, passable: true, source: '検証用仮データ（一次情報未確認）', lastVerified: '2026-07-25', note: '建物影とは別の屋根付き通路として記録。形状・通行可否・営業時間は現地確認が必要。', isVerificationData: true },
]
