import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../store/sessionStore'
import MessageBubble from './MessageBubble'

export default function ChatWindow({ messages, busy }: { messages: ChatMessage[]; busy: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const stick = useRef(true) // only auto-scroll while the user is near the bottom

  useEffect(() => {
    const el = ref.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [messages])

  return (
    <div
      ref={ref}
      role="log"
      aria-live="polite"
      aria-busy={busy}
      aria-label="Negotiation transcript"
      tabIndex={0}
      onScroll={(e) => {
        const el = e.currentTarget
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
      }}
      className="flex h-[55vh] min-h-[300px] flex-col gap-3 overflow-y-auto rounded-xl bg-stone-50 p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 dark:bg-stone-950"
    >
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
    </div>
  )
}