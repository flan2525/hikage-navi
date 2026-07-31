import { useEffect, useState } from 'react'

const presets = [{ label: '現在', minutes: () => new Date().getHours() * 60 + new Date().getMinutes() }, { label: '9:00', minutes: () => 540 }, { label: '12:00', minutes: () => 720 }, { label: '15:00', minutes: () => 900 }, { label: '17:00', minutes: () => 1020 }, { label: '日没前', minutes: () => 1090 }]
const hintKey = 'hikage-navi-time-hint-v1'
const toMinutes = (date: Date) => date.getHours() * 60 + date.getMinutes()
const format = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export function ShadowTimeControl({ value, onCommit }: { value: Date; onCommit: (minutes: number) => void }) {
  const [draft, setDraft] = useState(toMinutes(value))
  const [showHint, setShowHint] = useState(() => { try { return localStorage.getItem(hintKey) !== 'seen' } catch { return true } })
  useEffect(() => setDraft(toMinutes(value)), [value])
  const commit = () => onCommit(draft)
  const closeHint = () => { try { localStorage.setItem(hintKey, 'seen') } catch { /* optional storage */ } setShowHint(false) }
  return <section className="shadow-time" aria-label="出発時刻"><div><span>出発</span><strong>{format(draft)}</strong></div><input type="range" min="540" max="1090" step="10" value={draft} onChange={(event) => setDraft(Number(event.target.value))} onPointerUp={commit} onKeyUp={commit} aria-label="出発時刻を変更" aria-valuetext={`${format(draft)}に出発`} /><div className="time-presets">{presets.map((preset) => <button key={preset.label} onClick={() => { const minutes = preset.minutes(); setDraft(minutes); onCommit(minutes) }}>{preset.label}</button>)}</div>{showHint && <p className="time-hint">時刻を動かすと、街の影も動きます <button onClick={closeHint} aria-label="時刻操作のヒントを閉じる">×</button></p>}<small>スライダーを離すと、影の世界を再計算</small></section>
}
