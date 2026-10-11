import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { getWebglAsset } from './assetManifest'
import { bakedAnnotationDoc } from './assetDocs'
import { WEBGL_SCENES } from './sceneManifest'
import landing from './scenes/landing.json'
import about from './scenes/about.json'
import projects from './scenes/projects.json'
import footer from './scenes/footer.json'
import type { AssetAnnotation } from './assetAnnotations'
import { homeViewPose, poseForAnnotation, VIEW_HOME_MARK_ID, type ViewPose } from './viewPose'

const _objectPos = new Vector3()
const _objectQuat = new Quaternion()
const _objectScl = new Vector3()
const _objectMat = new Matrix4()
const _objectEul = new Euler()
const _worldPt = new Vector3()
const _worldDir = new Vector3()

export type SceneVec3 = [number, number, number]

export type SceneOrbit = {
  azimuth: number
  polar: number
  radius: number
}

export const SCENE_NOISE_KINDS = ['off', 'film', 'white', 'simplex'] as const

export type SceneNoiseKind = (typeof SCENE_NOISE_KINDS)[number]

/** Optical look — DoF / edge falloff plus optional grain. Pose stays on position/target. */
export type SceneCameraLook = {
  /** 0 = razor, 1 = heavy bokeh and edge dampen */
  focus: number
  /** 35mm-equivalent millimetres. Longer = shallower plane. */
  focalLength: number
  /** Metres to the sharp plane. 0 = track the orbit look-at. */
  focalDistance: number
  noise: SceneNoiseKind
  /** 0–1 grain amount */
  grain: number
}

/** Scene editor Focus slider max — heavy bokeh / edge dampen. */
export const SCENE_LOOK_FOCUS_MAX = 1
/** Scene editor Lens slider max (35mm-equivalent millimetres). */
export const SCENE_LOOK_FOCAL_LENGTH_MAX = 135

export const DEFAULT_SCENE_LOOK: SceneCameraLook = {
  focus: SCENE_LOOK_FOCUS_MAX,
  focalLength: SCENE_LOOK_FOCAL_LENGTH_MAX,
  focalDistance: 0,
  noise: 'off',
  grain: 0,
}

/** Optical look matching the model viewer — razor, no composer. */
export const VIEWER_SCENE_LOOK: SceneCameraLook = {
  focus: 0,
  focalLength: 45,
  focalDistance: 0,
  noise: 'off',
  grain: 0,
}

/** Ambient camera motion — pointer pan/tilt on top of the orbit rest pose. */
export type SceneCameraAcm = {
  /** 0 = still, 1 = full peek. */
  intensity: number
  /** True: no free orbit/zoom; ACM only rotates/pans to a max around Home. */
  lock: boolean
}

export const SCENE_ACM_INTENSITY_MAX = 1

export const DEFAULT_SCENE_ACM: SceneCameraAcm = {
  intensity: 0,
  lock: false,
}

export type SceneCamera = {
  position: SceneVec3
  target: SceneVec3
  orbit?: SceneOrbit
  up?: SceneVec3
  quaternion?: [number, number, number, number]
  /** When set, Home is that asset's baked `viewpoint-home` (model-viewer Home). */
  homeFromAsset?: string
  look: SceneCameraLook
  acm: SceneCameraAcm
}

export type SceneObject = {
  id: string
  assetId: string
  notes?: string
  position: SceneVec3
  rotation: SceneVec3
  scale: SceneVec3
  /** Optional per-object lamp gain. Text uses this; otherwise the scene `view.lightGain`. */
  lightGain?: number
}

export type SceneView = {
  lightColor: string
  meshColor: string
  lightGain: number
  scatter: number
}

/** Reserved — playback is not wired yet. */
export type SceneTransition = {
  id: string
  notes?: string
}

export const SCENE_MOTION_KINDS = ['boom-arc', 'journey'] as const

export type SceneMotionKind = (typeof SCENE_MOTION_KINDS)[number]

/** Copied orbit still on a crane — look-at + spherical heading, not a world-XYZ chord. */
export type SceneMotionWaypoint = {
  target: SceneVec3
  orbit: SceneOrbit
}

/** Baked camera animation. `from` / `to` are Home (`home`) or a viewpoint id. */
export type SceneCameraMotion = {
  id: string
  label: string
  notes?: string
  kind: SceneMotionKind
  from: string
  to: string
  duration?: number
  hold?: number
  slowMoAt?: number
  impulseAt?: number
  waypoints?: SceneMotionWaypoint[]
  playOnLoad?: boolean
  /** Play the `from`→`to` boom-arc backward (close inset expands onto the arch before yawing). */
  reverse?: boolean
}

/** Scene-level camera shot. `position` is the selectable pin in the scene; `camera` is the eye. */
export type SceneViewpoint = {
  id: string
  label: string
  notes?: string
  /** Independently triggerable text-display framing. Not Home and not a crane waypoint. */
  role?: SceneViewRole
  position: SceneVec3
  camera: SceneVec3
  target: SceneVec3
  orbit?: SceneOrbit
  up?: SceneVec3
}

export const SCENE_HOME_VIEW_ID = 'home'
export const SCENE_VIEW_ROLES = ['copy'] as const
export type SceneViewRole = (typeof SCENE_VIEW_ROLES)[number]

export type SceneDoc = {
  id: string
  label: string
  notes?: string
  objects: SceneObject[]
  camera: SceneCamera
  view: SceneView
  viewpoints: SceneViewpoint[]
  transitions: SceneTransition[]
  cameraMotions: SceneCameraMotion[]
}

const RAW_DOCS: Record<string, unknown> = {
  landing,
  about,
  projects,
  footer,
}

const IDENTITY: SceneVec3 = [0, 0, 0]
const UNIT: SceneVec3 = [1, 1, 1]
const COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

function isTriple(value: unknown): value is SceneVec3 {
  return Array.isArray(value) && value.length === 3 && value.every((n) => typeof n === 'number' && Number.isFinite(n))
}

function isQuad(value: unknown): value is [number, number, number, number] {
  return Array.isArray(value) && value.length === 4 && value.every((n) => typeof n === 'number' && Number.isFinite(n))
}

function tripleOr(value: unknown, fallback: SceneVec3): SceneVec3 | { error: string } {
  if (value === undefined) return [...fallback]
  if (!isTriple(value)) return { error: 'expected [x,y,z]' }
  return value
}

function parseOrbit(value: unknown): SceneOrbit | undefined | { error: string } {
  if (value === undefined) return undefined
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

function parseObject(raw: unknown, index: number): SceneObject | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: `objects[${index}] must be an object` }
  const row = raw as Record<string, unknown>
  if (typeof row.id !== 'string' || !row.id.trim()) return { error: `objects[${index}].id is required` }
  if (typeof row.assetId !== 'string' || !row.assetId.trim()) {
    return { error: `objects[${index}].assetId is required` }
  }
  if (!getWebglAsset(row.assetId)) return { error: `objects[${index}] unknown asset ${row.assetId}` }
  const position = tripleOr(row.position, IDENTITY)
  if ('error' in position) return { error: `objects[${index}].position ${position.error}` }
  const rotation = tripleOr(row.rotation, IDENTITY)
  if ('error' in rotation) return { error: `objects[${index}].rotation ${rotation.error}` }
  const scale = tripleOr(row.scale, UNIT)
  if ('error' in scale) return { error: `objects[${index}].scale ${scale.error}` }
  let lightGain: number | undefined
  if (row.lightGain !== undefined) {
    if (typeof row.lightGain !== 'number' || !Number.isFinite(row.lightGain) || row.lightGain < 0 || row.lightGain > 3) {
      return { error: `objects[${index}].lightGain must be 0–3` }
    }
    lightGain = row.lightGain
  }
  return {
    id: row.id,
    assetId: row.assetId,
    notes: typeof row.notes === 'string' ? row.notes : undefined,
    position,
    rotation,
    scale,
    lightGain,
  }
}

function parseLook(raw: unknown): SceneCameraLook | { error: string } {
  if (raw === undefined) return { ...DEFAULT_SCENE_LOOK }
  if (!raw || typeof raw !== 'object') return { error: 'camera.look must be an object' }
  const row = raw as Record<string, unknown>
  const noise = row.noise === undefined ? DEFAULT_SCENE_LOOK.noise : row.noise
  if (typeof noise !== 'string' || !SCENE_NOISE_KINDS.includes(noise as SceneNoiseKind)) {
    return { error: 'camera.look.noise must be off, film, white, or simplex' }
  }
  const num = (value: unknown, fallback: number, min: number, max: number): number | { error: string } => {
    if (value === undefined) return fallback
    if (typeof value !== 'number' || !Number.isFinite(value)) return { error: 'expected a finite number' }
    return Math.min(max, Math.max(min, value))
  }
  const focus = num(row.focus, DEFAULT_SCENE_LOOK.focus, 0, 1)
  if (typeof focus !== 'number') return { error: `camera.look.focus ${focus.error}` }
  const focalLength = num(row.focalLength, DEFAULT_SCENE_LOOK.focalLength, 18, 200)
  if (typeof focalLength !== 'number') return { error: `camera.look.focalLength ${focalLength.error}` }
  const focalDistance = num(row.focalDistance, DEFAULT_SCENE_LOOK.focalDistance, 0, 40)
  if (typeof focalDistance !== 'number') return { error: `camera.look.focalDistance ${focalDistance.error}` }
  const grain = num(row.grain, DEFAULT_SCENE_LOOK.grain, 0, 1)
  if (typeof grain !== 'number') return { error: `camera.look.grain ${grain.error}` }
  return { focus, focalLength, focalDistance, noise: noise as SceneNoiseKind, grain }
}

function parseAcm(raw: unknown): SceneCameraAcm | { error: string } {
  if (raw === undefined) return { ...DEFAULT_SCENE_ACM }
  if (!raw || typeof raw !== 'object') return { error: 'camera.acm must be an object' }
  const row = raw as Record<string, unknown>
  if (row.intensity === undefined) return { ...DEFAULT_SCENE_ACM }
  if (typeof row.intensity !== 'number' || !Number.isFinite(row.intensity)) {
    return { error: 'camera.acm.intensity must be a finite number' }
  }
  if (row.lock !== undefined && typeof row.lock !== 'boolean') {
    return { error: 'camera.acm.lock must be a boolean' }
  }
  return {
    intensity: Math.min(SCENE_ACM_INTENSITY_MAX, Math.max(0, row.intensity)),
    lock: row.lock === undefined ? DEFAULT_SCENE_ACM.lock : row.lock,
  }
}

function parseHomeFromAsset(raw: unknown): string | undefined | { error: string } {
  if (raw === undefined) return undefined
  if (typeof raw !== 'string' || !raw.trim()) return { error: 'camera.homeFromAsset must name a registered asset' }
  if (!getWebglAsset(raw)) return { error: `camera.homeFromAsset unknown asset ${raw}` }
  const baked = bakedAnnotationDoc(raw)
  if ('error' in baked) return { error: `camera.homeFromAsset ${baked.error}` }
  const home = baked.annotations.find((mark) => mark.id === VIEW_HOME_MARK_ID && mark.kind === 'viewpoint')
  if (!home || (!home.camera && !home.orbit)) {
    return { error: 'camera.homeFromAsset needs a baked viewpoint-home' }
  }
  return raw
}

function parseCamera(raw: unknown): SceneCamera | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'camera is required' }
  const row = raw as Record<string, unknown>
  if (!isTriple(row.position)) return { error: 'camera.position must be [x,y,z]' }
  if (!isTriple(row.target)) return { error: 'camera.target must be [x,y,z]' }
  const orbit = parseOrbit(row.orbit)
  if (orbit && 'error' in orbit) return orbit
  const up = row.up === undefined ? undefined : tripleOr(row.up, [0, 1, 0])
  if (up && 'error' in up) return { error: `camera.up ${up.error}` }
  if (row.quaternion !== undefined && !isQuad(row.quaternion)) {
    return { error: 'camera.quaternion must be [x,y,z,w]' }
  }
  const homeFromAsset = parseHomeFromAsset(row.homeFromAsset)
  if (homeFromAsset && typeof homeFromAsset === 'object' && 'error' in homeFromAsset) return homeFromAsset
  const look = parseLook(row.look)
  if ('error' in look) return look
  const acm = parseAcm(row.acm)
  if ('error' in acm) return acm
  return {
    position: row.position,
    target: row.target,
    orbit,
    up,
    quaternion: isQuad(row.quaternion) ? [...row.quaternion] : undefined,
    homeFromAsset,
    look,
    acm,
  }
}

function parseView(raw: unknown): SceneView | { error: string } {
  if (!raw || typeof raw !== 'object') {
    return { lightColor: '#f2c48a', meshColor: '#000000', lightGain: 0.05, scatter: 1.5 }
  }
  const row = raw as Record<string, unknown>
  const lightColor = typeof row.lightColor === 'string' ? row.lightColor : '#f2c48a'
  const meshColor = typeof row.meshColor === 'string' ? row.meshColor : '#000000'
  if (!COLOR_RE.test(lightColor) || !COLOR_RE.test(meshColor)) return { error: 'view colors must be #rgb or #rrggbb' }
  const lightGain = typeof row.lightGain === 'number' && Number.isFinite(row.lightGain) ? row.lightGain : 0.05
  const scatter = typeof row.scatter === 'number' && Number.isFinite(row.scatter) ? row.scatter : 1.5
  return { lightColor, meshColor, lightGain, scatter }
}

function parseViewpoint(raw: unknown, index: number): SceneViewpoint | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: `viewpoints[${index}] must be an object` }
  const row = raw as Record<string, unknown>
  if (typeof row.id !== 'string' || !row.id.trim()) return { error: `viewpoints[${index}].id is required` }
  if (row.id === SCENE_HOME_VIEW_ID) return { error: `viewpoints[${index}] must not reuse the Home id` }
  if (typeof row.label !== 'string' || !row.label.trim()) return { error: `viewpoints[${index}].label is required` }
  let role: SceneViewRole | undefined
  if (row.role !== undefined) {
    if (typeof row.role !== 'string' || !SCENE_VIEW_ROLES.includes(row.role as SceneViewRole)) {
      return { error: `viewpoints[${index}].role must be copy` }
    }
    role = row.role as SceneViewRole
  }
  if (!isTriple(row.position)) return { error: `viewpoints[${index}].position must be [x,y,z]` }
  if (!isTriple(row.camera)) return { error: `viewpoints[${index}].camera must be [x,y,z]` }
  if (!isTriple(row.target)) return { error: `viewpoints[${index}].target must be [x,y,z]` }
  const orbit = parseOrbit(row.orbit)
  if (orbit && 'error' in orbit) return { error: `viewpoints[${index}].orbit ${orbit.error}` }
  const up = row.up === undefined ? undefined : tripleOr(row.up, [0, 1, 0])
  if (up && 'error' in up) return { error: `viewpoints[${index}].up ${up.error}` }
  return {
    id: row.id,
    label: row.label,
    notes: typeof row.notes === 'string' ? row.notes : undefined,
    role,
    position: row.position,
    camera: row.camera,
    target: row.target,
    orbit,
    up,
  }
}

function parseViewpoints(raw: unknown): SceneViewpoint[] | { error: string } {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) return { error: 'viewpoints must be an array' }
  const rows: SceneViewpoint[] = []
  const seen = new Set<string>()
  for (const [index, item] of raw.entries()) {
    const parsed = parseViewpoint(item, index)
    if ('error' in parsed) return parsed
    if (seen.has(parsed.id)) return { error: `viewpoints duplicate id ${parsed.id}` }
    seen.add(parsed.id)
    rows.push(parsed)
  }
  return rows
}

function parseNamedList(raw: unknown, field: string): { id: string; notes?: string }[] | { error: string } {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) return { error: `${field} must be an array` }
  const rows: { id: string; notes?: string }[] = []
  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== 'object') return { error: `${field}[${index}] must be an object` }
    const row = item as Record<string, unknown>
    if (typeof row.id !== 'string' || !row.id.trim()) return { error: `${field}[${index}].id is required` }
    rows.push({ id: row.id, notes: typeof row.notes === 'string' ? row.notes : undefined })
  }
  return rows
}

function viewIdsOf(viewpoints: SceneViewpoint[]): Set<string> {
  const ids = new Set<string>([SCENE_HOME_VIEW_ID])
  for (const view of viewpoints) ids.add(view.id)
  return ids
}

function parseMotionWaypoints(
  raw: unknown,
  motionIndex: number,
): SceneMotionWaypoint[] | { error: string } {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) return { error: `cameraMotions[${motionIndex}].waypoints must be an array` }
  const rows: SceneMotionWaypoint[] = []
  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== 'object') {
      return { error: `cameraMotions[${motionIndex}].waypoints[${index}] must be an object` }
    }
    const row = item as Record<string, unknown>
    if (!isTriple(row.target)) {
      return { error: `cameraMotions[${motionIndex}].waypoints[${index}].target must be [x,y,z]` }
    }
    const orbit = parseOrbit(row.orbit)
    if (!orbit || 'error' in orbit) {
      return {
        error: `cameraMotions[${motionIndex}].waypoints[${index}].orbit needs finite azimuth, polar, and radius > 0`,
      }
    }
    rows.push({ target: row.target, orbit })
  }
  return rows
}

function parseCameraMotions(
  raw: unknown,
  viewpoints: SceneViewpoint[],
): SceneCameraMotion[] | { error: string } {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) return { error: 'cameraMotions must be an array' }
  const rows: SceneCameraMotion[] = []
  const seen = new Set<string>()
  const views = viewIdsOf(viewpoints)
  let loadCount = 0
  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== 'object') return { error: `cameraMotions[${index}] must be an object` }
    const row = item as Record<string, unknown>
    if (typeof row.id !== 'string' || !row.id.trim()) return { error: `cameraMotions[${index}].id is required` }
    if (seen.has(row.id)) return { error: `cameraMotions duplicate id ${row.id}` }
    seen.add(row.id)
    if (typeof row.label !== 'string' || !row.label.trim()) {
      return { error: `cameraMotions[${index}].label is required` }
    }
    if (typeof row.kind !== 'string' || !SCENE_MOTION_KINDS.includes(row.kind as SceneMotionKind)) {
      return { error: `cameraMotions[${index}].kind must be boom-arc or journey` }
    }
    if (typeof row.from !== 'string' || !views.has(row.from)) {
      return { error: `cameraMotions[${index}].from must be Home or a viewpoint id` }
    }
    if (typeof row.to !== 'string' || !views.has(row.to)) {
      return { error: `cameraMotions[${index}].to must be Home or a viewpoint id` }
    }
    if (row.from === row.to) return { error: `cameraMotions[${index}] from and to must differ` }
    let duration: number | undefined
    if (row.duration !== undefined) {
      if (typeof row.duration !== 'number' || !Number.isFinite(row.duration) || row.duration <= 0) {
        return { error: `cameraMotions[${index}].duration must be > 0` }
      }
      duration = row.duration
    }
    let hold: number | undefined
    if (row.hold !== undefined) {
      if (typeof row.hold !== 'number' || !Number.isFinite(row.hold) || row.hold < 0) {
        return { error: `cameraMotions[${index}].hold must be >= 0` }
      }
      hold = row.hold
    }
    let slowMoAt: number | undefined
    if (row.slowMoAt !== undefined) {
      if (typeof row.slowMoAt !== 'number' || !Number.isFinite(row.slowMoAt) || row.slowMoAt <= 0 || row.slowMoAt >= 1) {
        return { error: `cameraMotions[${index}].slowMoAt must be between 0 and 1` }
      }
      slowMoAt = row.slowMoAt
    }
    let impulseAt: number | undefined
    if (row.impulseAt !== undefined) {
      if (typeof row.impulseAt !== 'number' || !Number.isFinite(row.impulseAt) || row.impulseAt < 0 || row.impulseAt > 1) {
        return { error: `cameraMotions[${index}].impulseAt must be between 0 and 1` }
      }
      impulseAt = row.impulseAt
    }
    const waypoints = parseMotionWaypoints(row.waypoints, index)
    if ('error' in waypoints) return waypoints
    const playOnLoad = row.playOnLoad === true
    if (playOnLoad) loadCount += 1
    if (loadCount > 1) return { error: 'only one cameraMotion may playOnLoad' }
    if (row.reverse !== undefined && row.reverse !== true && row.reverse !== false) {
      return { error: `cameraMotions[${index}].reverse must be a boolean` }
    }
    const reverse = row.reverse === true || undefined
    rows.push({
      id: row.id,
      label: row.label,
      notes: typeof row.notes === 'string' ? row.notes : undefined,
      kind: row.kind as SceneMotionKind,
      from: row.from,
      to: row.to,
      duration,
      hold,
      slowMoAt,
      impulseAt,
      waypoints: waypoints.length > 0 ? waypoints : undefined,
      playOnLoad: playOnLoad || undefined,
      reverse,
    })
  }
  return rows
}

export function parseSceneDoc(raw: unknown): SceneDoc | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'scene doc must be an object' }
  const obj = raw as Record<string, unknown>
  if (typeof obj.id !== 'string' || !obj.id.trim()) return { error: 'id is required' }
  if (typeof obj.label !== 'string' || !obj.label.trim()) return { error: 'label is required' }
  if (!Array.isArray(obj.objects) || obj.objects.length < 1) return { error: 'objects must have at least one entry' }
  const objects: SceneObject[] = []
  for (const [index, item] of obj.objects.entries()) {
    const parsed = parseObject(item, index)
    if ('error' in parsed) return parsed
    objects.push(parsed)
  }
  const camera = parseCamera(obj.camera)
  if ('error' in camera) return camera
  const view = parseView(obj.view)
  if ('error' in view) return view
  const viewpoints = parseViewpoints(obj.viewpoints)
  if ('error' in viewpoints) return viewpoints
  const transitions = parseNamedList(obj.transitions, 'transitions')
  if ('error' in transitions) return transitions
  const cameraMotions = parseCameraMotions(obj.cameraMotions, viewpoints)
  if ('error' in cameraMotions) return cameraMotions
  return {
    id: obj.id,
    label: obj.label,
    notes: typeof obj.notes === 'string' ? obj.notes : undefined,
    objects,
    camera,
    view,
    viewpoints,
    transitions,
    cameraMotions,
  }
}

export function bakedSceneDoc(sceneId: string): SceneDoc | { error: string } {
  const raw = RAW_DOCS[sceneId]
  if (raw === undefined) return { error: `no baked scene for ${sceneId}` }
  const doc = parseSceneDoc(raw)
  if ('error' in doc) return doc
  if (doc.id !== sceneId) return { error: `baked scene id ${doc.id} does not match ${sceneId}` }
  return doc
}

export function bakedSceneIds(): string[] {
  return Object.keys(RAW_DOCS)
}

export function sceneCatalogAligned(): { error: string } | true {
  const listed = WEBGL_SCENES.map((scene) => scene.id).sort()
  const baked = bakedSceneIds().sort()
  if (listed.join('|') !== baked.join('|')) {
    return { error: 'WEBGL_SCENES and baked scene JSON ids must match' }
  }
  return true
}

function poseFromSceneHome(camera: SceneCamera): ViewPose {
  if (camera.homeFromAsset) {
    const baked = bakedAnnotationDoc(camera.homeFromAsset)
    if (!('error' in baked)) return homeViewPose(baked.annotations)
  }
  return {
    position: [...camera.position],
    target: [...camera.target],
    orbit: camera.orbit ? { ...camera.orbit } : undefined,
    up: camera.up ? [...camera.up] : [0, 1, 0],
    quaternion: camera.quaternion ? [...camera.quaternion] : undefined,
  }
}

function worldFromObjectPose(
  local: [number, number, number],
  object: SceneObject,
  asDirection = false,
): [number, number, number] {
  _objectEul.set(object.rotation[0], object.rotation[1], object.rotation[2], 'XYZ')
  _objectQuat.setFromEuler(_objectEul)
  _objectMat.compose(
    _objectPos.set(object.position[0], object.position[1], object.position[2]),
    _objectQuat,
    _objectScl.set(object.scale[0], object.scale[1], object.scale[2]),
  )
  if (asDirection) {
    _worldDir.set(local[0], local[1], local[2]).transformDirection(_objectMat).normalize()
    return [_worldDir.x, _worldDir.y, _worldDir.z]
  }
  _worldPt.set(local[0], local[1], local[2]).applyMatrix4(_objectMat)
  return [_worldPt.x, _worldPt.y, _worldPt.z]
}

/** Asset `kind: point` marks in scene space. Viewpoints with the same label stay camera shots. */
export function sceneInspectMarks(doc: SceneDoc): AssetAnnotation[] {
  const taken = new Set(doc.viewpoints.map((view) => view.label.trim().toLowerCase()))
  const marks: AssetAnnotation[] = []
  for (const object of doc.objects) {
    const baked = bakedAnnotationDoc(object.assetId)
    if ('error' in baked) continue
    for (const mark of baked.annotations) {
      if (mark.kind !== 'point') continue
      if (taken.has(mark.label.trim().toLowerCase())) continue
      const position = worldFromObjectPose(mark.position, object)
      const normal = mark.normal ? worldFromObjectPose(mark.normal, object, true) : undefined
      marks.push({
        ...mark,
        position,
        normal,
      })
    }
  }
  return marks
}

export function sceneViewPose(doc: SceneDoc, viewId = SCENE_HOME_VIEW_ID): ViewPose {
  if (viewId !== SCENE_HOME_VIEW_ID) {
    const row = doc.viewpoints.find((view) => view.id === viewId)
    if (row) {
      return {
        position: [...row.camera],
        target: [...row.target],
        orbit: row.orbit ? { ...row.orbit } : undefined,
        up: row.up ? [...row.up] : [0, 1, 0],
      }
    }
    const inspect = sceneInspectMarks(doc).find((mark) => mark.id === viewId)
    if (inspect) return poseForAnnotation(inspect)
  }
  return poseFromSceneHome(doc.camera)
}

export const SCENE_SESSION_KIND = 'webgl-scene-session'

export type SceneSessionPayload = {
  kind: typeof SCENE_SESSION_KIND
  sceneId: string
  camera: {
    position: SceneVec3
    target: SceneVec3
    orbit?: SceneOrbit
    up?: SceneVec3
    quaternion?: [number, number, number, number]
  }
  look: SceneCameraLook
  acm: SceneCameraAcm
}

export function serializeSceneSession(payload: SceneSessionPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`
}

export function parseSceneSession(raw: unknown): SceneSessionPayload | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'session must be an object' }
  const row = raw as Record<string, unknown>
  if (row.kind !== SCENE_SESSION_KIND) return { error: 'kind must be webgl-scene-session' }
  if (typeof row.sceneId !== 'string' || !row.sceneId.trim()) return { error: 'sceneId is required' }
  if (!row.camera || typeof row.camera !== 'object') return { error: 'camera is required' }
  const camera = row.camera as Record<string, unknown>
  if (!isTriple(camera.position)) return { error: 'camera.position must be [x,y,z]' }
  if (!isTriple(camera.target)) return { error: 'camera.target must be [x,y,z]' }
  const orbit = parseOrbit(camera.orbit)
  if (orbit && 'error' in orbit) return { error: `camera.orbit ${orbit.error}` }
  const up = camera.up === undefined ? undefined : tripleOr(camera.up, [0, 1, 0])
  if (up && 'error' in up) return { error: `camera.up ${up.error}` }
  const look = parseLook(row.look)
  if ('error' in look) return look
  const acm = parseAcm(row.acm)
  if ('error' in acm) return acm
  const quaternion = camera.quaternion
  let quat: [number, number, number, number] | undefined
  if (quaternion !== undefined) {
    if (
      !Array.isArray(quaternion) ||
      quaternion.length !== 4 ||
      !quaternion.every((n) => typeof n === 'number' && Number.isFinite(n))
    ) {
      return { error: 'camera.quaternion must be [x,y,z,w]' }
    }
    quat = [quaternion[0], quaternion[1], quaternion[2], quaternion[3]]
  }
  return {
    kind: SCENE_SESSION_KIND,
    sceneId: row.sceneId,
    camera: {
      position: [...camera.position],
      target: [...camera.target],
      orbit,
      up: up ? [...up] : undefined,
      quaternion: quat,
    },
    look,
    acm,
  }
}

export function sceneViewpointMarks(doc: SceneDoc): AssetAnnotation[] {
  const homePose = sceneViewPose(doc)
  const home: AssetAnnotation = {
    id: SCENE_HOME_VIEW_ID,
    kind: 'viewpoint',
    label: 'Home',
    position: [...homePose.target],
    camera: [...homePose.position],
    target: [...homePose.target],
    orbit: homePose.orbit ? { ...homePose.orbit } : undefined,
    up: homePose.up ? [...homePose.up] : undefined,
    quaternion: homePose.quaternion ? [...homePose.quaternion] : undefined,
  }
  const rest = doc.viewpoints.map((view): AssetAnnotation => ({
    id: view.id,
    kind: 'viewpoint',
    label: view.label,
    position: [view.position[0], view.position[1], view.position[2]],
    camera: [view.camera[0], view.camera[1], view.camera[2]],
    target: [view.target[0], view.target[1], view.target[2]],
    orbit: view.orbit ? { ...view.orbit } : undefined,
    up: view.up ? [view.up[0], view.up[1], view.up[2]] : undefined,
  }))
  return [home, ...rest, ...sceneInspectMarks(doc)]
}

/** Independently triggerable text-display shots. Not Home and not crane Path waypoints. */
export function sceneCopyViews(doc: SceneDoc): SceneViewpoint[] {
  return doc.viewpoints.filter((view) => view.role === 'copy')
}

export function sceneLoadMotion(doc: SceneDoc): SceneCameraMotion | undefined {
  return doc.cameraMotions.find((motion) => motion.playOnLoad)
}

export function sceneMotionById(doc: SceneDoc, id: string): SceneCameraMotion | undefined {
  return doc.cameraMotions.find((motion) => motion.id === id)
}

function boomArcHasPath(motion: SceneCameraMotion): boolean {
  return (motion.waypoints?.length ?? 0) > 0
}

/**
 * View hop between two seated shots. Skips the load crane, skips a `journey`
 * (Play reseats `from` then lerpPose — View stays ViewpointFly from the live
 * camera), and skips a boom-arc that has no copied Path — empty stills yaw
 * around `from` until late in the shot, then dump into `to` (the Home → copy
 * bug).
 */
export function sceneMotionBetween(doc: SceneDoc, fromId: string, toId: string): SceneCameraMotion | undefined {
  if (!fromId || !toId || fromId === toId) return undefined
  return doc.cameraMotions.find((motion) => {
    if (motion.from !== fromId || motion.to !== toId || motion.playOnLoad) return false
    if (motion.kind === 'journey') return false
    if (motion.kind === 'boom-arc' && !boomArcHasPath(motion)) return false
    return true
  })
}

/** Seat pose when the scene opens — load motion start, otherwise Home. */
export function sceneOpeningPose(doc: SceneDoc): ViewPose {
  const load = sceneLoadMotion(doc)
  return sceneViewPose(doc, load?.from ?? SCENE_HOME_VIEW_ID)
}
