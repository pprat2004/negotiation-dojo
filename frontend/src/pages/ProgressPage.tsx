import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Domain, HistoryItem, StatsOut } from '../api/types'
import DimensionBars from '../components/DimensionBars'
import ProgressChart from '../components/ProgressChart'
import { getActiveSessionId } from '../lib/activeSession'
import { errorMessage, formatDateTime, STATUS_LABEL, scoreTone } from '../lib/format'

const TREND: Record<StatsOut['trend'], string> = {
  improving: '📈 Improving',
  declining: '📉 Declining',
  steady: '➖ Steady',
  not_enough_data: 'Needs 4+ scored sessions',
}
const SCORE_TONE = {
  good: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  ok: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  low: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  )
}

export default function ProgressPage() {
  const [stats, setStats] = useState<StatsOut | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    Promise.all([api.stats(), api.history(50), api.domains()])
      .then(([s, h, d]) => {
        if (!alive) return
        setStats(s)
        setHistory(h)
        setDomains(d)
      })
      .catch((e: unknown) => alive && setError(errorMessage(e)))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [attempt])

  const domainLabel = (id: string) => {
    const d = domains.find((x) => x.id === id)
    return d ? `${d.emoji} ${d.label}` : id
  }

  if (loading) return <p className="text-sm text-stone-500">Loading your progress…</p>

  if (error || !stats) {
    return (
      <section className="card text-center">
        <h1 className="text-xl font-bold">Progress</h1>
        <p role="alert" className="mt-2 text-sm text-red-600">
          ⚠️ {error ?? 'Could not load your progress.'}
        </p>
        <button type="button" className="btn btn-ghost mt-3" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      </section>
    )
  }

  if (stats.sessions_total === 0) {
    return (
      <section className="card text-center">
        <h1 className="text-xl font-bold">Progress</h1>
        <p className="mt-2 text-sm text-stone-500">No sessions yet. Finish a negotiation and your scores show up here.</p>
        <Link to="/" className="btn btn-primary mt-4">
          Start practising
        </Link>
      </section>
    )
  }

  const activeId = getActiveSessionId()
  const hasScores = stats.scored_sessions > 0

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Your progress</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Sessions" value={String(stats.sessions_total)} />
        <Tile label="Average score" value={stats.average_score !== null ? String(stats.average_score) : '–'} />
        <Tile label="Best score" value={stats.best_score !== null ? String(stats.best_score) : '–'} />
        <Tile label="Trend" value={TREND[stats.trend]} />
      </div>

      {hasScores ? (
        <>
          <section className="card">
            <h2 className="mb-2 text-lg font-bold">Scores over time</h2>
            <ProgressChart data={stats.recent.map((r) => ({ score: r.score, label: formatDateTime(r.created_at) }))} />
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="card">
              <h2 className="mb-3 text-lg font-bold text-debrief">Average by skill</h2>
              <DimensionBars values={stats.dimension_averages} />
            </section>

            <section className="card">
              <h2 className="mb-3 text-lg font-bold">By scenario</h2>
              <ul className="space-y-2 text-sm">
                {Object.entries(stats.by_domain).map(([id, d]) => (
                  <li key={id} className="flex items-center justify-between">
                    <span>{domainLabel(id)}</span>
                    <span className="text-stone-600 dark:text-stone-400">
                      avg <b className="text-stone-900 dark:text-stone-100">{d.average}</b> · {d.count} {d.count === 1 ? 'session' : 'sessions'}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-xl border border-coach/30 bg-coach/5 p-3 text-sm">
                <div className="font-semibold text-coach">Next up: {stats.suggested_difficulty}</div>
                <p className="mt-0.5 text-stone-600 dark:text-stone-400">{stats.suggestion_reason}</p>
              </div>
            </section>
          </div>
        </>
      ) : (
        <p className="card text-sm text-stone-500">
          No scored sessions yet. Charts appear after your first debrief.
        </p>
      )}

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">Session history</h2>
        <ul className="divide-y divide-stone-200 dark:divide-stone-800">
          {history.map((h) => {
            const resume = h.score === null && h.status === 'active' && h.id === activeId
            return (
              <li key={h.id}>
                <Link
                  to={resume ? '/dojo' : `/debrief/${h.id}`}
                  className="flex flex-wrap items-center gap-3 rounded-lg px-1 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">
                      {domainLabel(h.domain)} · {h.difficulty}
                    </div>
                    <div className="truncate text-xs text-stone-500">{h.goal}</div>
                  </div>
                  <span className="text-xs text-stone-500">{STATUS_LABEL[h.status]}</span>
                  <span className="text-xs text-stone-500">{formatDateTime(h.created_at)}</span>
                  {h.score !== null ? (
                    <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${SCORE_TONE[scoreTone(h.score)]}`}>{h.score}</span>
                  ) : (
                    <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold dark:bg-stone-800">
                      {resume ? 'Resume' : 'Score it'}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}