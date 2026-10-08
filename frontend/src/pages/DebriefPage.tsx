import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { Domain, Scorecard, SessionDetail, SessionStatus } from '../api/types'
import ScoreCard from '../components/ScoreCard'
import { clearActiveSessionId, getActiveSessionId } from '../lib/activeSession'
import { ratingTone } from '../lib/coach'
import { errorMessage, formatDateTime } from '../lib/format'
import { useSessionStore } from '../store/sessionStore'

function release(id: string) {
  if (getActiveSessionId() === id) clearActiveSessionId() // a scored session is finished
}

export default function DebriefPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  const [detail, setDetail] = useState<SessionDetail | null>(null)
  const [card, setCard] = useState<Scorecard | null>(null)
  const [status, setStatus] = useState<SessionStatus>('ended')
  const [domain, setDomain] = useState<Domain | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return
    let alive = true
    setLoading(true)
    setError(null)
    api
      .getSession(sessionId)
      .then((d) => {
        if (!alive) return
        setDetail(d)
        setCard(d.scorecard)
        setStatus(d.status)
        if (d.scorecard) release(d.id)
        api
          .domains()
          .then((list) => alive && setDomain(list.find((x) => x.id === d.domain) ?? null))
          .catch(() => undefined)
      })
      .catch((e: unknown) => alive && setError(errorMessage(e)))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [sessionId])

  const noteByMessage = useMemo(() => new Map((detail?.coach_notes ?? []).map((n) => [n.message_id, n])), [detail])
  const moves = detail?.messages.filter((m) => m.role === 'user').length ?? 0

  async function generate() {
    if (!sessionId || generating) return
    setGenerating(true)
    setError(null)
    try {
      const res = await api.endSession(sessionId)
      setCard(res.scorecard)
      setStatus(res.status)
      release(sessionId)
      const s = useSessionStore.getState()
      if (s.sessionId === sessionId) {
        s.setScorecard(res.scorecard)
        s.setPhase(res.status)
      }
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setGenerating(false)
    }
  }

  function newSession() {
    useSessionStore.getState().reset()
    clearActiveSessionId()
    navigate('/')
  }

  if (loading) return <p className="text-sm text-stone-500">Loading your debrief…</p>

  if (!detail) {
    return (
      <section className="card text-center">
        <h1 className="text-xl font-bold">Debrief not found</h1>
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error ?? 'This session does not exist or belongs to another browser.'}
        </p>
        <Link to="/progress" className="btn btn-ghost mt-4">
          Back to progress
        </Link>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">
            {domain ? `${domain.emoji} ${domain.label}` : 'Debrief'} · {detail.difficulty}
          </h1>
          <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-400">
            <span className="font-semibold">Goal:</span> {detail.goal}
            <span className="ml-2 text-xs text-stone-500">{formatDateTime(detail.created_at)}</span>
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={newSession}>
          New session
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          ⚠️ {error}
        </p>
      )}

      {card ? (
        <ScoreCard card={card} status={status} />
      ) : (
        <section className="card text-center">
          <h2 className="text-lg font-bold text-debrief">Not scored yet</h2>
          {moves < 1 ? (
            <p className="mt-2 text-sm text-stone-500">Make at least one move in the dojo before the debrief can score it.</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-stone-500">
                The Debrief agent will review all {moves} of your moves. Scoring ends the negotiation.
              </p>
              <button type="button" className="btn btn-primary mt-4" onClick={generate} disabled={generating}>
                {generating ? 'Scoring…' : 'Score this negotiation'}
              </button>
            </>
          )}
          {detail.status === 'active' && (
            <p className="mt-3 text-sm">
              <Link to="/dojo" className="underline">
                or go back and keep negotiating
              </Link>
            </p>
          )}
        </section>
      )}

      <details className="card">
        <summary className="cursor-pointer text-sm font-semibold">Full transcript with coach ratings</summary>
        <div className="mt-3 space-y-2">
          {detail.messages.map((m) => {
            const note = m.role === 'user' ? noteByMessage.get(m.id) : undefined
            return (
              <div key={m.id} className="text-sm">
                <span className={`font-bold ${m.role === 'user' ? '' : 'text-counterpart'}`}>
                  {m.role === 'user' ? 'You' : 'Counterpart'}:
                </span>{' '}
                {m.content}
                {note && (
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${
                      { good: 'bg-emerald-100 text-emerald-800', ok: 'bg-amber-100 text-amber-800', low: 'bg-red-100 text-red-800' }[
                        ratingTone(note.rating)
                      ]
                    }`}
                  >
                    {note.rating}/10
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </details>
    </div>
  )
}