/**
 * Dev-only Vite route. The browser posts a capture to /api/describe; this process reads
 * OPENAI_API_KEY from `.env` (or the environment) and asks OpenAI vision to describe it.
 */
import fs from 'node:fs'
import type { ServerResponse } from 'node:http'
import path from 'node:path'
import type { Connect, Plugin } from 'vite'

const DESCRIBE_MODEL = 'gpt-4.1-mini'

const DESCRIBE_PROMPT = [
  'You describe a captured view of a 3D scene for a blind or low-vision reader.',
  'Write plain prose in short labelled sections:',
  'Scene: what place this is and its overall layout.',
  'Orientation: where the viewer stands and which way they face (left, right, ahead, behind).',
  'Angle: camera height and tilt (eye level, looking down, looking up) and how far away things are.',
  'Objects: the main objects, each with its position in the frame and its rough size.',
  'Keep it under 180 words. Do not guess at things you cannot see.',
].join('\n')

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function readJson(req: Connect.IncomingMessage): Promise<{ image?: unknown }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

export function readOpenAiKey(envFile: string): string {
  if (fs.existsSync(envFile)) {
    const line = fs
      .readFileSync(envFile, 'utf8')
      .split(/\r?\n/)
      .find((row) => /^\s*OPENAI_API_KEY\s*=/.test(row))
    const value = line?.split('=').slice(1).join('=').trim().replace(/^['"]|['"]$/g, '')
    if (value) return value
  }
  return process.env.OPENAI_API_KEY ?? ''
}

export function describeDevPlugin(envFile = path.resolve(process.cwd(), '.env')): Plugin {
  return {
    name: 'describe-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/describe') return next()
        if (req.method !== 'POST') return send(res, 405, { error: 'POST only' })
        const key = readOpenAiKey(envFile)
        if (!key) return send(res, 500, { error: 'OPENAI_API_KEY is not set in front_end/.env' })
        try {
          const { image } = await readJson(req)
          if (typeof image !== 'string' || !image.startsWith('data:image/')) {
            return send(res, 400, { error: 'image must be a data URL' })
          }
          const reply = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: DESCRIBE_MODEL,
              max_tokens: 400,
              messages: [
                { role: 'system', content: DESCRIBE_PROMPT },
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: 'Describe this captured view.' },
                    { type: 'image_url', image_url: { url: image } },
                  ],
                },
              ],
            }),
          })
          const body = (await reply.json()) as {
            choices?: { message?: { content?: string } }[]
            error?: { message?: string }
          }
          if (!reply.ok) return send(res, reply.status, { error: body.error?.message ?? 'OpenAI request failed' })
          const text = body.choices?.[0]?.message?.content?.trim()
          if (!text) return send(res, 502, { error: 'OpenAI returned no description' })
          send(res, 200, { text })
        } catch (error) {
          send(res, 500, { error: error instanceof Error ? error.message : 'Describe failed' })
        }
      })
    },
  }
}
