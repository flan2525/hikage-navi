import { useCallback, useEffect, useState } from 'react'
export type Resource<T> = { data: T | null; loading: boolean; error: string | null; reload: () => void }
export function useAsyncResource<T>(load: (signal: AbortSignal) => Promise<T>): Resource<T> {
  const [version, setVersion] = useState(0); const [data, setData] = useState<T | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null)
  const reload = useCallback(() => setVersion((current) => current + 1), [])
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError(null); load(controller.signal).then((value) => { if (!controller.signal.aborted) setData(value) }).catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : '読み込みに失敗しました') }).finally(() => { if (!controller.signal.aborted) setLoading(false) }); return () => controller.abort() }, [load, version])
  return { data, loading, error, reload }
}
