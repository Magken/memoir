/**
 * liveTranscribeApi — Edge `live-transcribe` + browser WebRTC for gpt-live-transcribe.
 *
 * Edge mints an ephemeral Realtime client secret; the browser streams mic audio
 * to OpenAI and receives transcript deltas into any text field.
 */
import { getSupabase, getSupabasePublicKey, getSupabaseUrl, DataApiError } from '../dataApi'

export type LiveTranscribeDelay = 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'

/** Dev server mint (`/api/realtime-secret`): no Supabase login, key stays on the server. */
export async function createDevLiveTranscribeSession(): Promise<LiveTranscribeSession> {
  const res = await fetch('/api/realtime-secret', { method: 'POST' })
  const body = (await res.json().catch(() => ({}))) as { clientSecret?: string; expiresAt?: number | null; model?: string; error?: string }
  if (!res.ok || !body.clientSecret) throw new Error(body.error ?? `live_transcribe_${res.status}`)
  return { clientSecret: body.clientSecret, expiresAt: body.expiresAt ?? null, model: body.model ?? 'gpt-live-transcribe', sessionId: null }
}

export type LiveTranscribeSessionOptions = {
  /** Replaces the Edge mint (e.g. `createDevLiveTranscribeSession`). */
  mint?: () => Promise<LiveTranscribeSession>
  languages?: string[]
  prompt?: string
  keywords?: string[]
  delay?: LiveTranscribeDelay
  expiresInSeconds?: number
}

export type LiveTranscribeSession = {
  clientSecret: string
  expiresAt: number | null
  model: string
  sessionId: string | null
}

export type LiveTranscribeStatus = 'connecting' | 'listening' | 'stopped'

export type LiveTranscribeHandlers = {
  /** Incremental text for the current speech turn (replaces prior partial). */
  onPartial?: (text: string) => void
  /** Finalized turn text after `input_audio_buffer.commit`. */
  onFinal?: (text: string) => void
  onStatus?: (status: LiveTranscribeStatus) => void
  onError?: (err: unknown) => void
  /** Every server event type, for diagnostics. */
  onEvent?: (type: string) => void
  /**
   * Live mic voice energy (0–1) each animation frame — drive wave chrome.
   */
  onEnergy?: (energy: number) => void
}

export type LiveTranscribeHandle = {
  stop: () => void
  /** Finalize the current audio turn (sends `input_audio_buffer.commit`). */
  commit: () => void
}

type EdgeEnvelope = {
  data?: {
    clientSecret?: string
    expiresAt?: number | null
    model?: string
    sessionId?: string | null
  } | null
  meta?: Record<string, unknown> | null
  error?: { code?: string; detail?: string } | string | null
}

/**
 * Mint an ephemeral Realtime client secret (JWT → Edge → OpenAI).
 */
export async function createLiveTranscribeSession(
  options: LiveTranscribeSessionOptions = {},
): Promise<LiveTranscribeSession> {
  const supabase = getSupabase()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new DataApiError('not_authenticated', 'not_authenticated')
  }

  const base = getSupabaseUrl()
  const anon = getSupabasePublicKey()
  if (!base || !anon) {
    throw new DataApiError('unknown', 'missing_supabase_env')
  }

  const res = await fetch(`${base}/functions/v1/live-transcribe`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anon,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      languages: options.languages,
      prompt: options.prompt,
      keywords: options.keywords,
      delay: options.delay,
      expiresInSeconds: options.expiresInSeconds,
    }),
  })

  const body = (await res.json().catch(() => ({}))) as EdgeEnvelope
  if (!res.ok || body.error) throwEdgeError(body, res.status)

  const data = body.data
  if (!data?.clientSecret || typeof data.clientSecret !== 'string') {
    throw new DataApiError('unknown', 'live_transcribe_empty')
  }

  return {
    clientSecret: data.clientSecret,
    expiresAt: typeof data.expiresAt === 'number' ? data.expiresAt : null,
    model: typeof data.model === 'string' ? data.model : 'gpt-live-transcribe',
    sessionId: typeof data.sessionId === 'string' ? data.sessionId : null,
  }
}

/**
 * Start mic → WebRTC → gpt-live-transcribe. Call `handle.stop()` to end.
 */
export async function startLiveTranscription(
  handlers: LiveTranscribeHandlers & LiveTranscribeSessionOptions = {},
): Promise<LiveTranscribeHandle> {
  handlers.onStatus?.('connecting')

  let pc: RTCPeerConnection | null = null
  let media: MediaStream | null = null
  let dc: RTCDataChannel | null = null
  let audioCtx: AudioContext | null = null
  let levelsRaf = 0
  let stopped = false

  const commit = () => {
    if (stopped) return
    if (!dc || dc.readyState !== 'open') return
    try {
      dc.send(JSON.stringify({ type: 'input_audio_buffer.commit' }))
    } catch {
      /* ignore */
    }
  }

  const stopLevels = () => {
    if (levelsRaf) {
      window.cancelAnimationFrame(levelsRaf)
      levelsRaf = 0
    }
    if (audioCtx) {
      const ctx = audioCtx
      audioCtx = null
      void ctx.close().catch(() => undefined)
    }
  }

  /** Release the microphone immediately (browser indicator / capture). */
  const haltMic = () => {
    stopLevels()
    try {
      pc?.getSenders().forEach((s) => {
        try {
          if (s.track) {
            s.track.enabled = false
            s.track.stop()
          }
        } catch {
          /* ignore */
        }
        try {
          pc?.removeTrack(s)
        } catch {
          /* ignore */
        }
      })
    } catch {
      /* ignore */
    }
    if (media) {
      media.getTracks().forEach((t) => {
        try {
          t.enabled = false
          t.stop()
        } catch {
          /* ignore */
        }
      })
    }
  }

  const closePeer = () => {
    try {
      dc?.close()
    } catch {
      /* ignore */
    }
    try {
      pc?.close()
    } catch {
      /* ignore */
    }
    pc = null
    media = null
    dc = null
  }

  const teardown = () => {
    stopped = true
    haltMic()
    closePeer()
    handlers.onStatus?.('stopped')
  }

  const stop = () => {
    // Always hard-halt capture — stop may race ahead of getUserMedia.
    stopped = true
    try {
      if (dc?.readyState === 'open') {
        dc.send(JSON.stringify({ type: 'input_audio_buffer.commit' }))
      }
    } catch {
      /* ignore */
    }
    haltMic()
    // Close OpenAI realtime peer immediately — do not leave the session open
    // billing tokens after the user turns dictation off.
    closePeer()
    handlers.onStatus?.('stopped')
  }

  try {
    const session = handlers.mint ? await handlers.mint() : await createLiveTranscribeSession({
      languages: handlers.languages,
      prompt: handlers.prompt,
      keywords: handlers.keywords,
      delay: handlers.delay,
      expiresInSeconds: handlers.expiresInSeconds,
    })
    if (stopped) {
      teardown()
      return { stop, commit }
    }

    try {
      media = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    } catch (micErr) {
      const name = micErr instanceof DOMException ? micErr.name : ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        throw new DataApiError('mic_permission_denied', 'mic_permission_denied')
      }
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        throw new DataApiError('mic_unavailable', 'mic_unavailable')
      }
      throw new DataApiError('mic_unavailable', 'mic_unavailable')
    }

    if (stopped) {
      teardown()
      return { stop, commit }
    }

    pc = new RTCPeerConnection()
    const audioTrack = media.getAudioTracks()[0]
    if (!audioTrack) {
      throw new DataApiError('mic_unavailable', 'mic_unavailable')
    }
    // Hold capture silent until WebRTC is up — speaking during connect isn't transcribed.
    audioTrack.enabled = false
    pc.addTrack(audioTrack, media)

    if (handlers.onEnergy) {
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (Ctx) {
          audioCtx = new Ctx()
          const source = audioCtx.createMediaStreamSource(media)
          const analyser = audioCtx.createAnalyser()
          analyser.fftSize = 512
          analyser.smoothingTimeConstant = 0.22
          source.connect(analyser)
          const freq = new Uint8Array(analyser.frequencyBinCount)
          const time = new Uint8Array(analyser.fftSize)
          let smoothed = 0
          const tick = () => {
            if (stopped || !audioCtx) return
            analyser.getByteFrequencyData(freq)
            analyser.getByteTimeDomainData(time)
            const raw = sampleVoiceEnergy(freq, time)
            // Noise floor — ambient hush should not keep the wave "on".
            const gated = raw < 0.055 ? 0 : raw
            smoothed += (gated - smoothed) * (gated > smoothed ? 0.5 : 0.22)
            if (smoothed < 0.02) smoothed = 0
            handlers.onEnergy?.(smoothed)
            levelsRaf = window.requestAnimationFrame(tick)
          }
          if (audioCtx.state === 'suspended') {
            void audioCtx.resume().catch(() => undefined)
          }
          levelsRaf = window.requestAnimationFrame(tick)
        }
      } catch {
        /* wave optional — transcription still works */
      }
    }

    const turnState = { itemId: null as string | null, partial: '' }

    dc = pc.createDataChannel('oai-events')
    dc.addEventListener('message', (event) => {
      if (stopped) return
      handleServerEvent(event.data, handlers, turnState)
    })

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    if (stopped) {
      teardown()
      return { stop, commit }
    }
    if (!offer.sdp) {
      throw new DataApiError('live_transcribe_webrtc_failed', 'live_transcribe_webrtc_failed')
    }

    const sdpRes = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${session.clientSecret}`,
        'Content-Type': 'application/sdp',
      },
    })

    const answerSdp = await sdpRes.text()
    if (stopped) {
      teardown()
      return { stop, commit }
    }
    if (!sdpRes.ok) {
      let detail = answerSdp.slice(0, 240)
      try {
        const parsed = JSON.parse(answerSdp) as { error?: { message?: string } }
        if (parsed.error?.message) detail = parsed.error.message
      } catch {
        /* keep text */
      }
      throw new DataApiError('live_transcribe_webrtc_failed', 'live_transcribe_webrtc_failed', detail)
    }

    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
    if (stopped) {
      teardown()
      return { stop, commit }
    }
    audioTrack.enabled = true
    handlers.onStatus?.('listening')
  } catch (err) {
    if (!stopped) {
      teardown()
    } else {
      haltMic()
      closePeer()
    }
    handlers.onError?.(err)
    throw err
  }

  return { stop, commit }
}

type TurnState = { itemId: string | null; partial: string }

function sampleVoiceEnergy(freq: Uint8Array, time: Uint8Array): number {
  let sumSq = 0
  for (let i = 0; i < time.length; i++) {
    const centered = ((time[i] ?? 128) - 128) / 128
    sumSq += centered * centered
  }
  const rms = Math.sqrt(sumSq / Math.max(1, time.length))
  const voice = Math.min(1, Math.pow(rms * 9.2, 0.78))

  const start = Math.max(1, Math.floor(freq.length * 0.02))
  const end = Math.max(start + 4, Math.floor(freq.length * 0.35))
  let peak = 0
  for (let i = start; i < end; i++) {
    peak = Math.max(peak, (freq[i] ?? 0) / 255)
  }
  const spectral = Math.min(1, Math.pow(peak, 0.55) * 1.55)
  return Math.min(1, voice * 0.78 + spectral * 0.32)
}

function handleServerEvent(
  raw: unknown,
  handlers: LiveTranscribeHandlers,
  turnState: TurnState,
) {
  let payload: Record<string, unknown>
  try {
    const text = typeof raw === 'string' ? raw : String(raw)
    payload = JSON.parse(text) as Record<string, unknown>
  } catch {
    return
  }

  const type = typeof payload.type === 'string' ? payload.type : ''
  handlers.onEvent?.(type)
  const itemId = typeof payload.item_id === 'string' ? payload.item_id : null

  if (
    type === 'conversation.item.input_audio_transcription.delta' ||
    type === 'input_audio_transcription.delta'
  ) {
    const delta = typeof payload.delta === 'string' ? payload.delta : ''
    if (!delta) return
    if (itemId && itemId !== turnState.itemId) {
      turnState.itemId = itemId
      turnState.partial = ''
    }
    turnState.partial += delta
    handlers.onPartial?.(turnState.partial)
    return
  }

  if (
    type === 'conversation.item.input_audio_transcription.completed' ||
    type === 'input_audio_transcription.completed'
  ) {
    const transcript =
      typeof payload.transcript === 'string'
        ? payload.transcript
        : typeof payload.text === 'string'
          ? payload.text
          : turnState.partial
    turnState.itemId = null
    turnState.partial = ''
    if (transcript.trim()) handlers.onFinal?.(transcript.trim())
    return
  }

  if (type === 'error' || type === 'conversation.item.input_audio_transcription.failed') {
    const errorObj = payload.error
    const message =
      errorObj && typeof errorObj === 'object' && typeof (errorObj as { message?: unknown }).message === 'string'
        ? (errorObj as { message: string }).message
        : 'Live transcription failed'
    handlers.onError?.(new DataApiError('live_transcribe_failed', 'live_transcribe_failed', message))
  }
}

function throwEdgeError(body: EdgeEnvelope, status: number): never {
  const raw = body.error
  if (raw && typeof raw === 'object' && typeof raw.code === 'string') {
    const detail =
      typeof raw.detail === 'string' && raw.detail.trim() ? raw.detail.trim() : undefined
    throw new DataApiError(raw.code as never, raw.code, detail)
  }
  if (typeof raw === 'string' && raw) {
    throw new DataApiError(raw as never, raw)
  }
  throw new DataApiError('unknown', `live_transcribe_${status}`)
}
