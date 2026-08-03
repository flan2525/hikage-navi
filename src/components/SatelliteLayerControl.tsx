import type { Resource } from '../hooks/useAsyncResource'
import type { EnvironmentalLayerManifest } from '../types'
import { satelliteLayerOptions, type SatelliteSelection } from '../services/satellite'

type Props = { selection: SatelliteSelection; onSelectionChange: (selection: SatelliteSelection) => void; opacity: number; onOpacityChange: (opacity: number) => void; resource: Resource<EnvironmentalLayerManifest>; debug?: boolean }
const formatObservedAt = (value: string) => new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
const ratio = (value: number | undefined) => value == null ? '—' : `${(value * 100).toFixed(1)}%`

export function SatelliteLayerControl({ selection, onSelectionChange, opacity, onOpacityChange, resource, debug = false }: Props) {
  const layer = resource.data?.layers.find((item) => item.id === selection)
  return <section className={`satellite-control ${debug ? 'satellite-control-debug' : ''}`} aria-labelledby={debug ? 'satellite-title-debug' : 'satellite-title'}>
    <div className="satellite-heading"><div><p id={debug ? 'satellite-title-debug' : 'satellite-title'}>衛星レイヤー</p><small>影・建物・ルートとは独立した環境観測</small></div>{selection !== 'none' && <button className="satellite-retry" onClick={resource.reload} aria-label="衛星データを再取得">↻</button>}</div>
    <select aria-label="衛星レイヤーを選択" value={selection} onChange={(event) => onSelectionChange(event.target.value as SatelliteSelection)}>{satelliteLayerOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
    {selection !== 'none' && <label className="satellite-opacity">透明度 <output>{Math.round(opacity * 100)}%</output><input type="range" min="0" max="1" step=".05" value={opacity} onChange={(event) => onOpacityChange(Number(event.target.value))} /></label>}
    {resource.loading && selection !== 'none' && <p className="satellite-state" role="status">衛星データを読み込み中…</p>}
    {resource.error && selection !== 'none' && <p className="satellite-error" role="alert">{resource.error} <button onClick={resource.reload}>再試行</button></p>}
    {layer && <><p className="satellite-disclaimer">{layer.type === 'land-surface-temperature' ? `${layer.satellite}による${formatObservedAt(layer.observedAt)}の衛星地表面温度です。現在の気温ではありません。` : `${layer.satellite}による${formatObservedAt(layer.observedAt)}の植生・緑被の傾向です。樹木の正確な形状や影を示すものではありません。`}</p><dl className="satellite-meta"><div><dt>観測</dt><dd>{formatObservedAt(layer.observedAt)} / {layer.satellite}</dd></div><div><dt>解像度</dt><dd>{layer.nativeResolutionMeters && layer.nativeResolutionMeters !== layer.resolutionMeters ? `元約${layer.nativeResolutionMeters}m / 表示${layer.resolutionMeters}m` : `約${layer.resolutionMeters}m`}</dd></div><div><dt>品質</dt><dd>{layer.cloudCover == null ? `有効画素 ${ratio(layer.validPixelRatio)}` : `雲量 ${layer.cloudCover.toFixed(2)}% / 有効画素 ${ratio(layer.validPixelRatio)}`}</dd></div></dl><p className="satellite-attribution">出典: <a href={layer.sourceUrl} target="_blank" rel="noreferrer">{layer.source}</a></p><div className="satellite-scale" aria-label={`${layer.label}のカラーバー`}><span className="satellite-scale-bar" style={{ background: `linear-gradient(90deg, ${layer.colorStops.map((stop) => stop[1]).join(', ')})` }} /><span><small>{layer.min?.toFixed(layer.type === 'ndvi' ? 2 : 1) ?? '—'}{layer.unit ? ` ${layer.unit}` : ''}</small><small>{layer.max?.toFixed(layer.type === 'ndvi' ? 2 : 1) ?? '—'}{layer.unit ? ` ${layer.unit}` : ''}</small></span></div></>}
  </section>
}
