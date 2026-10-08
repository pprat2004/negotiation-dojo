interface Props {
  recognitionSupported: boolean
  synthesisSupported: boolean
  listening: boolean
  error: string | null
  ttsOn: boolean
  autoSend: boolean
  disabled: boolean
  onMic: () => void
  onToggleTts: () => void
  onToggleAutoSend: () => void
}

export default function VoiceControls(p: Props) {
  if (!p.recognitionSupported && !p.synthesisSupported) {
    return <span className="text-xs text-stone-500">Voice isn't supported in this browser. Try Chrome or Edge.</span>
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {p.recognitionSupported ? (
        <>
          <button
            type="button"
            onClick={p.onMic}
            disabled={p.disabled && !p.listening}
            aria-pressed={p.listening}
            className={`btn btn-ghost ${p.listening ? 'border-red-400 text-red-600' : ''}`}
          >
            {p.listening ? '⏹ Stop' : '🎤 Speak'}
          </button>
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={p.autoSend} onChange={p.onToggleAutoSend} />
            Send when I stop talking
          </label>
        </>
      ) : (
        <span className="text-xs text-stone-500">Voice input isn't supported in this browser.</span>
      )}
      {p.synthesisSupported && (
        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" checked={p.ttsOn} onChange={p.onToggleTts} />
          Read replies aloud
        </label>
      )}
      {p.recognitionSupported && p.ttsOn && (
        <span className="text-[11px] text-stone-500">Tip: use headphones so the mic doesn't hear the replies.</span>
      )}
      {p.error && (
        <span role="alert" className="w-full text-xs text-red-600">
          {p.error}
        </span>
      )}
    </div>
  )
}