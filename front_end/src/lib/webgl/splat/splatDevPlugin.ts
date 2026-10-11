/**
 * Dev-only Vite routes for the Splat page, plus the resolver that keeps three r186's
 * splat addons on three r186 instead of the app's three.
 */
import type { ServerResponse } from 'node:http'
import path from 'node:path'
import type { Connect, Plugin } from 'vite'
import { listSplatFiles, readSplatViews, saveSplatImport, writeSplatViews } from './splatFiles.ts'

const R186_FILE = /[\\/]node_modules[\\/]three-r186[\\/]/

/** A bare `three` import from inside three-r186 must stay on three-r186. */
export function remapThreeImport(source: string, importer: string | undefined): string | null {
  if (!importer || !R186_FILE.test(importer)) return null
  if (source === 'three' || source.startsWith('three/')) return `three-r186${source.slice('three'.length)}`
  return null
}

export function threeR186Plugin(): Plugin {
  return {
    name: 'three-r186-resolve',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      const target = remapThreeImport(source, importer)
      if (!target) return null
      return this.resolve(target, importer, { ...options, skipSelf: true })
    },
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function readBody(req: Connect.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export function splatDevPlugin(): Plugin {
  return {
    name: 'splat-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const [url, query = ''] = (req.url ?? '').split('?')
        if (!url.startsWith('/api/splats')) {
          next()
          return
        }
        const publicRoot = path.resolve(server.config.root, 'public')
        const method = req.method ?? 'GET'
        try {
          if (method === 'GET' && url === '/api/splats') {
            send(res, 200, { splats: listSplatFiles(publicRoot), views: readSplatViews(publicRoot) })
            return
          }
          if (method === 'POST' && url === '/api/splats/import') {
            const name = new URLSearchParams(query).get('name') ?? ''
            send(res, 200, saveSplatImport(publicRoot, name, await readBody(req)))
            return
          }
          if (method === 'POST' && url === '/api/splats/views') {
            const text = (await readBody(req)).toString('utf8')
            send(res, 200, { views: writeSplatViews(publicRoot, JSON.parse(text || '{}') as unknown) })
            return
          }
          send(res, 404, { detail: 'Unknown splat route' })
        } catch (error) {
          const status = error && typeof error === 'object' && 'status' in error ? Number(error.status) : 500
          send(res, Number.isFinite(status) && status >= 400 ? status : 500, {
            detail: error instanceof Error ? error.message : 'Splat request failed',
          })
        }
      })
    },
  }
}
