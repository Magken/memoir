/**
 * Dev-only Vite route. The browser calls /api/yolo. This process talks to the p150.
 * Sample images are fetched here so the page can read the bytes.
 */
import type { ServerResponse } from 'node:http'
import type { Connect, Plugin } from 'vite'

export const YOLO_ORIGIN_DEFAULT = 'http://10.103.5.156:20000'

const SAMPLE_HOST = 'https://picsum.photos'

export function yoloOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.YOLO_ORIGIN
  if (typeof raw === 'string' && raw.trim()) return raw.trim().replace(/\/$/, '')
  return YOLO_ORIGIN_DEFAULT
}

/** Upstream path for a browser URL, or null when the route is not this proxy. */
export function yoloUpstreamPath(url: string): '/health' | '/info' | '/predict' | null {
  const path = url.split('?')[0]
  if (path === '/api/yolo/health') return '/health'
  if (path === '/api/yolo/info') return '/info'
  if (path === '/api/yolo/predict') return '/predict'
  return null
}

export function isYoloSampleUrl(url: string): boolean {
  return url.split('?')[0] === '/api/yolo/sample'
}

/** picsum seed URL. The seed is folded so a query cannot change the host. */
export function randomSampleUrl(seed: string): string {
  const safe = seed.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'yolo'
  return `${SAMPLE_HOST}/seed/${safe}/1280/827`
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function readBody(req: Connect.IncomingMessage, max = 32 * 1024 * 1024): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > max) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function forward(
  res: ServerResponse,
  origin: string,
  path: string,
  init: RequestInit,
) {
  const upstream = await fetch(`${origin}${path}`, init)
  const text = await upstream.text()
  res.statusCode = upstream.status
  res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
  res.end(text)
}

export function yoloDevPlugin(): Plugin {
  return {
    name: 'yolo-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? ''
        const path = yoloUpstreamPath(url)
        const sample = isYoloSampleUrl(url)
        if (!path && !sample) {
          next()
          return
        }
        try {
          if (sample) {
            const seed = new URL(url, 'http://localhost').searchParams.get('seed') ?? 'yolo'
            const image = await fetch(randomSampleUrl(seed), { redirect: 'follow' })
            if (!image.ok) {
              send(res, image.status, { error: 'sample image failed' })
              return
            }
            const bytes = Buffer.from(await image.arrayBuffer())
            res.statusCode = 200
            res.setHeader('Content-Type', image.headers.get('content-type') ?? 'image/jpeg')
            res.end(bytes)
            return
          }
          const origin = yoloOrigin()
          if (path === '/predict') {
            if ((req.method ?? 'GET') !== 'POST') {
              send(res, 405, { error: 'POST /api/yolo/predict' })
              return
            }
            const body = await readBody(req)
            await forward(res, origin, path, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body,
            })
            return
          }
          await forward(res, origin, path, { method: 'GET' })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'yolo proxy failed'
          send(res, 502, { error: message })
        }
      })
    },
  }
}
