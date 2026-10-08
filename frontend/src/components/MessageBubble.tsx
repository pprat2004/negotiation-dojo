import type { ChatMessage } from '../store/sessionStore'

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1" aria-label="Counterpart is typing">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  )
}

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
          isUser
            ? 'rounded-br-md bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
            : 'rounded-bl-md border border-counterpart/30 bg-counterpart/10'
        }`}
      >
        <div
          className={`mb-0.5 text-[11px] font-bold uppercase tracking-wide ${
            isUser ? 'text-stone-300 dark:text-stone-600' : 'text-counterpart'
          }`}
        >
          {isUser ? 'You' : 'Counterpart'}
        </div>
        {message.content ? (
          <p className="whitespace-pre-wrap break-words">
            {message.content}
            {message.streaming && <span className="ml-0.5 animate-pulse">▍</span>}
          </p>
        ) : (
          <TypingDots />
        )}
      </div>
    </div>
  )
}