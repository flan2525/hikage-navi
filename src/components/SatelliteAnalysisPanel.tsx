import type { Resource } from '../hooks/useAsyncResource'
import type { RouteKind, SatelliteAnalysisResult, SatelliteRouteAnalysis } from '../types'

type DebugVisibility = { highTemperature: boolean; vegetation: boolean; noData: boolean }
type Props = {
  open: boolean
  onToggle: (open: boolean) => void
  resource: Resource<SatelliteAnalysisResult>
  selectedRouteId?: string
  selectedRouteKind: RouteKind
  debug?: boolean
  debugVisibility?: DebugVisibility
  onDebugVisibilityChange?: (key: keyof DebugVisibility, value: boolean) => void
}

const formatMeters = (value: number) => `${Math.round(value)}m`
const formatPercent = (value: number) => `${Math.round(value * 100)}%`
const formatTemperature = (value: number | null) => value == null ? '—' : `${value.toFixed(1)}℃`
const formatNdvi = (value: number | null) => value == null ? '—' : value.toFixed(2)
const formatBytes = (value: number) => value < 1024 * 1024 ? `${(value / 1024).toFixed(1)}KiB` : `${(value / 1024 / 1024).toFixed(2)}MiB`
const formatObservedAt = (value: string) => new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))

function MetricRows({ analysis }: { analysis: SatelliteRouteAnalysis }) {
  return <div className="satellite-analysis-metrics"><div><span>LST中央値</span><strong>{formatTemperature(analysis.lst.weightedMedian)}</strong></div><div><span>LST p90</span><strong>{formatTemperature(analysis.lst.weightedP90)}</strong></div><div><span>相対的な高温傾向</span><strong>{formatMeters(analysis.lst.highTempDistanceMeters)}</strong><small>区間率 {formatPercent(analysis.lst.highTempRate)}</small></div><div><span>NDVI平均</span><strong>{formatNdvi(analysis.ndvi.weightedAverage)}</strong></div><div><span>植生傾向</span><strong>{formatMeters(analysis.ndvi.vegetationDistanceMeters)}</strong><small>区間率 {formatPercent(analysis.ndvi.vegetationRate)}</small></div><div><span>有効率</span><strong>LST {formatPercent(analysis.lst.validDataRate)}</strong><small>NDVI {formatPercent(analysis.ndvi.validDataRate)}</small></div></div>
}

function DebugComparison({ data }: { data: SatelliteAnalysisResult }) {
  const analyses = Object.values(data.routeAnalyses)
  return <div className="satellite-debug-comparison"><p className="satellite-debug-label">影渡り／灼熱ルート比較（参考値）</p><div className="satellite-comparison-table"><div className="satellite-comparison-head"><span>指標</span>{analyses.map((analysis) => <span key={analysis.routeId}>{analysis.routeKind === 'shade' ? '影渡り' : '灼熱ルート'}</span>)}</div>{[['距離', (analysis: SatelliteRouteAnalysis) => formatMeters(analysis.totalDistanceMeters)], ['推定日陰率', (analysis: SatelliteRouteAnalysis) => formatPercent(analysis.shadePercent / 100)], ['LST中央値', (analysis: SatelliteRouteAnalysis) => formatTemperature(analysis.lst.weightedMedian)], ['LST p90', (analysis: SatelliteRouteAnalysis) => formatTemperature(analysis.lst.weightedP90)], ['高温傾向区間', (analysis: SatelliteRouteAnalysis) => formatMeters(analysis.lst.highTempDistanceMeters)], ['NDVI平均', (analysis: SatelliteRouteAnalysis) => formatNdvi(analysis.ndvi.weightedAverage)], ['植生傾向区間', (analysis: SatelliteRouteAnalysis) => formatMeters(analysis.ndvi.vegetationDistanceMeters)], ['LST有効率', (analysis: SatelliteRouteAnalysis) => formatPercent(analysis.lst.validDataRate)], ['NDVI有効率', (analysis: SatelliteRouteAnalysis) => formatPercent(analysis.ndvi.validDataRate)], ['参照画素数', (analysis: SatelliteRouteAnalysis) => `${analysis.lst.referencePixelCount} / ${analysis.ndvi.referencePixelCount}`], ['ユニーク画素数', (analysis: SatelliteRouteAnalysis) => `${analysis.lst.uniquePixelCount} / ${analysis.ndvi.uniquePixelCount}`], ['経路解析時間', (analysis: SatelliteRouteAnalysis) => `${analysis.analysisMilliseconds.toFixed(1)}ms`]].map(([label, value]) => <div className="satellite-comparison-row" key={String(label)}><span>{String(label)}</span>{analyses.map((analysis) => <span key={analysis.routeId}>{(value as (analysis: SatelliteRouteAnalysis) => string)(analysis)}</span>)}</div>)}</div></div>
}

export function SatelliteAnalysisPanel({ open, onToggle, resource, selectedRouteId, selectedRouteKind, debug = false, debugVisibility, onDebugVisibilityChange }: Props) {
  const selectedAnalysis = selectedRouteId ? resource.data?.routeAnalyses[selectedRouteId] : undefined
  const hasAnalysis = Boolean(resource.data && selectedAnalysis)
  return <section className={`satellite-analysis ${debug ? 'satellite-analysis-debug' : ''}`} aria-labelledby={debug ? 'satellite-analysis-title-debug' : 'satellite-analysis-title'}>
    <div className="satellite-analysis-heading"><button className="satellite-analysis-toggle" aria-expanded={open} onClick={() => onToggle(!open)}><span id={debug ? 'satellite-analysis-title-debug' : 'satellite-analysis-title'}>衛星観測による参考情報</span><small>{open ? '閉じる' : '開く'}</small></button>{open && <button className="satellite-retry" onClick={resource.reload} aria-label="衛星経路分析を再計算">↻</button>}</div>
    {open && <div className="satellite-analysis-body"><p className="satellite-analysis-note">過去の衛星観測に基づく地表面・植生の傾向です。現在の気温、路面温度、体感温度を示すものではありません。</p>{resource.loading && <p className="satellite-state" role="status">衛星数値グリッドを読み込み、経路を分析中…</p>}{resource.error && <p className="satellite-error" role="alert">{resource.error} <button onClick={resource.reload}>再試行</button></p>}{hasAnalysis && selectedAnalysis && <><p className="satellite-analysis-route-label">{selectedRouteKind === 'shade' ? '影渡り' : '灼熱ルート'}の参考値</p><MetricRows analysis={selectedAnalysis} /><p className="satellite-analysis-observed">観測日：LST {formatObservedAt(resource.data!.observedAt.lst)} / NDVI {formatObservedAt(resource.data!.observedAt.ndvi)}</p></>}{debug && resource.data && <><DebugComparison data={resource.data} /><div className="satellite-debug-status"><p>数値グリッド：読み込み済み / {formatBytes(resource.data.gridBytes)} / メモリ約{formatBytes(resource.data.gridMemoryBytes)}</p><p>経路分析：{resource.data.totalAnalysisMilliseconds.toFixed(1)}ms（グリッド取得 {resource.data.gridLoadMilliseconds.toFixed(1)}ms）</p></div>{debugVisibility && onDebugVisibilityChange && <fieldset className="satellite-debug-layers"><legend>衛星サンプル点</legend>{([['highTemperature', '高温傾向'], ['vegetation', '植生傾向'], ['noData', 'NoData / 範囲外']] as const).map(([key, label]) => <label key={key}><input type="checkbox" checked={debugVisibility[key]} onChange={(event) => onDebugVisibilityChange(key, event.target.checked)} />{label}</label>)}</fieldset>}</>}</div>}
  </section>
}
