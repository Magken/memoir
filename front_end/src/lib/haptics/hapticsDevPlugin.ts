/**
 * Dev-only Vite route. The browser calls /api/haptics. This process talks to the local DataFeel API.
 */
import type { ServerResponse } from 'node:http'
import type { Connect, Plugin } from 'vite'

export const HAPTICS_ORIGIN_DEFAULT = 'http://127.0.0.1:5288'

export function hapticsOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.HAPTICS_ORIGIN
  if (typeof raw === 'string' && raw.trim()) return raw.trim().replace(/\/$/, '')
  return HAPTICS_ORIGIN_DEFAULT
}

/** Upstream path for a browser URL, or null when the route is not this proxy. */
export function hapticsUpstreamPath(url: string, method: string): '/health' | '/dots' | '/buzz' | null {
  const path = url.split('?')[0]
  if (path === '/api/haptics/health' && method === 'GET') return '/health'
  if (path === '/api/haptics/dots' && method === 'GET') return '/dots'
  if (path === '/api/haptics/buzz' && method === 'POST') return '/buzz'
  return null
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function readBody(req: Connect.IncomingMessage, max = 64 * 1024): Promise<Buffer> {
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

export function hapticsDevPlugin(): Plugin {
  return {
    name: 'haptics-dev',
    apply: 'serve',
    configureServer(server) {
      console.log('haptics route ready')
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? ''
        const method = req.method ?? 'GET'
        const path = hapticsUpstreamPath(url, method)
        if (!path) {
          if (url.split('?')[0].startsWith('/api/haptics')) {
            send(res, 405, { error: 'Use GET /api/haptics/dots or POST /api/haptics/buzz' })
            return
          }
          next()
          return
        }
        try {
          const origin = hapticsOrigin()
          const init: RequestInit = { method }
          if (path === '/buzz') {
            const body = await readBody(req)
            init.headers = { 'Content-Type': 'application/json' }
            init.body = body
          }
          const upstream = await fetch(`${origin}${path}`, init)
          const text = await upstream.text()
          res.statusCode = upstream.status
          res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
          res.end(text)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'haptics proxy failed'
          send(res, 502, { error: message })
        }
      })
    },
  }
}
