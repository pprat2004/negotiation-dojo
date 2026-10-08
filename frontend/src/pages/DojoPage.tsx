import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { Domain } from '../api/types'
import ChatWindow from '../components/ChatWindow'
import CoachPanel from '../components/CoachPanel'
import VoiceControls from '../components/VoiceControls'
import { useNegotiationStream } from '../hooks/useNegotiationStream'
import { useSpeech } from '../hooks/useSpeech'
import { clearActiveSessionId, getActiveSessionId } from '../lib/activeSession'
import { errorMessage, STATUS_LABEL } from '../lib/format'
import { MAX_MESSAGE } from '../lib/limits'
import { readFlag, writeFlag } from '../lib/prefs'
import { useSessionStore } from '../store/sessionStore'

export default function DojoPage() {
  const navigate = useNavigate()
  const {
    sessionId, domainId, difficulty, goal, phase, messages, tips, busy, error,
    hydrate, setError, setScorecard, setPhase,
  } = useSessionStore()
  const { send } = useNegotiationStream()
  const {
    recognitionSupported, synthesisSupported, listening, interim, voiceError,
    startListening, stopListening, speak, cancelSpeech,
  } = useSpeech()

  const [draft, setDraft] = useState('')
  const [ending, setEnding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [domain, setDomain] = useState<Domain | null>(null)
  const [ttsOn, setTtsOn] = useState(() => readFlag('dojo_tts'))
  const [autoSend, setAutoSend] = useState(() => readFlag('dojo_autosend'))

  const draftRef = useRef(draft)
  draftRef.current = draft
  const autoSendRef = useRef(autoSend)
  autoSendRef.current = autoSend
  const initialMessages = useSessionStore.getState().messages
  const spokenRef = useRef<string | null>(initialMessages[initialMessages.length - 1]?.id ?? null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const moves = messages.filter((m) => m.role === 'user').length
  const last = messages[messages.length - 1]
  const canType = phase === 'active' && !busy && !ending
  const pendingCoach = busy && !tips.some((t) => t.round === moves)

  // Page refresh: the store is empty but the backend still has the session, so restore it.
  useEffect(() => {
    if (sessionId) return
    const saved = getActiveSessionId()
    if (!saved) return
    let alive = true
    setLoading(true)
    api
      .getSession(saved)
      .then((detail) => {
        if (!alive) return
        hydrate(detail)
        const restoredMessages = useSessionStore.getState().messages
        spokenRef.current = restoredMessages[restoredMessages.length - 1]?.id ?? null // don't read old messages aloud
      })
      .catch((e: unknown) => {
        if (!alive) return
        if (e instanceof ApiError && e.status === 404) clearActiveSessionId()
        else setLoadError(errorMessage(e))
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [sessionId, hydrate])

  // Scenario label and emoji for the header (cosmetic, so failures are ignored).
  useEffect(() => {
    if (!domainId) return
    let alive = true
    api
      .domains()
      .then((list) => alive && setDomain(list.find((d) => d.id === domainId) ?? null))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [domainId])

  // Read each finished counterpart reply aloud once, if enabled.
  useEffect(() => {
    if (!last || last.streaming || spokenRef.current === last.id) return
    spokenRef.current = last.id
    if (ttsOn && last.role === 'counterpart') speak(last.content)
  }, [last, ttsOn, speak])

  useEffect(() => {
    if (canType) inputRef.current?.focus()
  }, [canType])

  const submit = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text) return
      cancelSpeech()
      stopListening()
      setDraft('')
      const delivered = await send(text)
      if (!delivered) setDraft((prev) => prev || text) // put the message back so nothing is lost
    },
    [send, cancelSpeech, stopListening],
  )

  function onMic() {
    if (listening) {
      stopListening()
      return
    }
    startListening((text) => {
      if (autoSendRef.current) void submit(`${draftRef.current} ${text}`)
      else setDraft((prev) => (prev ? `${prev} ${text}` : text))
    })
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void submit(draft)
    }
  }

  async function endAndDebrief() {
    if (!sessionId || ending || busy) return
    cancelSpeech()
    stopListening()
    setEnding(true)
    setError(null)
    try {
      const res = await api.endSession(sessionId)
      setScorecard(res.scorecard)
      setPhase(res.status)
      navigate(`/debrief/${sessionId}`)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setEnding(false)
    }
  }

  // ---------- empty and loading states ----------
  if (!sessionId) {
    return (
      <section className="card text-center">
        {loading ? (
          <p className="text-sm text-stone-500">Restoring your session…</p>
        ) : (
          <>
            <h1 className="text-xl font-bold">No active negotiation</h1>
            {loadError && (
              <p role="alert" className="mt-2 text-sm text-red-600">
                ⚠️ {loadError}
              </p>
            )}
            <p className="mt-2 text-sm text-stone-500">Choose a scenario to start practising.</p>
            <Link to="/" className="btn btn-primary mt-4">
              Go to setup
            </Link>
          </>
        )}
      </section>
    )
  }

  const outcome =
    phase === 'deal'
      ? '🤝 A deal was reached. Get your debrief to see how you did.'
      : phase === 'walkaway'
        ? '🚪 The counterpart walked away. Get your debrief to see why.'
        : null

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">{domain ? `${domain.emoji} ${domain.label}` : 'Negotiation'}</h1>
          <p className="mt-0.5 line-clamp-2 text-sm text-stone-600 dark:text-stone-400">
            <span className="font-semibold">Your goal:</span> {goal}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {difficulty && (
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium dark:bg-stone-800">{difficulty}</span>
          )}
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium dark:bg-stone-800">
            {STATUS_LABEL[phase === 'idle' ? 'active' : phase]}
          </span>
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium dark:bg-stone-800">
            {moves} {moves === 1 ? 'move' : 'moves'}
          </span>
          <button type="button" className="btn btn-ghost" onClick={endAndDebrief} disabled={moves < 1 || busy || ending}>
            {ending ? 'Scoring…' : phase === 'active' ? 'End & debrief' : 'Get debrief'}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-3 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          <span className="flex-1">⚠️ {error}</span>
          <button type="button" className="font-semibold underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {outcome && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-debrief/40 bg-debrief/10 px-4 py-3 text-sm">
          <span className="flex-1">{outcome}</span>
          <button type="button" className="btn btn-primary" onClick={endAndDebrief} disabled={ending || moves < 1}>
            {ending ? 'Scoring…' : 'Get debrief'}
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <section className="card" aria-label="Negotiation chat">
          <ChatWindow messages={messages} busy={busy} />

          <form
            className="mt-3"
            onSubmit={(e) => {
              e.preventDefault()
              void submit(draft)
            }}
          >
            <label htmlFor="move" className="sr-only">
              Your next move
            </label>
            <textarea
              id="move"
              ref={inputRef}
              rows={2}
              maxLength={MAX_MESSAGE}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={!canType}
              placeholder={
                phase === 'active' ? 'Make your move… (Enter to send, Shift+Enter for a new line)' : 'This negotiation has ended.'
              }
              className="input resize-none"
            />
            {listening && (
              <p className="mt-1 text-xs text-coach" aria-live="polite">
                🎤 Listening… {interim}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button type="submit" className="btn btn-primary" disabled={!canType || !draft.trim()}>
                {busy ? 'Waiting…' : 'Send'}
              </button>
              <VoiceControls
                recognitionSupported={recognitionSupported}
                synthesisSupported={synthesisSupported}
                listening={listening}
                error={voiceError}
                ttsOn={ttsOn}
                autoSend={autoSend}
                disabled={!canType}
                onMic={onMic}
                onToggleTts={() => {
                  const next = !ttsOn
                  setTtsOn(next)
                  writeFlag('dojo_tts', next)
                  if (!next) cancelSpeech()
                }}
                onToggleAutoSend={() => {
                  const next = !autoSend
                  setAutoSend(next)
                  writeFlag('dojo_autosend', next)
                }}
              />
              <span className="ml-auto text-xs text-stone-500">
                {draft.length}/{MAX_MESSAGE}
              </span>
            </div>
          </form>
        </section>

        <CoachPanel
          tips={tips}
          pending={pendingCoach}
          canUse={canType}
          onUseLine={(text) => {
            setDraft(text)
            inputRef.current?.focus()
          }}
        />
      </div>
    </div>
  )
}