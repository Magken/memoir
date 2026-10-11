export type LiveWsHandlers = {
  onPartial: (text: string) => void
  onFinal: (text: string) => void
  onNote: (note: string) => void
}

export type LiveWsHandle = { stop: () => void; commit: () => void }

const RATE = 24000

function toBase64Pcm16(samples: Float32Array, fromRate: number): { b64: string; ms: number; rms: number } {
  const ratio = fromRate / RATE
  const length = Math.floor(samples.length / ratio)
  const pcm = new Int16Array(length)
  let sum = 0
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, samples[Math.floor(i * ratio)] ?? 0))
    sum += s * s
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  const bytes = new Uint8Array(pcm.buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return { b64: btoa(binary), ms: (length / RATE) * 1000, rms: Math.sqrt(sum / Math.max(1, length)) }
}

/** Streams raw mic PCM to OpenAI Realtime over a WebSocket with an ephemeral key from the dev route. */
export async function startLiveWs(handlers: LiveWsHandlers): Promise<LiveWsHandle> {
  const response = await fetch('/api/realtime-secret', { method: 'POST' })
  const secret = (await response.json()) as { clientSecret?: string; error?: string }
  if (!response.ok || !secret.clientSecret) throw new Error(secret.error || `mint ${response.status}`)

  const media = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  })
  const track = media.getAudioTracks()[0]
  handlers.onNote(`Mic: ${track?.label || 'unknown'}${track?.muted ? ' (MUTED by system)' : ''}`)

  const ws = new WebSocket('wss://api.openai.com/v1/realtime', [
    'realtime',
    `openai-insecure-api-key.${secret.clientSecret}`,
  ])
  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve()
    ws.onerror = () => reject(new Error('websocket failed'))
  })

  const context = new AudioContext()
  await context.resume()
  const source = context.createMediaStreamSource(media)
  const processor = context.createScriptProcessor(4096, 1, 1)
  const mute = context.createGain()
  mute.gain.value = 0
  source.connect(processor)
  processor.connect(mute)
  mute.connect(context.destination)

  let sentMs = 0
  let peak = 0
  let stopped = false
  const partial = new Map<string, string>()

  processor.onaudioprocess = (event) => {
    if (stopped || ws.readyState !== WebSocket.OPEN) return
    const chunk = toBase64Pcm16(event.inputBuffer.getChannelData(0), context.sampleRate)
    sentMs += chunk.ms
    if (chunk.rms > peak + 0.01) {
      peak = chunk.rms
      handlers.onNote(`Mic level ${peak.toFixed(3)} — sending audio`)
    }
    ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: chunk.b64 }))
  }

  ws.onmessage = (message) => {
    const event = JSON.parse(String(message.data)) as { type?: string; item_id?: string; delta?: string; transcript?: string; error?: { message?: string } }
    const id = event.item_id ?? 'live'
    if (event.type === 'conversation.item.input_audio_transcription.delta') {
      const text = (partial.get(id) ?? '') + (event.delta ?? '')
      partial.set(id, text)
      handlers.onPartial(text)
    } else if (event.type === 'conversation.item.input_audio_transcription.completed') {
      const text = (event.transcript ?? partial.get(id) ?? '').trim()
      if (text) handlers.onFinal(text)
    } else if (event.type === 'input_audio_buffer.speech_started') {
      handlers.onNote('Hearing speech…')
    } else if (event.type === 'error') {
      handlers.onNote(`Live error: ${event.error?.message ?? 'unknown'}`)
    }
  }

  const stop = () => {
    stopped = true
    processor.disconnect()
    source.disconnect()
    void context.close()
    media.getTracks().forEach((t) => t.stop())
    ws.close()
  }

  return {
    stop,
    commit: () => {
      if (sentMs >= 200 && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }))
      if (peak < 0.005) handlers.onNote(`No sound from the mic (peak ${peak.toFixed(4)}) — pick another mic in site settings`)
    },
  }
}
