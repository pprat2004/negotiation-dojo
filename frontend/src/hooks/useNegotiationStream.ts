import { useCallback, useEffect, useRef } from 'react'
import { isAbort } from '../api/client'
import { streamMessage } from '../api/sse'
import { useSessionStore } from '../store/sessionStore'

/**
 * Sends one user move and wires the streamed events into the store.
 *   counterpart_token -> grow the streaming bubble
 *   counterpart_done  -> replace it with the final checked text (+ deal/walkaway status)
 *   coach             -> add a tip for this round
 * `send` resolves to true if the counterpart replied. On failure the turn is rolled back
 * (the backend discards it too) and the caller can put the text back in the input box.
 */
export function useNegotiationStream() {
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const send = useCallback(async (text: string): Promise<boolean> => {
    const initial = useSessionStore.getState()
    const content = text.trim()
    if (!content || initial.busy || initial.phase !== 'active' || !initial.sessionId) return false

    const sessionId = initial.sessionId
    const { id: userId, round } = initial.addUserMessage(content)
    const cpId = initial.beginCounterpart()
    initial.setBusy(true)
    initial.setError(null)

    const controller = new AbortController()
    abortRef.current = controller
    let delivered = false

    try {
      await streamMessage(
        sessionId,
        content,
        (ev) => {
          const s = useSessionStore.getState()
          switch (ev.type) {
            case 'counterpart_token':
              s.appendToken(cpId, ev.data.text)
              break
            case 'counterpart_done':
              delivered = true
              s.finishCounterpart(cpId, ev.data.text, ev.data.status)
              break
            case 'coach':
              s.addCoachTip(round, ev.data)
              break
            case 'error':
              if (ev.data.agent === 'coach') s.addCoachError(round, ev.data.message)
              else s.setError(ev.data.message)
              break
          }
        },
        controller.signal,
      )
    } catch (e) {
      if (!delivered && !isAbort(e)) {
        useSessionStore.getState().setError(e instanceof Error ? e.message : 'Something went wrong.')
      }
    } finally {
      const s = useSessionStore.getState()
      if (!delivered) s.rollbackTurn({ userId, cpId, round })
      s.setBusy(false)
      abortRef.current = null
    }
    return delivered
  }, [])

  const abort = useCallback(() => abortRef.current?.abort(), [])

  return { send, abort }
}