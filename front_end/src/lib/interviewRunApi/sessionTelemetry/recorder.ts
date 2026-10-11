/**
 * Session telemetry — dwell, network, on-stage pointer trail, typed WPM.
 * Gate-only. Not Verify playback. Pointer/focus events are not stored (event cap).
 */
import {
  pauseSessionProbeHeartbeat,
  resumeSessionProbeHeartbeat,
  setSessionProbePhase,
  stopSessionProbeHeartbeat,
} from '../sessionProbe/heartbeat'
import { ensureSessionTelemetry, saveSessionTelemetry } from './store'
import { recordTypedInsert, resetTypingBursts, sittingTypedWpm, syncTypingLive } from './typing'
import type {
  SessionTelemetry,
  SessionTelemetryDigest,
  SessionTelemetryEvent,
  SessionTelemetryEventKind,
  SessionTelemetryPointerPoint,
  SessionTelemetryStartInput,
  SessionTelemetrySurface,
} from './types'
import { POINTER_TRAIL_CAP } from './types'

export const TELEMETRY_TICK_MS = 250
export const TELEMETRY_MAX_EVENTS = 200

type LiveSession = {
  briefId: string
  attemptId: string
  phaseId: string
  lastTick: number
  visible: boolean
  online: boolean
  /** True on landing / Finished — do not grow visibleMs between gates. */
  paused: boolean
  dictationOn: boolean
  pointerEditor: boolean
  pointerTalk: boolean
  pointerAssist: boolean
  focusEditor: boolean
  focusTalk: boolean
  focusAssist: boolean
  lastPointer: { x: number; y: number; surface: SessionTelemetrySurface } | null
  unbind: Array<() => void>
  interval: ReturnType<typeof setInterval> | null
}

let live: LiveSession | null = null
let clockNow = (): number => Date.now()

export function setTelemetryClockForTests(now: (() => number) | null): void {
  clockNow = now ?? (() => Date.now())
}

function syncGuards(): void {
  syncTypingLive({
    briefId: live?.briefId ?? '',
    attemptId: live?.attemptId ?? '',
    paused: live?.paused ?? true,
    dictationOn: live?.dictationOn ?? false,
  })
}

export function resetTelemetrySession(): void {
  if (live?.interval) clearInterval(live.interval)
  for (const fn of live?.unbind ?? []) {
    try {
      fn()
    } catch {
      /* ignore */
    }
  }
  live = null
  stopSessionProbeHeartbeat()
  resetTypingBursts()
  syncGuards()
}

export function peekTelemetrySession(): LiveSession | null {
  return live
}

function pushEvent(doc: SessionTelemetry, event: SessionTelemetryEvent): SessionTelemetry {
  if (doc.events.length >= TELEMETRY_MAX_EVENTS) return doc
  return { ...doc, events: [...doc.events, event] }
}

const POINTER_KINDS = new Set<SessionTelemetryEventKind>([
  'pointer_in',
  'pointer_out',
  'focus_in',
  'focus_out',
])

function record(
  kind: SessionTelemetryEventKind,
  surface?: SessionTelemetrySurface,
  extra?: { charCount?: number; note?: string },
): void {
  if (!live) return
  if (POINTER_KINDS.has(kind)) return
  const doc = ensureSessionTelemetry(live.briefId, live.attemptId)
  const t = Math.max(0, clockNow() - Date.parse(doc.startedAt) || 0)
  saveSessionTelemetry(
    pushEvent(doc, {
      t,
      phaseId: live.phaseId,
      kind,
      ...(surface ? { surface } : {}),
      ...(typeof extra?.charCount === 'number' ? { charCount: extra.charCount } : {}),
      ...(extra?.note ? { note: extra.note } : {}),
    }),
  )
}

/** Sitting policy / extra facts. No-ops when telemetry is paused or missing. */
export function recordSessionTelemetryEvent(
  kind: SessionTelemetryEventKind,
  extra?: { note?: string },
): void {
  record(kind, undefined, extra)
}

/** Gate-only. No-ops when no live telemetry (creator board). Never stores audio. */
export function recordDictationSession(
  kind: 'dictation_start' | 'dictation_stop',
  input?: { surface?: SessionTelemetrySurface; charCount?: number },
): void {
  if (live) {
    live.dictationOn = kind === 'dictation_start'
    syncGuards()
  }
  record(kind, input?.surface, { charCount: input?.charCount })
}

function inEditor(): boolean {
  return Boolean(live && (live.pointerEditor || live.focusEditor))
}

function inTalk(): boolean {
  return Boolean(live && (live.pointerTalk || live.focusTalk))
}

function inAssist(): boolean {
  return Boolean(live && (live.pointerAssist || live.focusAssist))
}

function pointerOnStage(): boolean {
  return Boolean(
    live && (live.pointerEditor || live.pointerTalk || live.pointerAssist),
  )
}

function downsampleTrail(points: SessionTelemetryPointerPoint[]): SessionTelemetryPointerPoint[] {
  if (points.length <= POINTER_TRAIL_CAP) return points
  const keep = Math.ceil(points.length / POINTER_TRAIL_CAP)
  const out: SessionTelemetryPointerPoint[] = []
  for (let i = 0; i < points.length; i += keep) out.push(points[i]!)
  return out.slice(-POINTER_TRAIL_CAP)
}

function appendTrailSample(doc: SessionTelemetry, now: number): SessionTelemetry {
  if (!live || live.paused || !pointerOnStage() || !live.lastPointer) return doc
  const origin = Date.parse(doc.startedAt)
  const t = Number.isFinite(origin) ? Math.max(0, now - origin) : 0
  const point: SessionTelemetryPointerPoint = {
    t,
    phaseId: live.phaseId,
    x: live.lastPointer.x,
    y: live.lastPointer.y,
  }
  return {
    ...doc,
    pointerTrail: downsampleTrail([...(doc.pointerTrail ?? []), point]),
  }
}

function tick(now = clockNow()): void {
  if (!live) return
  const dt = Math.max(0, now - live.lastTick)
  live.lastTick = now
  if (live.paused) return
  if (dt <= 0 || dt > 5_000) return
  const doc = ensureSessionTelemetry(live.briefId, live.attemptId)
  let next = { ...doc, dwellByPhase: { ...(doc.dwellByPhase ?? {}) } }
  if (live.visible) {
    next.visibleMs += dt
    if (inEditor()) next.inEditorMs += dt
    if (inTalk() || inAssist()) next.inTalkMs += dt
    if (!live.online) next.offlineMs += dt
    const prev = next.dwellByPhase[live.phaseId] ?? {
      visibleMs: 0,
      inEditorMs: 0,
      inTalkMs: 0,
    }
    next.dwellByPhase[live.phaseId] = {
      visibleMs: prev.visibleMs + dt,
      inEditorMs: prev.inEditorMs + (inEditor() ? dt : 0),
      inTalkMs: prev.inTalkMs + (inTalk() || inAssist() ? dt : 0),
    }
  }
  saveSessionTelemetry(appendTrailSample(next, now))
}

export function startSessionTelemetry(input: SessionTelemetryStartInput): SessionTelemetry {
  resetTelemetrySession()
  const doc = ensureSessionTelemetry(input.briefId, input.attemptId)
  if (input.attemptId && doc.attemptId !== input.attemptId) {
    saveSessionTelemetry({ ...doc, attemptId: input.attemptId })
  }
  const online =
    typeof navigator === 'undefined' ? true : navigator.onLine !== false
  const visible =
    typeof document === 'undefined' ? true : document.visibilityState !== 'hidden'
  live = {
    briefId: input.briefId.trim(),
    attemptId: input.attemptId,
    phaseId: input.phaseId,
    lastTick: clockNow(),
    visible,
    online,
    paused: false,
    dictationOn: false,
    pointerEditor: false,
    pointerTalk: false,
    pointerAssist: false,
    focusEditor: false,
    focusTalk: false,
    focusAssist: false,
    lastPointer: null,
    unbind: [],
    interval: null,
  }
  syncGuards()
  bindNetwork()
  live.interval = setInterval(() => tick(), TELEMETRY_TICK_MS)
  return ensureSessionTelemetry(input.briefId, input.attemptId)
}

export function setTelemetryPhase(phaseId: string): void {
  if (!live) return
  tick()
  live.phaseId = phaseId
  setSessionProbePhase(phaseId)
}

/** Stop growing sitting totals while the candidate is on landing / Finished. */
export function pauseSessionTelemetry(): SessionTelemetry | null {
  if (!live) return null
  tick()
  live.paused = true
  live.lastTick = clockNow()
  syncGuards()
  pauseSessionProbeHeartbeat()
  return ensureSessionTelemetry(live.briefId, live.attemptId)
}

/** Resume after Start. Does not wipe the sidecar. */
export function resumeSessionTelemetry(phaseId?: string): SessionTelemetry | null {
  if (!live) return null
  live.lastTick = clockNow()
  live.paused = false
  if (phaseId) live.phaseId = phaseId
  syncGuards()
  resumeSessionProbeHeartbeat()
  if (phaseId) setSessionProbePhase(phaseId)
  return ensureSessionTelemetry(live.briefId, live.attemptId)
}

export function flushSessionTelemetry(): SessionTelemetry | null {
  if (!live) return null
  tick()
  return ensureSessionTelemetry(live.briefId, live.attemptId)
}

export function stopSessionTelemetry(): SessionTelemetry | null {
  const doc = flushSessionTelemetry()
  resetTelemetrySession()
  return doc
}

function setSurfaceFlag(
  surface: SessionTelemetrySurface,
  field: 'pointer' | 'focus',
  on: boolean,
  kind: SessionTelemetryEventKind,
): void {
  if (!live) return
  tick()
  if (field === 'pointer') {
    if (surface === 'editor') live.pointerEditor = on
    else if (surface === 'talk') live.pointerTalk = on
    else live.pointerAssist = on
    if (!on && live.lastPointer?.surface === surface) live.lastPointer = null
  } else if (surface === 'editor') live.focusEditor = on
  else if (surface === 'talk') live.focusTalk = on
  else live.focusAssist = on
  record(kind, surface)
}

function bindNetwork(): void {
  if (!live || typeof window === 'undefined') return
  const onOnline = () => {
    if (!live) return
    tick()
    const wasOffline = !live.online
    live.online = true
    if (wasOffline) {
      const doc = ensureSessionTelemetry(live.briefId, live.attemptId)
      saveSessionTelemetry({ ...doc, reconnectCount: doc.reconnectCount + 1 })
      resumeSessionProbeHeartbeat()
    }
    record('online')
  }
  const onOffline = () => {
    if (!live) return
    tick()
    live.online = false
    record('offline')
  }
  const onVis = () => {
    if (!live || typeof document === 'undefined') return
    tick()
    const hidden = document.visibilityState === 'hidden'
    live.visible = !hidden
    record(hidden ? 'hidden' : 'visible')
  }
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  document.addEventListener('visibilitychange', onVis)
  live.unbind.push(() => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
    document.removeEventListener('visibilitychange', onVis)
  })
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

/**
 * Bind pointer + focus dwell on a live editor or Talk host.
 * Gate-only — do not call from Verify playback.
 * Editor hosts also capture typed inserts (not paste) for WPM.
 */
export function bindTelemetryHost(
  el: HTMLElement | null,
  surface: SessionTelemetrySurface,
): () => void {
  if (!el) return () => {}
  const onPointerIn = () => setSurfaceFlag(surface, 'pointer', true, 'pointer_in')
  const onPointerOut = () => setSurfaceFlag(surface, 'pointer', false, 'pointer_out')
  const onFocusIn = () => setSurfaceFlag(surface, 'focus', true, 'focus_in')
  const onFocusOut = (e: FocusEvent) => {
    const next = e.relatedTarget
    if (next instanceof Node && el.contains(next)) return
    setSurfaceFlag(surface, 'focus', false, 'focus_out')
  }
  const onPointerMove = (e: PointerEvent) => {
    if (!live) return
    const rect = el.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    live.lastPointer = {
      surface,
      x: clamp01((e.clientX - rect.left) / rect.width),
      y: clamp01((e.clientY - rect.top) / rect.height),
    }
  }
  const onBeforeInput = (e: Event) => {
    if (surface !== 'editor') return
    const ev = e as InputEvent
    const type = ev.inputType || ''
    if (type === 'insertFromPaste' || type === 'insertFromDrop' || type === 'insertFromYank') return
    if (type === 'insertText' || type === 'insertCompositionText') {
      recordTypedInsert(live?.briefId ?? '', 'editor', ev.data ?? '')
      return
    }
    if (type === 'insertLineBreak' || type === 'insertParagraph') {
      recordTypedInsert(live?.briefId ?? '', 'editor', ' ')
    }
  }
  el.addEventListener('pointerenter', onPointerIn)
  el.addEventListener('pointerleave', onPointerOut)
  el.addEventListener('pointermove', onPointerMove)
  el.addEventListener('focusin', onFocusIn)
  el.addEventListener('focusout', onFocusOut)
  if (surface === 'editor') {
    el.addEventListener('beforeinput', onBeforeInput, true)
  }
  const unbind = () => {
    el.removeEventListener('pointerenter', onPointerIn)
    el.removeEventListener('pointerleave', onPointerOut)
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('focusin', onFocusIn)
    el.removeEventListener('focusout', onFocusOut)
    if (surface === 'editor') {
      el.removeEventListener('beforeinput', onBeforeInput, true)
    }
  }
  live?.unbind.push(unbind)
  return unbind
}

export function digestSessionTelemetry(doc: SessionTelemetry | null | undefined): SessionTelemetryDigest {
  if (!doc) {
    return {
      visibleMs: 0,
      inEditorMs: 0,
      inTalkMs: 0,
      inWorkMs: 0,
      dwellRatio: null,
      offlineMs: 0,
      reconnectCount: 0,
      eventCount: 0,
      trailCount: 0,
      sampleCount: 0,
      typedWpm: null,
      typedWords: 0,
    }
  }
  const inWorkMs = doc.inEditorMs + doc.inTalkMs
  const typed = sittingTypedWpm(doc.typing)
  return {
    visibleMs: doc.visibleMs,
    inEditorMs: doc.inEditorMs,
    inTalkMs: doc.inTalkMs,
    inWorkMs,
    dwellRatio: doc.visibleMs > 0 ? inWorkMs / doc.visibleMs : null,
    offlineMs: doc.offlineMs,
    reconnectCount: doc.reconnectCount,
    eventCount: doc.events.length,
    trailCount: doc.pointerTrail?.length ?? 0,
    sampleCount: doc.networkSamples?.length ?? 0,
    typedWpm: typed.wpm,
    typedWords: typed.committedWords,
  }
}

/** Test helper — apply one tick of dwell math without the interval. */
export function tickTelemetryForTests(ms: number): void {
  if (!live) return
  const now = live.lastTick + ms
  tick(now)
}

/** Test helper — pretend the pointer is on-stage at a normalized point. */
export function setPointerForTests(
  x: number,
  y: number,
  surface: SessionTelemetrySurface = 'editor',
): void {
  if (!live) return
  live.lastPointer = { x, y, surface }
  if (surface === 'editor') live.pointerEditor = true
  else if (surface === 'talk') live.pointerTalk = true
  else live.pointerAssist = true
}
