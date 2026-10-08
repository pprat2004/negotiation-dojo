import { describe, expect, it } from 'vitest'
import { SSEParser } from './sse'

describe('SSEParser', () => {
  it('parses a single event', () => {
    const p = new SSEParser()
    expect(p.feed('event: coach\ndata: {"a":1}\n\n')).toEqual([{ event: 'coach', data: '{"a":1}' }])
  })

  it('handles events split across chunks', () => {
    const p = new SSEParser()
    expect(p.feed('event: counterpart_tok')).toEqual([])
    expect(p.feed('en\ndata: {"text":"Hi"}\n')).toEqual([])
    expect(p.feed('\nevent: coach\ndata: {}\n\n')).toEqual([
      { event: 'counterpart_token', data: '{"text":"Hi"}' },
      { event: 'coach', data: '{}' },
    ])
  })

  it('joins multi-line data and defaults the event name', () => {
    const p = new SSEParser()
    expect(p.feed('data: a\ndata: b\n\n')).toEqual([{ event: 'message', data: 'a\nb' }])
  })

  it('normalises CRLF, even when split across chunks', () => {
    const p = new SSEParser()
    expect(p.feed('event: x\r\ndata: 1\r')).toEqual([])
    expect(p.feed('\n\r\n')).toEqual([{ event: 'x', data: '1' }])
  })

  it('ignores comments and blocks without data', () => {
    const p = new SSEParser()
    expect(p.feed(': keepalive\n\n')).toEqual([])
    expect(p.feed('event: lonely\n\n')).toEqual([])
  })

  it('keeps unicode and braces intact', () => {
    const p = new SSEParser()
    expect(p.feed('event: counterpart_token\ndata: {"text":"₹12 LPA"}\n\n')[0].data).toBe('{"text":"₹12 LPA"}')
  })
})