import { describe, expect, it } from 'vitest'
import type { CoachTip } from '../store/sessionStore'
import { orderTips, ratingTone, stripQuotes } from './coach'

describe('coach helpers', () => {
  it('maps ratings to tones', () => {
    expect(ratingTone(9)).toBe('good')
    expect(ratingTone(5)).toBe('ok')
    expect(ratingTone(2)).toBe('low')
  })

  it('orders tips newest first without mutating', () => {
    const tips: CoachTip[] = [
      { id: 'a', round: 1 },
      { id: 'b', round: 3 },
      { id: 'c', round: 2 },
    ]
    expect(orderTips(tips).map((t) => t.round)).toEqual([3, 2, 1])
    expect(tips.map((t) => t.round)).toEqual([1, 3, 2])
  })

  it('strips wrapping quotes only', () => {
    expect(stripQuotes('"I can commit today."')).toBe('I can commit today.')
    expect(stripQuotes('“Fine,” she said.')).toBe('Fine,” she said.')
  })
})