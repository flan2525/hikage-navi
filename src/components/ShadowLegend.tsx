export function ShadowLegend() {
  return <details className="shadow-legend" open><summary>地図の見方</summary><ul><li><i className="legend-shadow" />発光する青緑面：推定日陰</li><li><i className="legend-route" />明るい線：影渡りルート</li><li><i className="legend-shortest" />橙色線：最短ルート</li><li><i className="legend-building" />暗い立体：PLATEAU建物</li></ul><p>建物形状と太陽位置から推定</p></details>
}
