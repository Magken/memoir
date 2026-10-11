/**
 * Dev-only Vite route. The browser calls /api/kps. This process reads the token.
 * A create is forwarded only when confirm is exactly true.
 */
import fs from 'node:fs'
import type { ServerResponse } from 'node:http'
import path from 'node:path'
import type { Connect, Plugin } from 'vite'
import { buildKpsCreate } from './payload.ts'
import { createProjectSimClient } from './projectsimClient.ts'
import { readKpsToken } from './readKpsToken.ts'
import { appendWebglAssetSource } from './registerKpsAsset.ts'
import { listLocalKpsPackages, saveKpsPackage } from './saveKpsPackage.ts'

type CreateBody = {
  confirm?: unknown
  idempotencyKey?: unknown
  draft?: unknown
}

/** Create is allowed only after the workbench's Generate click. */
export function kpsCreateAllowed(body: CreateBody): boolean {
  return body.confirm === true && typeof body.idempotencyKey === 'string' && body.idempotencyKey.length > 0
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function readJson(req: Connect.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8')
      if (!text) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(text) as unknown)
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function idFrom(url: string, prefix: string): string | null {
  if (!url.startsWith(prefix)) return null
  const id = url.slice(prefix.length).split('/')[0]
  return /^[A-Za-z0-9_-]+$/.test(id) ? id : null
}

export function kpsDevPlugin(envFile = path.resolve(process.cwd(), '.env')): Plugin {
  return {
    name: 'kps-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? '').split('?')[0]
        if (!url.startsWith('/api/kps')) {
          next()
          return
        }
        try {
          if ((req.method ?? 'GET') === 'GET' && url === '/api/kps/local') {
            const destRoot = path.resolve(server.config.root, 'public/3d/kps')
            send(res, 200, { packages: listLocalKpsPackages(destRoot) })
            return
          }

          const token = readKpsToken(envFile)
          const client = createProjectSimClient(token)
          const method = req.method ?? 'GET'

          if (method === 'GET' && url === '/api/kps/assets') {
            send(res, 200, await client.listAssets())
            return
          }

          const assetId = idFrom(url, '/api/kps/assets/')
          if (method === 'GET' && assetId && url === `/api/kps/assets/${assetId}`) {
            send(res, 200, await client.getAsset(assetId))
            return
          }

          const jobId = idFrom(url, '/api/kps/jobs/')
          if (method === 'GET' && jobId && url === `/api/kps/jobs/${jobId}`) {
            send(res, 200, await client.getJob(jobId))
            return
          }

          if (method === 'POST' && (url === '/api/kps/assets/standard' || url === '/api/kps/assets/measured')) {
            const body = (await readJson(req)) as CreateBody
            if (!kpsCreateAllowed(body)) {
              send(res, 400, { detail: 'Generate is required before a create is sent' })
              return
            }
            const create = buildKpsCreate(body.draft as Record<string, unknown>)
            const expected = url.endsWith('/measured') ? '/v1/assets/measured' : '/v1/assets/standard'
            if (create.path !== expected) {
              send(res, 400, { detail: 'Draft route does not match this endpoint' })
              return
            }
            const created =
              create.path === '/v1/assets/standard'
                ? await client.createStandardAsset(create.body, body.idempotencyKey as string)
                : await client.createMeasuredAsset(create.body, body.idempotencyKey as string)
            send(res, 202, created)
            return
          }

          if (method === 'POST' && jobId && url === `/api/kps/jobs/${jobId}/cancel`) {
            const job = await client.getJob(jobId)
            if (job.status !== 'queued') {
              send(res, 409, { detail: 'Cancel is only available while the job is queued' })
              return
            }
            send(res, 200, await client.cancelJob(jobId))
            return
          }

          if (method === 'POST' && assetId && url === `/api/kps/assets/${assetId}/files`) {
            const asset = await client.getAsset(assetId)
            const destRoot = path.resolve(server.config.root, 'public/3d/kps')
            const saved = await saveKpsPackage({
              assetId,
              files: asset.files,
              destRoot,
              fetchImpl: (fileUrl) => client.downloadFile(fileUrl),
            })
            send(res, 200, saved)
            return
          }

          if (method === 'POST' && url === '/api/kps/register') {
            const body = (await readJson(req)) as { id?: string; label?: string; path?: string }
            if (!body.id || !body.label || !body.path) {
              send(res, 400, { detail: 'id, label, and path are required' })
              return
            }
            const manifestPath = path.resolve(server.config.root, 'src/lib/webgl/assets/assetManifest.ts')
            const source = fs.readFileSync(manifestPath, 'utf8')
            const next = appendWebglAssetSource(source, {
              id: body.id,
              label: body.label,
              path: body.path,
            })
            if (next !== source) fs.writeFileSync(manifestPath, next)
            send(res, 200, { id: body.id, path: body.path, registered: next !== source })
            return
          }

          send(res, 404, { detail: 'Unknown KPS route' })
        } catch (error) {
          const status = error && typeof error === 'object' && 'status' in error ? Number(error.status) : 500
          const detail = error instanceof Error ? error.message : 'KPS request failed'
          send(res, Number.isFinite(status) && status >= 400 ? status : 500, { detail })
        }
      })
    },
  }
}
