/**
 * YOLOX p150 predict contract: one camera image in, 2D boxes out.
 * The dev server forwards these bodies. This module does not open a socket.
 */

export type YoloBox = {
  label: string
  labelId: number
  score: number
  box: readonly [number, number, number, number]
}

export type YoloPredictResult = {
  model: string
  numDetections: number
  detections: YoloBox[]
  imageHw: readonly [number, number] | null
  totalMs: number | null
}

export class YoloRequestError extends Error {
  field: string

  constructor(field: string, message: string) {
    super(message)
    this.name = 'YoloRequestError'
    this.field = field
  }
}

type PredictImage = {
  camera: 'CAM_FRONT'
  data: string
}

export type YoloPredictRequest = {
  images: [PredictImage]
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** Raw base64. A data-URL prefix is removed so the server receives the payload it documents. */
export function stripDataUrl(value: string): string {
  const comma = value.indexOf(',')
  if (value.startsWith('data:') && comma !== -1) return value.slice(comma + 1)
  return value
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const step = 0x8000
  for (let i = 0; i < bytes.length; i += step) {
    const slice = bytes.subarray(i, i + step)
    binary += String.fromCharCode(...slice)
  }
  return btoa(binary)
}

export function buildYoloPredictRequest(imageBase64: string): YoloPredictRequest {
  const data = stripDataUrl(imageBase64).trim()
  if (!data) throw new YoloRequestError('image', 'A test image is required')
  return { images: [{ camera: 'CAM_FRONT', data }] }
}

function boxOf(value: unknown): YoloBox['box'] | null {
  if (!Array.isArray(value) || value.length !== 4) return null
  const x1 = finite(value[0])
  const y1 = finite(value[1])
  const x2 = finite(value[2])
  const y2 = finite(value[3])
  if (x1 === null || y1 === null || x2 === null || y2 === null) return null
  return [x1, y1, x2, y2]
}

function pairOf(value: unknown): readonly [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null
  const a = finite(value[0])
  const b = finite(value[1])
  if (a === null || b === null) return null
  return [a, b]
}

/** Keeps rows that carry a 2D `box_xyxy`. Other shapes are dropped. */
export function parseYoloPredict(body: unknown): YoloPredictResult {
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const raw = Array.isArray(record.detections) ? record.detections : []
  const detections: YoloBox[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const item = row as Record<string, unknown>
    const box = boxOf(item.box_xyxy)
    if (!box) continue
    const score = finite(item.score) ?? 0
    const labelId = finite(item.label_id) ?? 0
    const label = typeof item.label === 'string' && item.label ? item.label : 'UNKNOWN'
    detections.push({ label, labelId, score, box })
  }
  const meta = record.meta && typeof record.meta === 'object' ? (record.meta as Record<string, unknown>) : {}
  const timing =
    record.timing_ms && typeof record.timing_ms === 'object'
      ? (record.timing_ms as Record<string, unknown>)
      : {}
  const counted = finite(record.num_detections)
  return {
    model: typeof record.model === 'string' ? record.model : 'yolox-p150',
    numDetections: counted ?? detections.length,
    detections,
    imageHw: pairOf(meta.image_hw),
    totalMs: finite(timing.total),
  }
}
