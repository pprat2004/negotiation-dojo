import { getUserId } from '../lib/userId'
import type {
  Domain, EndOut, Health, HistoryItem, SessionCreate, SessionDetail, SessionStarted, StatsOut,
} from './types'

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api').replace(/\/+$/, '')

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export const isAbort = (e: unknown): boolean => e instanceof DOMException && e.name === 'AbortError'

async function toApiError(res: Response): Promise<ApiError> {
  let detail = `Request failed (${res.status})`
  try {
    const body = await res.json()
    if (typeof body.detail === 'string') detail = body.detail
    else if (Array.isArray(body.detail)) detail = body.detail.map((d: { msg: string }) => d.msg).join('; ')
  } catch {
    /* keep the generic message */
  }
  return new ApiError(res.status, detail)
}

/** fetch + auth header + friendly errors. Used by the JSON helpers AND the SSE stream. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 'X-User-Id': getUserId(), ...(init.headers as Record<string, string> | undefined) },
    })
  } catch (e) {
    if (isAbort(e)) throw e
    throw new ApiError(0, 'Cannot reach the server. Is the backend running?')
  }
  if (!res.ok) throw await toApiError(res)
  return res
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  return (await apiFetch(path, init)).json() as Promise<T>
}

const post = (body?: unknown): RequestInit => ({
  method: 'POST',
  ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
})

export const api = {
  health: () => json<Health>('/health'),
  domains: () => json<Domain[]>('/domains'),
  createSession: (body: SessionCreate) => json<SessionStarted>('/sessions', post(body)),
  getSession: (id: string) => json<SessionDetail>(`/sessions/${id}`),
  endSession: (id: string) => json<EndOut>(`/sessions/${id}/end`, post()),
  history: (limit = 50) => json<HistoryItem[]>(`/history?limit=${limit}`),
  stats: () => json<StatsOut>('/history/stats'),
}