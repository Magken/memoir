/**
 * Spoken output (text-to-speech) for scene descriptions, through the browser's
 * `speechSynthesis`. Sensory TSSV (hardware `voice` slot) listens; this speaks.
 */

export type SpeakOptions = {
  voice?: string
  lang?: string
  rate?: number
  pitch?: number
  volume?: number
  /** Character offset of each word as it is spoken; not every voice reports these. */
  onWord?: (charIndex: number) => void
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Voices load asynchronously in Chromium; resolves once the list is non-empty (or after 1.5 s). */
export function listVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!canSpeak()) return Promise.resolve([])
  const now = window.speechSynthesis.getVoices()
  if (now.length) return Promise.resolve(now)
  return new Promise((resolve) => {
    const done = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', done)
      resolve(window.speechSynthesis.getVoices())
    }
    window.speechSynthesis.addEventListener('voiceschanged', done)
    window.setTimeout(done, 1500)
  })
}

export function clampSpeech(value: number | undefined, min: number, max: number, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

/** Speaks `text`, replacing anything already speaking. Resolves when it finishes. */
export async function speak(text: string, options: SpeakOptions = {}): Promise<void> {
  const line = text.trim()
  if (!line) throw new Error('Nothing to say')
  if (!canSpeak()) throw new Error('Speech is not available in this browser')
  const voices = await listVoices()
  const utterance = new SpeechSynthesisUtterance(line)
  const voice = voices.find((item) => item.name === options.voice) ?? voices.find((item) => item.lang === (options.lang ?? 'en-US'))
  if (voice) utterance.voice = voice
  utterance.lang = options.lang ?? voice?.lang ?? 'en-US'
  utterance.rate = clampSpeech(options.rate, 0.5, 2, 1)
  utterance.pitch = clampSpeech(options.pitch, 0, 2, 1)
  utterance.volume = clampSpeech(options.volume, 0, 1, 1)
  window.speechSynthesis.cancel()
  return new Promise((resolve, reject) => {
    const onWord = options.onWord
    if (onWord) utterance.onboundary = (event) => event.name === 'word' && onWord(event.charIndex)
    utterance.onend = () => resolve()
    utterance.onerror = (event) => (event.error === 'interrupted' || event.error === 'canceled' ? resolve() : reject(new Error(event.error)))
    window.speechSynthesis.speak(utterance)
  })
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel()
}

export function isSpeaking(): boolean {
  return canSpeak() && window.speechSynthesis.speaking
}
