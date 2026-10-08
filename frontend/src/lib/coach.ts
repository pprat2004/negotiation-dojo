import type { CoachTip } from '../store/sessionStore'

export type Tone = 'good' | 'ok' | 'low'

export function ratingTone(rating: number): Tone {
  return rating >= 8 ? 'good' : rating >= 5 ? 'ok' : 'low'
}

/** Newest round first. Does not mutate the input. */
export function orderTips(tips: CoachTip[]): CoachTip[] {
  return [...tips].sort((a, b) => b.round - a.round)
}

/** The coach often wraps its suggested line in quotes; strip them before putting it in the input box. */
export function stripQuotes(text: string): string {
  return text.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim()
}