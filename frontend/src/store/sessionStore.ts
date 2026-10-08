import { create } from 'zustand'
import type { CoachFeedback, Difficulty, Scorecard, SessionDetail, TurnStatus } from '../api/types'

export type Phase = 'idle' | 'active' | 'deal' | 'walkaway' | 'ended'

export interface ChatMessage {
  id: string
  role: 'user' | 'counterpart'
  content: string
  streaming?: boolean
}

/** Coach feedback for one user move ("round"). `error` is set if the coach failed that round. */
export interface CoachTip {
  id: string
  round: number
  feedback?: CoachFeedback
  error?: string
}

interface StartInfo {
  sessionId: string
  opening: string
  domainId: string
  difficulty: Difficulty
  goal: string
}

interface SessionState {
  sessionId: string | null
  domainId: string | null
  difficulty: Difficulty | null
  goal: string
  phase: Phase
  messages: ChatMessage[]
  tips: CoachTip[]
  busy: boolean // a turn (counterpart + coach) is in flight
  error: string | null
  scorecard: Scorecard | null

  startSession: (info: StartInfo) => void
  hydrate: (detail: SessionDetail) => void
  addUserMessage: (content: string) => { id: string; round: number }
  beginCounterpart: () => string
  appendToken: (id: string, text: string) => void
  finishCounterpart: (id: string, text: string, status: TurnStatus) => void
  rollbackTurn: (turn: { userId: string; cpId: string; round: number }) => void
  addCoachTip: (round: number, feedback: CoachFeedback) => void
  addCoachError: (round: number, error: string) => void
  setBusy: (busy: boolean) => void
  setError: (error: string | null) => void
  setScorecard: (scorecard: Scorecard | null) => void
  setPhase: (phase: Phase) => void
  reset: () => void
}

let counter = 0
const nextId = (prefix: string) => `${prefix}-${++counter}`

const initial = {
  sessionId: null,
  domainId: null,
  difficulty: null,
  goal: '',
  phase: 'idle' as Phase,
  messages: [] as ChatMessage[],
  tips: [] as CoachTip[],
  busy: false,
  error: null,
  scorecard: null,
}

export const useSessionStore = create<SessionState>()((set, get) => ({
  ...initial,

  startSession: ({ sessionId, opening, domainId, difficulty, goal }) =>
    set({
      ...initial,
      sessionId,
      domainId,
      difficulty,
      goal,
      phase: 'active',
      messages: [{ id: nextId('c'), role: 'counterpart', content: opening }],
    }),

    hydrate: (d) => {
    const userIds = d.messages.filter((m) => m.role === 'user').map((m) => m.id)
    const tips: CoachTip[] = d.coach_notes.flatMap((n) => {
      const idx = userIds.indexOf(n.message_id)
      if (idx === -1) return []
      return [
        {
          id: `t-srv-${n.id}`,
          round: idx + 1,
          feedback: {
            rating: n.rating,
            issue: n.issue,
            better_phrasing: n.better_phrasing,
            unused_leverage: n.unused_leverage,
            tactic_detected: n.tactic_detected,
          },
        },
      ]
    })
    set({
      ...initial,
      sessionId: d.id,
      domainId: d.domain,
      difficulty: d.difficulty,
      goal: d.goal,
      phase: d.status,
      messages: d.messages.map((m) => ({ id: `srv-${m.id}`, role: m.role, content: m.content })),
      tips,
      scorecard: d.scorecard,
    })
  },

  addUserMessage: (content) => {
    const id = nextId('u')
    const round = get().messages.filter((m) => m.role === 'user').length + 1
    set((s) => ({ messages: [...s.messages, { id, role: 'user', content }] }))
    return { id, round }
  },

  beginCounterpart: () => {
    const id = nextId('c')
    set((s) => ({ messages: [...s.messages, { id, role: 'counterpart', content: '', streaming: true }] }))
    return id
  },

  appendToken: (id, text) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, content: m.content + text } : m)) })),

  // The final text from `counterpart_done` is the checked, canonical version: it replaces whatever streamed in.
  finishCounterpart: (id, text, status) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, content: text, streaming: false } : m)),
      phase: status === 'continue' ? s.phase : status,
    })),

  // Mirrors the backend, which deletes the user's message and coach note when a turn fails.
  rollbackTurn: ({ userId, cpId, round }) =>
    set((s) => ({
      messages: s.messages.filter((m) => m.id !== userId && m.id !== cpId),
      tips: s.tips.filter((t) => t.round !== round),
    })),

  addCoachTip: (round, feedback) =>
    set((s) => ({ tips: [...s.tips, { id: nextId('t'), round, feedback }] })),

  addCoachError: (round, error) =>
    set((s) => ({ tips: [...s.tips, { id: nextId('t'), round, error }] })),

  setBusy: (busy) => set({ busy }),
  setError: (error) => set({ error }),
  setScorecard: (scorecard) => set({ scorecard }),
  setPhase: (phase) => set({ phase }),
  reset: () => set({ ...initial }),
}))