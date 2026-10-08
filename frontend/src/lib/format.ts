import type { SessionStatus } from '../api/types'

/** The backend stores UTC but SQLite returns timestamps without a timezone suffix, so add "Z". */
export function parseServerDate(iso: string): Date {
  return new Date(/([zZ]|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`)
}

export function formatDateTime(iso: string): string {
  return parseServerDate(iso).toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export const STATUS_LABEL: Record<SessionStatus, string> = {
  active: 'In progress',
  deal: 'Deal reached',
  walkaway: 'Walked away',
  ended: 'Ended early',
}

export function scoreTone(score: number): 'good' | 'ok' | 'low' {
  return score >= 75 ? 'good' : score >= 45 ? 'ok' : 'low'
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong. Please try again.'
}