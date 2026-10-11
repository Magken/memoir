/**
 * Splat library shapes shared by the Splat page and its dev route: which files exist,
 * and each file's Home view, flip, and saved viewpoints.
 */
export type Vec3 = [number, number, number]

export type SplatFormat = 'spz' | 'ply'

export type SplatView = {
  camera: Vec3
  target: Vec3
  fov: number
}

export type NamedSplatView = SplatView & {
  id: string
  label: string
}

export type SplatViewsEntry = {
  home?: SplatView
  flip?: boolean
  views: NamedSplatView[]
}

/** Keyed by public path, e.g. `/3d/fort-mason.spz`. */
export type SplatViewsDoc = Record<string, SplatViewsEntry>

export type SplatFile = {
  path: string
  name: string
  format: SplatFormat
  bytes: number
}

export function splatFormatOf(name: string): SplatFormat | null {
  const lower = name.toLowerCase()
  if (lower.endsWith('.spz')) return 'spz'
  if (lower.endsWith('.ply')) return 'ply'
  return null
}

/** A file name safe to write under public/3d/splats, or null. */
export function safeSplatName(name: string): string | null {
  const base = name.split(/[\\/]/).pop() ?? ''
  const cleaned = base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-.]+/, '')
  if (!cleaned || !splatFormatOf(cleaned)) return null
  if (cleaned.length <= 4) return null
  return cleaned
}

function readVec3(value: unknown): Vec3 | null {
  if (!Array.isArray(value) || value.length !== 3) return null
  const out = value.map(Number)
  return out.every(Number.isFinite) ? (out as Vec3) : null
}

export const SPLAT_SESSION_KIND = 'webgl-splat-session'

export type SplatSessionStage = {
  camera: {
    position: Vec3
    target: Vec3
    up: Vec3
    quaternion: [number, number, number, number]
    fov: number
    near: number
    far: number
    orbit: { azimuth: number; polar: number; radius: number }
  }
  model: { position: Vec3; rotation: Vec3; quaternion: [number, number, number, number]; scale: Vec3 }
  bounds: { center: Vec3; radius: number }
  viewport: { width: number; height: number; pixelRatio: number }
  backend: string
}

export type SplatSession = SplatSessionStage & {
  kind: typeof SPLAT_SESSION_KIND
  splat: SplatFile & { count: number; flip: boolean }
  home: SplatView | null
  views: NamedSplatView[]
}

export function serializeSplatSession(session: Omit<SplatSession, 'kind'>): string {
  return `${JSON.stringify({ kind: SPLAT_SESSION_KIND, ...session }, null, 2)}\n`
}

/** Accepts a short view, a webgl-splat-session, or the reference page's Copy view. */
export function parseSplatView(value: unknown): SplatView | null {
  let raw = value
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw) as unknown
    } catch {
      return null
    }
  }
  if (!raw || typeof raw !== 'object') return null
  let record = raw as Record<string, unknown>
  if (record.kind === SPLAT_SESSION_KIND && record.camera && typeof record.camera === 'object') {
    const nested = record.camera as Record<string, unknown>
    record = { camera: nested.position, target: nested.target, fov: nested.fov }
  }
  const camera = readVec3(record.camera)
  const target = readVec3(record.target)
  if (!camera || !target) return null
  const fov = Number(record.fov ?? 50)
  return { camera, target, fov: Number.isFinite(fov) && fov > 1 && fov < 179 ? fov : 50 }
}

export function readViewsDoc(value: unknown): SplatViewsDoc {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const doc: SplatViewsDoc = {}
  for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
    if (!entryValue || typeof entryValue !== 'object') continue
    const entry = entryValue as Record<string, unknown>
    const views: NamedSplatView[] = []
    if (Array.isArray(entry.views)) {
      for (const item of entry.views) {
        const view = parseSplatView(item)
        const record = item as Record<string, unknown>
        if (view && typeof record.id === 'string' && typeof record.label === 'string') {
          views.push({ ...view, id: record.id, label: record.label })
        }
      }
    }
    const home = parseSplatView(entry.home)
    doc[key] = {
      ...(home ? { home } : {}),
      ...(typeof entry.flip === 'boolean' ? { flip: entry.flip } : {}),
      views,
    }
  }
  return doc
}

export function entryFor(doc: SplatViewsDoc, path: string): SplatViewsEntry {
  return doc[path] ?? { views: [] }
}

/** Raw 3DGS .ply is y-down, so it opens turned 180° on X; .spz is already y-up. A saved choice wins. */
export function flipFor(entry: SplatViewsEntry, format: SplatFormat): boolean {
  return entry.flip ?? format === 'ply'
}

export function withEntry(doc: SplatViewsDoc, path: string, entry: SplatViewsEntry): SplatViewsDoc {
  return { ...doc, [path]: entry }
}
