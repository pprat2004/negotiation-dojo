import { apiFetch } from './client'
import type { StreamEvent } from './types'

export interface SSEMessage {
  event: string
  data: string
}

function parseBlock(block: string): SSEMessage | null {
  let event = 'message'
  const data: string[] = []
  for (const line of block.split('\n')) {
    if (!line || line.startsWith(':')) continue // blank line or comment
    const i = line.indexOf(':')
    const field = i === -1 ? line : line.slice(0, i)
    let value = i === -1 ? '' : line.slice(i + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    if (field === 'event') event = value
    else if (field === 'data') data.push(value)
  }
  return data.length ? { event, data: data.join('\n') } : null
}

/** Incremental Server-Sent-Events parser. Feed it text chunks as they arrive. */
export class SSEParser {
  private buf = ''

  feed(chunk: string): SSEMessage[] {
    // Normalise on the whole buffer so a "\r" at the end of one chunk and "\n" at the start of the next still pair up.
    this.buf = (this.buf + chunk).replace(/\r\n/g, '\n')
    const out: SSEMessage[] = []
    let i: number
    while ((i = this.buf.indexOf('\n\n')) !== -1) {
      const msg = parseBlock(this.buf.slice(0, i))
      this.buf = this.buf.slice(i + 2)
      if (msg) out.push(msg)
    }
    return out
  }
}

const KNOWN = new Set(['counterpart_token', 'counterpart_done', 'coach', 'error'])

function toStreamEvent(m: SSEMessage): StreamEvent | null {
  if (!KNOWN.has(m.event)) return null
  try {
    return { type: m.event, data: JSON.parse(m.data) } as StreamEvent
  } catch {
    return null
  }
}

/**
 * POST a user message and call `onEvent` for every streamed event.
 * We use fetch + a stream reader instead of EventSource because EventSource cannot POST.
 * Resolves when the stream ends; rejects with ApiError on HTTP errors (404, 409, 422, 429...).
 */
export async function streamMessage(
  sessionId: string,
  content: string,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await apiFetch(`/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    signal,
  })
  if (!res.body) throw new Error('Streaming is not supported by this browser.')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  const parser = new SSEParser()
  const dispatch = (messages: SSEMessage[]) => {
    for (const m of messages) {
      const ev = toStreamEvent(m)
      if (ev) onEvent(ev)
    }
  }
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    dispatch(parser.feed(decoder.decode(value, { stream: true })))
  }
  dispatch(parser.feed(decoder.decode()))
}