import type { Config } from '@netlify/edge-functions'

export default async () => {
  return Response.json({ ok: true, source: 'local-edge' })
}

export const config: Config = {
  path: '/api/edge-health',
}
