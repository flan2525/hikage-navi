export function MapFallback({ onRetry }: { onRetry: () => void }) {
  return <section className="map-fallback" role="alert" aria-live="assertive"><span className="fallback-mark">◒</span><h2>影の世界への入口を開けませんでした</h2><p>この端末では3D地図を表示できません。ブラウザのハードウェアアクセラレーションを有効にして、もう一度お試しください。</p><div><button onClick={onRetry}>地図を再試行</button><button onClick={() => window.location.reload()}>再読み込み</button></div><small>経路概要と時刻操作は引き続き利用できます。</small></section>
}
