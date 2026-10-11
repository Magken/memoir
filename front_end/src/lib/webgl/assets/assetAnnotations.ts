export type AssetAnnotationKind =
  | 'front'
  | 'back'
  | 'midpoint'
  | 'face'
  | 'point'
  | 'named'
  | 'viewpoint'
  | 'highlight'
  | 'region'
  | 'color'

export const ASSET_ANNOTATION_KINDS: readonly AssetAnnotationKind[] = [
  'front',
  'back',
  'midpoint',
  'face',
  'point',
  'named',
  'viewpoint',
  'highlight',
  'region',
  'color',
]

export type AssetAnnotation = {
  id: string
  kind: AssetAnnotationKind
  label: string
  position: [number, number, number]
  normal?: [number, number, number]
  faceIndex?: number
  objectName?: string
  /** Orbit camera position when this mark is a viewpoint. */
  camera?: [number, number, number]
  /** Orbit look-at; defaults to `position`. */
  target?: [number, number, number]
  /** Y-up spherical around `target` — heading relative to the model, not a world-XYZ zoom. */
  orbit?: { azimuth: number; polar: number; radius: number }
  /** Camera up vector. */
  up?: [number, number, number]
  /** Camera quaternion `[x,y,z,w]`. */
  quaternion?: [number, number, number, number]
  /** Encircled region radius in metres (around `position`). */
  radius?: number
  /** Closed ring of world points for a region highlighter. */
  ring?: [number, number, number][]
  /** Fire a cage poke when a boom-arc camera is at its peak. */
  impulse?: boolean
  /** Hex color for a material / region note. */
  color?: string
  /** Region sample density 1 (coarse) – 8 (fine). Copied from the Poly slider. */
  poly?: number
}

export type AssetAnnotationDoc = {
  assetId: string
  units: 'm' | 'cm' | 'mm'
  upAxis: 'y' | 'z'
  notes?: string
  annotations: AssetAnnotation[]
}

const KIND_SET = new Set<string>(ASSET_ANNOTATION_KINDS)
const COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

function isQuad(value: unknown): value is [number, number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((n) => typeof n === 'number' && Number.isFinite(n))
  )
}

function parseCameraOrbit(value: unknown): { azimuth: number; polar: number; radius: number } | { error: string } {
  if (!value || typeof value !== 'object') return { error: 'orbit must be an object' }
  const orbit = value as Record<string, unknown>
  if (
    typeof orbit.azimuth !== 'number' ||
    typeof orbit.polar !== 'number' ||
    typeof orbit.radius !== 'number' ||
    !Number.isFinite(orbit.azimuth) ||
    !Number.isFinite(orbit.polar) ||
    !Number.isFinite(orbit.radius) ||
    orbit.radius <= 0
  ) {
    return { error: 'orbit needs finite azimuth, polar, and radius > 0' }
  }
  return { azimuth: orbit.azimuth, polar: orbit.polar, radius: orbit.radius }
}

function isTriple(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((n) => typeof n === 'number' && Number.isFinite(n))
  )
}

function parseRing(value: unknown): [number, number, number][] | { error: string } {
  if (!Array.isArray(value) || value.length < 3) {
    return { error: 'annotation ring must have at least 3 points' }
  }
  const ring: [number, number, number][] = []
  for (const item of value) {
    if (!isTriple(item)) return { error: 'annotation ring points must be [x,y,z]' }
    ring.push(item)
  }
  return ring
}

export function parseAssetAnnotationDoc(raw: unknown): AssetAnnotationDoc | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'annotation doc must be an object' }
  const obj = raw as Record<string, unknown>
  if (typeof obj.assetId !== 'string' || !obj.assetId.trim()) {
    return { error: 'assetId is required' }
  }
  if (obj.units !== 'm' && obj.units !== 'cm' && obj.units !== 'mm') {
    return { error: 'units must be m, cm, or mm' }
  }
  if (obj.upAxis !== 'y' && obj.upAxis !== 'z') {
    return { error: 'upAxis must be y or z' }
  }
  if (obj.notes !== undefined && typeof obj.notes !== 'string') {
    return { error: 'notes must be a string' }
  }
  if (!Array.isArray(obj.annotations)) return { error: 'annotations must be an array' }
  const annotations: AssetAnnotation[] = []
  for (const item of obj.annotations) {
    if (!item || typeof item !== 'object') return { error: 'annotation must be an object' }
    const mark = item as Record<string, unknown>
    if (typeof mark.id !== 'string' || !mark.id) return { error: 'annotation id is required' }
    if (typeof mark.kind !== 'string' || !KIND_SET.has(mark.kind)) {
      return { error: `unknown annotation kind ${String(mark.kind)}` }
    }
    if (typeof mark.label !== 'string') return { error: 'annotation label is required' }
    if (!isTriple(mark.position)) return { error: 'annotation position must be [x,y,z]' }
    const next: AssetAnnotation = {
      id: mark.id,
      kind: mark.kind as AssetAnnotationKind,
      label: mark.label,
      position: mark.position,
    }
    if (mark.normal !== undefined) {
      if (!isTriple(mark.normal)) return { error: 'annotation normal must be [x,y,z]' }
      next.normal = mark.normal
    }
    if (mark.faceIndex !== undefined) {
      if (typeof mark.faceIndex !== 'number') return { error: 'faceIndex must be a number' }
      next.faceIndex = mark.faceIndex
    }
    if (mark.objectName !== undefined) {
      if (typeof mark.objectName !== 'string') return { error: 'objectName must be a string' }
      next.objectName = mark.objectName
    }
    if (mark.camera !== undefined) {
      if (!isTriple(mark.camera)) return { error: 'annotation camera must be [x,y,z]' }
      next.camera = mark.camera
    }
    if (mark.target !== undefined) {
      if (!isTriple(mark.target)) return { error: 'annotation target must be [x,y,z]' }
      next.target = mark.target
    }
    if (mark.orbit !== undefined) {
      const orbit = parseCameraOrbit(mark.orbit)
      if ('error' in orbit) return orbit
      next.orbit = orbit
    }
    if (mark.up !== undefined) {
      if (!isTriple(mark.up)) return { error: 'annotation up must be [x,y,z]' }
      next.up = mark.up
    }
    if (mark.quaternion !== undefined) {
      if (!isQuad(mark.quaternion)) return { error: 'annotation quaternion must be [x,y,z,w]' }
      next.quaternion = mark.quaternion
    }
    if (mark.radius !== undefined) {
      if (typeof mark.radius !== 'number' || !Number.isFinite(mark.radius) || mark.radius < 0) {
        return { error: 'radius must be a non-negative number' }
      }
      next.radius = mark.radius
    }
    if (mark.ring !== undefined) {
      const ring = parseRing(mark.ring)
      if ('error' in ring) return ring
      next.ring = ring
    }
    if (mark.color !== undefined) {
      if (typeof mark.color !== 'string' || !COLOR_RE.test(mark.color)) {
        return { error: 'color must be a #hex' }
      }
      next.color = mark.color
    }
    if (mark.poly !== undefined) {
      if (typeof mark.poly !== 'number' || !Number.isFinite(mark.poly)) {
        return { error: 'poly must be a number' }
      }
      const poly = Math.round(mark.poly)
      if (poly < 1 || poly > 8) return { error: 'poly must be an integer 1–8' }
      next.poly = poly
    }
    if (mark.impulse !== undefined) {
      if (typeof mark.impulse !== 'boolean') return { error: 'impulse must be a boolean' }
      next.impulse = mark.impulse
    }
    annotations.push(next)
  }
  const doc: AssetAnnotationDoc = {
    assetId: obj.assetId,
    units: obj.units,
    upAxis: obj.upAxis,
    annotations,
  }
  if (typeof obj.notes === 'string') doc.notes = obj.notes
  return doc
}

export function serializeAssetAnnotationDoc(doc: AssetAnnotationDoc): string {
  return `${JSON.stringify(doc, null, 2)}\n`
}

export function emptyAnnotationDoc(
  assetId: string,
  units: AssetAnnotationDoc['units'] = 'm',
  upAxis: AssetAnnotationDoc['upAxis'] = 'y',
): AssetAnnotationDoc {
  return { assetId, units, upAxis, annotations: [] }
}

export type HitPayload = {
  assetId: string
  tool: string
  label: string
  point: [number, number, number]
  normal: [number, number, number] | null
  faceIndex: number | null
  objectName: string
  color?: string
}

export function serializeHitPayload(payload: HitPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`
}

export const MODEL_POINT_KIND = 'webgl-model-point'

export type ModelPointPayload = {
  kind: typeof MODEL_POINT_KIND
  assetId: string
  annotation: AssetAnnotation
}

export function serializeModelPoint(payload: ModelPointPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`
}

export const MODEL_SESSION_KIND = 'webgl-model-session'

export type ModelSessionView = {
  wireframe: boolean
  shadows: boolean
  helpers: boolean
  cameraGizmos: boolean
  showPoints?: boolean
  showLabels?: boolean
  /** Region Poly slider 1–8. */
  regionPoly?: number
  /** Cage lamp hex, e.g. `#f2c48a`. */
  lightColor?: string
  /** Cage lamp gain 0–3. */
  lightGain?: number
  /** Ceramic scatter slider 0–16. Mesh uses triple. */
  scatter?: number
  /** Ceramic host glaze hex. */
  meshColor?: string
}

export type SessionModelPose = {
  position: [number, number, number]
  rotation: [number, number, number]
  quaternion: [number, number, number, number]
  scale: [number, number, number]
}

export type ModelSessionCamera = {
  position: [number, number, number]
  target: [number, number, number]
  orbit?: { azimuth: number; polar: number; radius: number }
  up?: [number, number, number]
  quaternion?: [number, number, number, number]
}

export type ModelSessionPayload = {
  kind: typeof MODEL_SESSION_KIND
  assetId: string
  camera: ModelSessionCamera
  view: ModelSessionView
  annotations: AssetAnnotation[]
  selectedId: string | null
  lastHit?: HitPayload
  model?: SessionModelPose
}

function isViewFlags(value: unknown): value is ModelSessionView {
  if (!value || typeof value !== 'object') return false
  const view = value as Record<string, unknown>
  if (
    typeof view.wireframe !== 'boolean' ||
    typeof view.shadows !== 'boolean' ||
    typeof view.helpers !== 'boolean' ||
    typeof view.cameraGizmos !== 'boolean'
  ) {
    return false
  }
  if (view.regionPoly !== undefined) {
    if (typeof view.regionPoly !== 'number' || !Number.isFinite(view.regionPoly)) return false
    const poly = Math.round(view.regionPoly)
    if (poly < 1 || poly > 8) return false
  }
  if (view.lightColor !== undefined) {
    if (typeof view.lightColor !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(view.lightColor)) return false
  }
  if (view.lightGain !== undefined) {
    if (typeof view.lightGain !== 'number' || !Number.isFinite(view.lightGain) || view.lightGain < 0 || view.lightGain > 3) {
      return false
    }
  }
  if (view.scatter !== undefined) {
    if (typeof view.scatter !== 'number' || !Number.isFinite(view.scatter) || view.scatter < 0 || view.scatter > 16) {
      return false
    }
  }
  if (view.meshColor !== undefined) {
    if (typeof view.meshColor !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(view.meshColor)) return false
  }
  return true
}

export function parseSessionPayload(raw: unknown): ModelSessionPayload | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'session must be an object' }
  const obj = raw as Record<string, unknown>
  if (obj.kind !== MODEL_SESSION_KIND) return { error: 'kind must be webgl-model-session' }
  if (typeof obj.assetId !== 'string' || !obj.assetId.trim()) return { error: 'assetId is required' }
  const camera = obj.camera as Record<string, unknown> | null
  if (!camera || !isTriple(camera.position) || !isTriple(camera.target)) {
    return { error: 'camera position and target must be [x,y,z]' }
  }
  if (!isViewFlags(obj.view)) return { error: 'view flags are required' }
  const view: ModelSessionView = { ...obj.view }
  if (typeof view.regionPoly === 'number') view.regionPoly = Math.round(view.regionPoly)
  const nested = parseAssetAnnotationDoc({
    assetId: obj.assetId,
    units: 'm',
    upAxis: 'y',
    annotations: obj.annotations,
  })
  if ('error' in nested) return nested
  const selectedId = obj.selectedId === null || typeof obj.selectedId === 'string' ? obj.selectedId : undefined
  if (selectedId === undefined) return { error: 'selectedId must be a string or null' }
  const sessionCamera: ModelSessionCamera = { position: camera.position, target: camera.target }
  if (camera.orbit !== undefined) {
    const orbit = parseCameraOrbit(camera.orbit)
    if ('error' in orbit) return orbit
    sessionCamera.orbit = orbit
  }
  if (camera.up !== undefined) {
    if (!isTriple(camera.up)) return { error: 'camera up must be [x,y,z]' }
    sessionCamera.up = camera.up
  }
  if (camera.quaternion !== undefined) {
    if (!isQuad(camera.quaternion)) return { error: 'camera quaternion must be [x,y,z,w]' }
    sessionCamera.quaternion = camera.quaternion
  }
  const payload: ModelSessionPayload = {
    kind: MODEL_SESSION_KIND,
    assetId: obj.assetId,
    camera: sessionCamera,
    view,
    annotations: nested.annotations,
    selectedId,
  }
  if (obj.model !== undefined) {
    if (!obj.model || typeof obj.model !== 'object') return { error: 'model must be an object' }
    const model = obj.model as Record<string, unknown>
    if (!isTriple(model.position) || !isTriple(model.rotation) || !isTriple(model.scale) || !isQuad(model.quaternion)) {
      return { error: 'model needs position, rotation, scale [x,y,z] and quaternion [x,y,z,w]' }
    }
    payload.model = {
      position: model.position,
      rotation: model.rotation,
      scale: model.scale,
      quaternion: model.quaternion,
    }
  }
  if (obj.lastHit !== undefined) {
    if (!obj.lastHit || typeof obj.lastHit !== 'object') return { error: 'lastHit must be an object' }
    payload.lastHit = obj.lastHit as HitPayload
  }
  return payload
}

export function serializeSessionPayload(payload: ModelSessionPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`
}
