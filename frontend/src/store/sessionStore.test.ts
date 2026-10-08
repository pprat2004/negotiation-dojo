import { beforeEach, describe, expect, it } from 'vitest'
import type { CoachFeedback, SessionDetail } from '../api/types'
import { useSessionStore } from './sessionStore'

const store = () => useSessionStore.getState()
const FB: CoachFeedback = {
  rating: 7, issue: 'none', better_phrasing: 'x', unused_leverage: 'y', tactic_detected: 'anchoring',
}

beforeEach(() => store().reset())

function begin() {
  store().startSession({ sessionId: 's1', opening: 'Welcome.', domainId: 'salary', difficulty: 'Medium', goal: 'g' })
}

describe('sessionStore', () => {

    const DETAIL: SessionDetail = {
    id: 's9', domain: 'rent', difficulty: 'Hard', goal: 'Keep rent', context: '',
    status: 'active', created_at: '2026-10-06T10:00:00',
    messages: [
      { id: 1, role: 'counterpart', content: 'Hi' },
      { id: 2, role: 'user', content: 'one' },
      { id: 3, role: 'counterpart', content: 'r1' },
      { id: 4, role: 'user', content: 'two' },
      { id: 5, role: 'counterpart', content: 'r2' },
    ],
    coach_notes: [
      { id: 1, message_id: 2, rating: 6, issue: 'i', better_phrasing: 'b', unused_leverage: 'u', tactic_detected: 't' },
      { id: 2, message_id: 4, rating: 8, issue: 'none', better_phrasing: 'b', unused_leverage: 'u', tactic_detected: '' },
    ],
    scorecard: null,
  }

  it('hydrate rebuilds messages and maps coach notes to rounds', () => {
    store().hydrate(DETAIL)
    expect(store().sessionId).toBe('s9')
    expect(store().messages).toHaveLength(5)
    expect(store().tips.map((t) => t.round)).toEqual([1, 2])
    expect(store().phase).toBe('active')
  })

  it('hydrate carries over finished states', () => {
    store().hydrate({ ...DETAIL, status: 'deal' })
    expect(store().phase).toBe('deal')
    store().hydrate({ ...DETAIL, status: 'ended' })
    expect(store().phase).toBe('ended')
  })

  it('startSession sets the opening message and goes active', () => {
    begin()
    expect(store().phase).toBe('active')
    expect(store().messages).toHaveLength(1)
    expect(store().messages[0]).toMatchObject({ role: 'counterpart', content: 'Welcome.' })
  })

  it('numbers rounds by user messages', () => {
    begin()
    expect(store().addUserMessage('one').round).toBe(1)
    expect(store().addUserMessage('two').round).toBe(2)
  })

  it('accumulates tokens and replaces them with the canonical text', () => {
    begin()
    const id = store().beginCounterpart()
    store().appendToken(id, 'Hel')
    store().appendToken(id, 'lo')
    expect(store().messages[store().messages.length - 1]).toMatchObject({ content: 'Hello', streaming: true })
    store().finishCounterpart(id, 'Hello there.', 'continue')
    expect(store().messages[store().messages.length - 1]).toMatchObject({ content: 'Hello there.', streaming: false })
    expect(store().phase).toBe('active')
  })

  it('a deal status ends the phase', () => {
    begin()
    const id = store().beginCounterpart()
    store().finishCounterpart(id, 'Deal.', 'deal')
    expect(store().phase).toBe('deal')
  })

  it('rollbackTurn removes the user message, partial reply and that round tip', () => {
    begin()
    const { id: userId, round } = store().addUserMessage('my move')
    const cpId = store().beginCounterpart()
    store().appendToken(cpId, 'partial')
    store().addCoachTip(round, FB)
    store().rollbackTurn({ userId, cpId, round })
    expect(store().messages).toHaveLength(1)
    expect(store().tips).toHaveLength(0)
  })

  it('records a coach failure as a tip without feedback', () => {
    begin()
    store().addCoachError(1, 'Coach unavailable')
    expect(store().tips[0]).toMatchObject({ round: 1, error: 'Coach unavailable' })
    expect(store().tips[0].feedback).toBeUndefined()
  })

  it('reset clears everything', () => {
    begin()
    store().addUserMessage('x')
    store().reset()
    expect(store().sessionId).toBeNull()
    expect(store().messages).toEqual([])
    expect(store().phase).toBe('idle')
  })
})