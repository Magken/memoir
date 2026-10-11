/**
 * Dev-only Vite route. The browser posts a WAV of the spoken question to /api/transcribe;
 * this process reads OPENAI_API_KEY from `.env` and returns OpenAI's transcript.
 */
import type { ServerResponse } from 'node:http'
import path from 'node:path'
import type { Connect, Plugin } from 'vite'
import { readOpenAiKey } from '../describe/describeDevPlugin.ts'

/** Tried in order; the first one the project can use answers. */
const TRANSCRIBE_MODELS = ['gpt-4o-mini-transcribe', 'gpt-4o-transcribe', 'whisper-1']
/** Realtime transcription models, tried in order when minting a live session. */
const LIVE_MODELS = ['gpt-live-transcribe', 'gpt-4o-transcribe', 'gpt-4o-mini-transcribe', 'whisper-1']
/** About 60 s of 16 kHz 16-bit mono audio. */
const MAX_WAV_BYTES = 2 * 1024 * 1024

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function readBytes(req: Connect.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_WAV_BYTES) reject(new Error('Recording is too long'))
      else chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export function transcribeDevPlugin(envFile = path.resolve(process.cwd(), '.env')): Plugin {
  return {
    name: 'transcribe-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/realtime-secret' && req.method === 'POST') {
          const key = readOpenAiKey(envFile)
          if (!key) return send(res, 500, { error: 'OPENAI_API_KEY is not set in front_end/.env' })
          let lastError = 'Could not start live transcription'
          for (const model of LIVE_MODELS) {
            const reply = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
              method: 'POST',
              headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                expires_after: { anchor: 'created_at', seconds: 600 },
                session: {
                  type: 'transcription',
                  audio: {
                    input: {
                      transcription: { model, language: 'en' },
                      turn_detection: { type: 'server_vad', silence_duration_ms: 700 },
                      noise_reduction: { type: 'near_field' },
                    },
                  },
                },
              }),
            })
            const body = (await reply.json().catch(() => ({}))) as { value?: string; expires_at?: number; error?: { message?: string } }
            if (reply.ok && body.value) return send(res, 200, { clientSecret: body.value, expiresAt: body.expires_at ?? null, model })
            lastError = body.error?.message ?? `OpenAI ${reply.status}`
          }
          return send(res, 502, { error: lastError })
        }
        if (req.url !== '/api/transcribe') return next()
        if (req.method !== 'POST') return send(res, 405, { error: 'POST only' })
        const key = readOpenAiKey(envFile)
        if (!key) return send(res, 500, { error: 'OPENAI_API_KEY is not set in front_end/.env' })
        try {
          const wav = await readBytes(req)
          if (wav.length < 44 || wav.toString('ascii', 0, 4) !== 'RIFF') return send(res, 400, { error: 'Body must be a WAV file' })
          let lastError = 'Transcribe failed'
          for (const model of TRANSCRIBE_MODELS) {
            const form = new FormData()
            form.append('model', model)
            form.append('language', 'en')
            form.append('file', new Blob([new Uint8Array(wav)], { type: 'audio/wav' }), 'question.wav')
            const reply = await fetch('https://api.openai.com/v1/audio/transcriptions', {
              method: 'POST',
              headers: { Authorization: `Bearer ${key}` },
              body: form,
            })
            const body = (await reply.json()) as { text?: string; error?: { message?: string } }
            if (reply.ok) return send(res, 200, { text: body.text?.trim() ?? '', model })
            lastError = body.error?.message ?? `OpenAI ${reply.status}`
            if (reply.status !== 403 && reply.status !== 404) break
          }
          send(res, 502, { error: lastError })
        } catch (error) {
          send(res, 500, { error: error instanceof Error ? error.message : 'Transcribe failed' })
        }
      })
    },
  }
}
