import type { WorldMode } from '../types'

export function WorldModeToggle({ mode, onChange }: { mode: WorldMode; onChange: (mode: WorldMode) => void }) {
  return <div className="world-toggle" role="group" aria-label="世界表示を切り替え"><button className={mode === 'shadow' ? 'active' : ''} aria-pressed={mode === 'shadow'} onClick={() => onChange('shadow')}>影の世界</button><button className={mode === 'reality' ? 'active' : ''} aria-pressed={mode === 'reality'} onClick={() => onChange('reality')}>現実を見る</button></div>
}
