/**
 * HTTP client for https://api.projectsim.ai.
 * The token is passed in by the dev server. Download URLs are fetched with no bearer token.
 */

const API_BASE = 'https://api.projectsim.ai'

export type KpsFile = {
  kind: string
  path: string
  url: string
  expires_at: string
}

export type KpsJob = {
  id: string
  status: string
  current_stage: string | null
  progress: number | null
  error: unknown
  resource: { id: string; type: string }
}

export type KpsAsset = {
  id: string
  name: string | null
  files: KpsFile[]
  job: {
    job_id: string
    status: string
    current_stage: string | null
    progress: number | null
  } | null
}

export type KpsCreated = {
  id: string
  job_id: string
  status?: string
}

export class KpsHttpError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    const record = body && typeof body === 'object' ? (body as { detail?: string; title?: string }) : null
    super(record?.detail || record?.title || `ProjectSim returned ${status}`)
    this.name = 'KpsHttpError'
    this.status = status
    this.body = body
  }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

export function createProjectSimClient(token: string, fetchImpl: FetchLike = fetch) {
  async function request(path: string, init: RequestInit = {}): Promise<unknown> {
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${token}`)
    if (init.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    const response = await fetchImpl(`${API_BASE}${path}`, { ...init, headers })
    const body = await readBody(response)
    if (!response.ok) throw new KpsHttpError(response.status, body)
    return body
  }

  return {
    createStandardAsset(body: unknown, idempotencyKey: string): Promise<KpsCreated> {
      return request('/v1/assets/standard', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(body),
      }) as Promise<KpsCreated>
    },
    createMeasuredAsset(body: unknown, idempotencyKey: string): Promise<KpsCreated> {
      return request('/v1/assets/measured', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(body),
      }) as Promise<KpsCreated>
    },
    getJob(jobId: string): Promise<KpsJob> {
      return request(`/v1/jobs/${jobId}`) as Promise<KpsJob>
    },
    getAsset(assetId: string): Promise<KpsAsset> {
      return request(`/v1/assets/${assetId}`) as Promise<KpsAsset>
    },
    listAssets(): Promise<unknown> {
      return request('/v1/assets')
    },
    cancelJob(jobId: string): Promise<KpsJob> {
      return request(`/v1/jobs/${jobId}/cancel`, { method: 'POST' }) as Promise<KpsJob>
    },
    /** Presigned file URL. The bearer token must not be sent. */
    downloadFile(url: string): Promise<Response> {
      return fetchImpl(url)
    },
  }
}

export type ProjectSimClient = ReturnType<typeof createProjectSimClient>
