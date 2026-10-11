/**
 * ProjectSim create bodies for the WebGL viewer.
 * Standard or measured only. Params are locked to the agnostic GLB package.
 * Audio is rejected. A capture clip is rejected on the standard route.
 */

export const KPS_VIEWER_PARAMS = {
  mesh: { quality: 'low' },
  texture: { resolution: 2048 },
  physics: {
    simulator: 'agnostic',
    body: 'rigid',
    collision: 'auto',
  },
} as const

export type KpsRoute = 'standard' | 'measured'

export type KpsMedia = {
  url?: string
  data?: string
}

export type KpsDraft = {
  route: KpsRoute
  name?: string
  text?: string
  image?: KpsMedia
  capture?: KpsMedia
  multiSubject?: boolean
  subjectName?: string
}

export type KpsCreate = {
  path: '/v1/assets/standard' | '/v1/assets/measured'
  body: {
    name?: string
    inputs: Record<string, unknown>
    params: typeof KPS_VIEWER_PARAMS
  }
}

export class KpsPayloadError extends Error {
  readonly field: string

  constructor(field: string, message: string) {
    super(message)
    this.name = 'KpsPayloadError'
    this.field = field
  }
}

const DRAFT_KEYS = new Set([
  'route',
  'name',
  'text',
  'image',
  'capture',
  'multiSubject',
  'subjectName',
])

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new KpsPayloadError(field, `${field} must be an object`)
  }
  return value as Record<string, unknown>
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') throw new KpsPayloadError(field, `${field} must be a string`)
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function media(value: unknown, field: string): { url: string } | { data: string } | undefined {
  if (value === undefined || value === null) return undefined
  const record = asRecord(value, field)
  for (const key of Object.keys(record)) {
    if (key !== 'url' && key !== 'data') {
      throw new KpsPayloadError(field, `${field} only accepts url or data`)
    }
  }
  const url = optionalString(record.url, `${field}.url`)
  const data = optionalString(record.data, `${field}.data`)
  if (url && data) throw new KpsPayloadError(field, `${field} accepts a url or inline data, not both`)
  if (!url && !data) return undefined
  if (url) {
    if (!url.startsWith('https://')) {
      throw new KpsPayloadError(field, `${field} url must be https`)
    }
    return { url }
  }
  return { data: data as string }
}

function rejectAudio(draft: Record<string, unknown>) {
  if ('audio' in draft) {
    throw new KpsPayloadError('audio', 'ProjectSim does not accept audio')
  }
  const inputs = draft.inputs
  if (inputs && typeof inputs === 'object' && 'audio' in (inputs as Record<string, unknown>)) {
    throw new KpsPayloadError('audio', 'ProjectSim does not accept audio')
  }
}

/**
 * Build the JSON body for one create. Throws before any network call.
 */
export function buildKpsCreate(input: KpsDraft | Record<string, unknown>): KpsCreate {
  const draft = asRecord(input, 'draft')
  rejectAudio(draft)
  for (const key of Object.keys(draft)) {
    if (!DRAFT_KEYS.has(key)) {
      throw new KpsPayloadError(key, `Unknown field ${key}`)
    }
  }

  const route = draft.route
  if (route !== 'standard' && route !== 'measured') {
    throw new KpsPayloadError('route', 'Route must be standard or measured')
  }

  const name = optionalString(draft.name, 'name')
  if (name && name.length > 100) throw new KpsPayloadError('name', 'Name is longer than 100 characters')

  const text = optionalString(draft.text, 'text')
  if (text && text.length > 10000) throw new KpsPayloadError('text', 'Text is longer than 10000 characters')

  const image = media(draft.image, 'image')
  const capture = media(draft.capture, 'capture')
  const multiSubject = draft.multiSubject === true
  const subjectName = optionalString(draft.subjectName, 'subjectName')

  if (route === 'standard' && capture) {
    throw new KpsPayloadError('capture', 'Standard does not accept a capture video')
  }
  if (route === 'measured' && text) {
    throw new KpsPayloadError('text', 'Measured does not accept text')
  }
  if (route === 'measured' && !capture) {
    throw new KpsPayloadError('capture', 'Measured requires one MP4 or MOV capture')
  }
  if (route === 'measured' && !image) {
    throw new KpsPayloadError('image', 'Measured requires one reference image')
  }
  if (text && image) {
    throw new KpsPayloadError('text', 'Send an image or text, not both')
  }
  if (!text && !image) {
    throw new KpsPayloadError('image', 'Send one image or a text description')
  }
  if (multiSubject && !image) {
    throw new KpsPayloadError('image', 'A named subject needs one image')
  }
  if (multiSubject && !subjectName) {
    throw new KpsPayloadError('subjectName', 'Name the subject to isolate from the image')
  }
  if (!multiSubject && subjectName) {
    throw new KpsPayloadError('subjectName', 'Subject name requires multi-subject mode')
  }
  if (route === 'measured' && multiSubject) {
    throw new KpsPayloadError('multiSubject', 'Measured uses the whole reference image')
  }

  const inputs: Record<string, unknown> = {}
  if (image) inputs.images = [image]
  if (text) inputs.text = text
  if (multiSubject) {
    inputs.multi_subject_image = true
    inputs.subject_name = subjectName
  }
  if (capture) inputs.capture = [capture]

  return {
    path: route === 'standard' ? '/v1/assets/standard' : '/v1/assets/measured',
    body: {
      ...(name ? { name } : {}),
      inputs,
      params: KPS_VIEWER_PARAMS,
    },
  }
}

/** Stable key so the same body reuses one Idempotency-Key. */
export function payloadFingerprint(create: KpsCreate): string {
  return `${create.path}:${JSON.stringify(create.body)}`
}

export type KpsAccountAsset = {
  id: string
  name: string
}

/** Read a list response. Listing does not create an asset. */
export function readAccountAssets(body: unknown): KpsAccountAsset[] {
  const rows = accountRows(body)
  const assets: KpsAccountAsset[] = []
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const record = row as { id?: unknown; asset_id?: unknown; name?: unknown }
    const id = typeof record.id === 'string' ? record.id : typeof record.asset_id === 'string' ? record.asset_id : ''
    if (!/^[A-Za-z0-9_-]+$/.test(id)) continue
    assets.push({ id, name: typeof record.name === 'string' ? record.name : '' })
  }
  return assets
}

function accountRows(body: unknown): unknown[] {
  if (Array.isArray(body)) return body
  if (!body || typeof body !== 'object') return []
  const record = body as Record<string, unknown>
  for (const key of ['assets', 'data', 'items', 'results']) {
    if (Array.isArray(record[key])) return record[key]
  }
  return []
}
