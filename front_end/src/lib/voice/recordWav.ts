/**
 * Microphone capture as 16 kHz, mono, 16-bit PCM WAV for transcription. Chrome's own speech
 * recognizer listens alongside (when present) for live words and as a fallback transcript.
 */

export const WAV_SAMPLE_RATE = 16000

export type WavRecording = {
  /** Stops the mic; resolves the WAV and the browser recognizer's transcript ('' if none). */
  stop: () => Promise<{ wav: Blob; fallback: string }>
  cancel: () => void
}

type BrowserRecognizer = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type RecognizerWindow = Window & {
  SpeechRecognition?: new () => BrowserRecognizer
  webkitSpeechRecognition?: new () => BrowserRecognizer
}

/** Float samples at any rate → 16-bit PCM WAV at `rate`, linear resample. */
export function encodeWav(chunks: readonly Float32Array[], fromRate: number, rate = WAV_SAMPLE_RATE): Blob {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const input = new Float32Array(total)
  let at = 0
  for (const chunk of chunks) {
    input.set(chunk, at)
    at += chunk.length
  }
  const ratio = fromRate / rate
  const length = Math.floor(total / ratio)
  const view = new DataView(new ArrayBuffer(44 + length * 2))
  const text = (offset: number, value: string) => [...value].forEach((ch, i) => view.setUint8(offset + i, ch.charCodeAt(0)))
  text(0, 'RIFF')
  view.setUint32(4, 36 + length * 2, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, length * 2, true)
  for (let i = 0; i < length; i += 1) {
    const from = Math.floor(i * ratio)
    const to = Math.max(from + 1, Math.floor((i + 1) * ratio))
    let sum = 0
    for (let j = from; j < to; j += 1) sum += input[j] ?? 0
    const sample = Math.max(-1, Math.min(1, sum / (to - from)))
    view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
  }
  return new Blob([view.buffer], { type: 'audio/wav' })
}

function startRecognizer(onInterim?: (text: string) => void): { done: () => Promise<string>; abort: () => void } {
  const win = window as RecognizerWindow
  const Recognizer = win.SpeechRecognition ?? win.webkitSpeechRecognition
  if (!Recognizer) return { done: async () => '', abort: () => {} }
  const recognizer = new Recognizer()
  recognizer.lang = 'en-US'
  recognizer.continuous = true
  recognizer.interimResults = true
  let heard = ''
  let finish: (text: string) => void = () => {}
  const ended = new Promise<string>((resolve) => (finish = resolve))
  recognizer.onresult = (event) => {
    heard = Array.from(event.results, (result) => result[0]?.transcript ?? '').join(' ').replace(/\s+/g, ' ').trim()
    onInterim?.(heard)
  }
  recognizer.onend = () => finish(heard)
  recognizer.onerror = () => finish(heard)
  try {
    recognizer.start()
  } catch {
    finish('')
  }
  return {
    done: () => {
      recognizer.stop()
      return Promise.race([ended, new Promise<string>((resolve) => window.setTimeout(() => resolve(heard), 1500))])
    },
    abort: () => recognizer.abort(),
  }
}

/** `onInterim` gets the live words as they are heard (Chrome's recognizer). */
export async function startWavRecording(onInterim?: (text: string) => void): Promise<WavRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
  const context = new AudioContext()
  if (context.state === 'suspended') await context.resume()
  const source = context.createMediaStreamSource(stream)
  const processor = context.createScriptProcessor(4096, 1, 1)
  const chunks: Float32Array[] = []
  processor.onaudioprocess = (event) => chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)))
  source.connect(processor)
  processor.connect(context.destination)
  const recognizer = startRecognizer(onInterim)
  const close = () => {
    processor.disconnect()
    source.disconnect()
    stream.getTracks().forEach((track) => track.stop())
    void context.close()
  }
  return {
    async stop() {
      close()
      const fallback = await recognizer.done()
      return { wav: encodeWav(chunks, context.sampleRate), fallback }
    },
    cancel() {
      close()
      recognizer.abort()
    },
  }
}
