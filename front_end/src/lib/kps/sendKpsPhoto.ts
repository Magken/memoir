/**
 * Sends one captured photo to ProjectSim as a standard image → 3D create, through the
 * dev `/api/kps` route. The same photo reuses its idempotency key, so a double press
 * does not spend a second attempt.
 */
import { buildKpsCreate, payloadFingerprint, type KpsDraft } from './payload'

export type KpsPhotoJob = { assetId: string; jobId: string }

/** Base64 body of a `data:` URL. */
export function dataUrlBody(dataUrl: string): string {
  const comma = dataUrl.indexOf(',')
  if (!dataUrl.startsWith('data:') || comma < 0) throw new Error('Not a data URL')
  return dataUrl.slice(comma + 1)
}

export function photoDraft(dataUrl: string, name = 'Memoir capture'): KpsDraft {
  return { route: 'standard', name, image: { data: dataUrlBody(dataUrl) } }
}

function idempotencyKeyFor(fingerprint: string): string {
  const storageKey = `kps-idem:${fingerprint.length}:${fingerprint.slice(-64)}`
  const existing = sessionStorage.getItem(storageKey)
  if (existing) return existing
  const key = crypto.randomUUID()
  sessionStorage.setItem(storageKey, key)
  return key
}

async function readKps(response: Response): Promise<Record<string, unknown>> {
  const body = (await response.json()) as Record<string, unknown>
  if (!response.ok) throw new Error(typeof body.detail === 'string' ? body.detail : `Request failed (${response.status})`)
  return body
}

export type KpsJobStatus = { status: string; stage: string | null }

const KPS_DONE = new Set(['complete', 'failed', 'canceled', 'partial'])
const POLL_MS = 5000

/** Polls the job until it ends. Resolves on `complete`, throws on any other end or when `signal` aborts. */
export async function waitForKpsJob(
  jobId: string,
  onStatus: (status: KpsJobStatus) => void,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  for (;;) {
    if (signal.aborted) throw new Error('Stopped')
    const body = await readKps(await fetchImpl(`/api/kps/jobs/${jobId}`, { signal }))
    const status = String(body.status)
    onStatus({ status, stage: typeof body.current_stage === 'string' ? body.current_stage : null })
    if (status === 'complete') return
    if (KPS_DONE.has(status)) throw new Error(`Generation ${status}${typeof body.error === 'string' ? `: ${body.error}` : ''}`)
    await new Promise((resolve) => setTimeout(resolve, POLL_MS))
  }
}

/** Saves the finished package under `public/3d/kps` and returns the GLB's public path. */
export async function saveKpsGlb(assetId: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const body = await readKps(await fetchImpl(`/api/kps/assets/${assetId}/files`, { method: 'POST' }))
  if (typeof body.glbPublicPath !== 'string' || !body.glbPublicPath) throw new Error('The package has no GLB')
  return body.glbPublicPath
}

export async function sendKpsPhoto(dataUrl: string, fetchImpl: typeof fetch = fetch): Promise<KpsPhotoJob> {
  const draft = photoDraft(dataUrl)
  const create = buildKpsCreate(draft)
  const response = await fetchImpl('/api/kps/assets/standard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: true, idempotencyKey: idempotencyKeyFor(payloadFingerprint(create)), draft }),
  })
  const body = await readKps(response)
  return { assetId: String(body.id), jobId: String(body.job_id) }
}
