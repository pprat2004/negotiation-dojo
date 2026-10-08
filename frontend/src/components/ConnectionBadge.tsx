import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Health } from '../api/types'

export default function ConnectionBadge() {
  const [health, setHealth] = useState<Health | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    api
      .health()
      .then((h) => alive && setHealth(h))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [])

  const tone = failed
    ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
    : health
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
      : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'

  return (
    <span role="status" className={`rounded-full px-3 py-1 text-xs font-medium ${tone}`}>
      {failed ? 'API offline' : health ? `API online · ${health.provider}` : 'Connecting…'}
    </span>
  )
}