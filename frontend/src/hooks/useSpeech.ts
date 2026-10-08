import { useCallback, useEffect, useRef, useState } from 'react'

// The browser speech-recognition API is not in TypeScript's DOM types, so declare the small part we use.
interface RecognitionResult {
  readonly isFinal: boolean
  readonly 0: { readonly transcript: string }
}
interface RecognitionEvent {
  readonly resultIndex: number
  readonly results: { readonly length: number; readonly [index: number]: RecognitionResult }
}
interface RecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type RecognitionCtor = new () => RecognitionLike

function getCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone permission was denied. Allow it in your browser settings.',
  'service-not-allowed': 'Microphone permission was denied. Allow it in your browser settings.',
  'no-speech': "Didn't hear anything. Try again.",
  'audio-capture': 'No microphone found.',
  network: 'Speech recognition needs an internet connection.',
}

export function useSpeech() {
  const recognitionSupported = getCtor() !== null
  const synthesisSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const recRef = useRef<RecognitionLike | null>(null)

  const stopListening = useCallback(() => {
    recRef.current?.stop()
  }, [])

  const startListening = useCallback((onFinal: (text: string) => void) => {
    const Ctor = getCtor()
    if (!Ctor || recRef.current) return
    setVoiceError(null)
    setInterim('')

    const rec = new Ctor()
    rec.lang = 'en-IN'
    rec.continuous = false
    rec.interimResults = true
    rec.onresult = (e) => {
      let finalText = ''
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interimText += r[0].transcript
      }
      setInterim(interimText)
      if (finalText.trim()) onFinal(finalText.trim())
    }
    rec.onerror = (e) => {
      if (e.error === 'aborted') return
      setVoiceError(ERRORS[e.error] ?? 'Voice input failed. Please try again.')
    }
    rec.onend = () => {
      recRef.current = null
      setListening(false)
      setInterim('')
    }

    recRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      recRef.current = null
      setVoiceError('Could not start the microphone.')
    }
  }, [])

  const speak = useCallback(
    (text: string) => {
      if (!synthesisSupported || !text) return
      try {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'en-IN'
        window.speechSynthesis.speak(utterance)
      } catch {
        /* speech not available right now */
      }
    },
    [synthesisSupported],
  )

  const cancelSpeech = useCallback(() => {
    if (synthesisSupported) window.speechSynthesis.cancel()
  }, [synthesisSupported])

  useEffect(
    () => () => {
      recRef.current?.abort()
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    },
    [],
  )

  return {
    recognitionSupported, synthesisSupported, listening, interim, voiceError,
    startListening, stopListening, speak, cancelSpeech,
  }
}