import { useEffect, useState } from 'react'

const seenKey = 'hikage-navi-shadow-world-intro-v1'
const getInitialVisibility = () => { try { return localStorage.getItem(seenKey) !== 'seen' } catch { return true } }

export function IntroSequence() {
  const [visible, setVisible] = useState(getInitialVisibility)
  const close = () => { try { localStorage.setItem(seenKey, 'seen') } catch { /* local storage is optional */ } setVisible(false) }
  useEffect(() => { if (!visible) return undefined; const id = window.setTimeout(close, 5600); return () => window.clearTimeout(id) }, [visible])
  if (!visible) return null
  return <aside className="world-intro" aria-live="polite"><p>太陽の下では見えない、<br />もう一つの広島。</p><span>影だけを渡って、目的地へ。</span><button onClick={close} aria-label="案内を閉じる">閉じる</button></aside>
}
