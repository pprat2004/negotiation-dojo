import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Difficulty, Domain, StatsOut } from '../api/types'
import DifficultyPicker from '../components/DifficultyPicker'
import DomainPicker from '../components/DomainPicker'
import { setActiveSessionId } from '../lib/activeSession'
import { errorMessage } from '../lib/format'
import { MAX_CONTEXT, MAX_GOAL, MIN_GOAL } from '../lib/limits'
import { useSessionStore } from '../store/sessionStore'

export default function SetupPage() {
  const navigate = useNavigate()
  const startSession = useSessionStore((s) => s.startSession)
  const activePhase = useSessionStore((s) => s.phase)

  const [domains, setDomains] = useState<Domain[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [stats, setStats] = useState<StatsOut | null>(null)

  const [domainId, setDomainId] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium')
  const [difficultyTouched, setDifficultyTouched] = useState(false)
  const [goal, setGoal] = useState('')
  const [context, setContext] = useState('')
  const [goalTouched, setGoalTouched] = useState(false)
  const [contextTouched, setContextTouched] = useState(false)

  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    api
      .domains()
      .then((list) => {
        if (!alive) return
        setDomains(list)
        const first = list[0]
        if (first) {
          setDomainId(first.id)
          setGoal(first.default_goal)
          setContext(first.default_context)
        }
      })
      .catch((e: unknown) => alive && setLoadError(errorMessage(e)))
    api
      .stats()
      .then((s) => alive && setStats(s))
      .catch(() => undefined) // the suggestion is a bonus, never block the form on it
    return () => {
      alive = false
    }
  }, [])

  const suggestion = stats && stats.scored_sessions > 0 ? stats.suggested_difficulty : null
  useEffect(() => {
    if (suggestion && !difficultyTouched) setDifficulty(suggestion)
  }, [suggestion, difficultyTouched])

  const domain = useMemo(() => domains?.find((d) => d.id === domainId) ?? null, [domains, domainId])

  function changeDomain(id: string) {
    setDomainId(id)
    const d = domains?.find((x) => x.id === id)
    if (!d) return
    if (!goalTouched) setGoal(d.default_goal)
    if (!contextTouched) setContext(d.default_context)
  }

  const goalClean = goal.trim()
  const goalValid = goalClean.length >= MIN_GOAL && goalClean.length <= MAX_GOAL
  const canStart = !!domain && goalValid && context.length <= MAX_CONTEXT && !starting

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canStart) return
    setStarting(true)
    setError(null)
    try {
      const res = await api.createSession({ domain: domainId, difficulty, goal: goalClean, context: context.trim() })
      startSession({
        sessionId: res.session_id,
        opening: res.opening_message,
        domainId,
        difficulty,
        goal: goalClean,
      })
      setActiveSessionId(res.session_id)
      navigate('/dojo')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setStarting(false)
    }
  }

  if (loadError) {
    return (
      <section className="card">
        <h1 className="text-xl font-bold">Set up your session</h1>
        <p role="alert" className="mt-3 text-sm text-red-600">
          ⚠️ Could not load scenarios: {loadError}
        </p>
        <button type="button" className="btn btn-ghost mt-3" onClick={() => window.location.reload()}>
          Try again
        </button>
      </section>
    )
  }

  if (!domains) return <p className="text-sm text-stone-500">Loading scenarios…</p>

  return (
    <div className="space-y-4">
      {activePhase === 'active' && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950">
          <span className="flex-1">You have a negotiation in progress. Starting a new one will replace it on this screen.</span>
          <Link to="/dojo" className="btn btn-ghost">
            Resume
          </Link>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="card space-y-5">
        <div>
          <h1 className="text-xl font-bold">Set up your session</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Pick a scenario, set your goal and tell the opponent nothing: they'll find out as you negotiate.
          </p>
        </div>

        <DomainPicker domains={domains} value={domainId} onChange={changeDomain} />
        {domain && (
          <p className="-mt-2 text-sm text-stone-600 dark:text-stone-400">
            You play <span className="font-semibold">{domain.user_role}</span>.
          </p>
        )}

        <DifficultyPicker
          value={difficulty}
          onChange={(d) => {
            setDifficulty(d)
            setDifficultyTouched(true)
          }}
          suggested={suggestion}
          reason={stats?.suggestion_reason}
        />

        <div>
          <label htmlFor="goal" className="mb-1 block text-sm font-semibold">
            Your goal
          </label>
          <textarea
            id="goal"
            rows={2}
            maxLength={MAX_GOAL}
            value={goal}
            onChange={(e) => {
              setGoal(e.target.value)
              setGoalTouched(true)
            }}
            className="input resize-y"
            aria-describedby="goal-count"
          />
          <div id="goal-count" className="mt-1 flex justify-between text-xs text-stone-500">
            <span className={goalClean.length > 0 && !goalValid ? 'text-red-600' : ''}>
              {goalClean.length < MIN_GOAL ? `At least ${MIN_GOAL} characters` : 'What a good outcome looks like'}
            </span>
            <span>
              {goal.length}/{MAX_GOAL}
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="context" className="mb-1 block text-sm font-semibold">
            Context and leverage you have
          </label>
          <textarea
            id="context"
            rows={3}
            maxLength={MAX_CONTEXT}
            value={context}
            onChange={(e) => {
              setContext(e.target.value)
              setContextTouched(true)
            }}
            className="input resize-y"
            aria-describedby="ctx-count"
          />
          <div id="ctx-count" className="mt-1 flex justify-between text-xs text-stone-500">
            <span>The coach uses this to spot leverage you haven't used yet.</span>
            <span>
              {context.length}/{MAX_CONTEXT}
            </span>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            ⚠️ {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary" disabled={!canStart}>
          {starting ? 'Opening the negotiation…' : 'Enter the dojo →'}
        </button>
      </form>
    </div>
  )
}