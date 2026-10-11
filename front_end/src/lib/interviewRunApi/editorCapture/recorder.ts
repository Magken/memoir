/**
 * In-memory Editor History Capture recorder.
 * One active tool session at a time. Adapters own diffs; this file owns the envelope.
 */
import { INSERT_COVER_MS } from '../insertSource'
import { getEditorCaptureAdapter } from './registry'
import type {
  CaptureStartInput,
  CaptureTickInput,
  Checkpoint,
  EditorTape,
  EditorTapeActionName,
  EditorTapeEvent,
  EditorTapePatch,
} from './types'

export const CAPTURE_COALESCE_MS = 150
export const CAPTURE_CHECKPOINT_EVERY = 40
export const CAPTURE_CHECKPOINT_IDLE_MS = 30_000
export const CAPTURE_IDLE_GAP_MS = 8_000
export const CAPTURE_MAX_EVENTS = 4_000
export const CAPTURE_MAX_BYTES = 750_000

type Session = {
  briefId: string
  attemptId: string
  phaseId: string
  kind: string
  startedAtMs: number
  startedAtIso: string
  initial: Checkpoint
  last: Checkpoint
  events: EditorTapeEvent[]
  patchCountSinceCheckpoint: number
  lastEventAt: number
  truncated: boolean
}

let session: Session | null = null
let clockNow = (): number => Date.now()

export function setCaptureClockForTests(now: (() => number) | null): void {
  clockNow = now ?? (() => Date.now())
}

export function resetCaptureSession(): void {
  session = null
}

export function peekCaptureSession(): Session | null {
  return session
}

function elapsed(): number {
  if (!session) return 0
  return Math.max(0, clockNow() - session.startedAtMs)
}

function cloneCheckpoint(row: Checkpoint): Checkpoint {
  return JSON.parse(JSON.stringify(row)) as Checkpoint
}

function eventBytes(events: EditorTapeEvent[]): number {
  try {
    return JSON.stringify(events).length
  } catch {
    return events.length * 64
  }
}

function canAppend(extra = 1): boolean {
  if (!session) return false
  if (session.truncated) return false
  if (session.events.length + extra > CAPTURE_MAX_EVENTS) return false
  if (eventBytes(session.events) > CAPTURE_MAX_BYTES) return false
  return true
}

function markTruncated(): void {
  if (session) session.truncated = true
}

function pushEvent(event: EditorTapeEvent): void {
  if (!session) return
  if (!canAppend()) {
    markTruncated()
    return
  }
  session.events.push(event)
  session.lastEventAt = event.t
  if (eventBytes(session.events) > CAPTURE_MAX_BYTES) markTruncated()
}

function recentBotEdit(t: number): boolean {
  if (!session) return false
  for (let i = session.events.length - 1; i >= 0; i -= 1) {
    const event = session.events[i]
    if (!event || event.type !== 'action' || event.action !== 'copilot_apply') continue
    return t - event.t < INSERT_COVER_MS
  }
  return false
}

function maybeIdle(t: number): void {
  if (!session || session.truncated) return
  if (t - session.lastEventAt < CAPTURE_IDLE_GAP_MS) return
  pushEvent({ t, type: 'action', action: 'idle' })
}

function maybeCheckpoint(t: number, force = false): void {
  if (!session || session.truncated) return
  const dueCount = session.patchCountSinceCheckpoint >= CAPTURE_CHECKPOINT_EVERY
  const dueIdle = t - session.lastEventAt >= CAPTURE_CHECKPOINT_IDLE_MS
  if (!force && !dueCount && !dueIdle) return
  pushEvent({ t, type: 'checkpoint', checkpoint: cloneCheckpoint(session.last) })
  session.patchCountSinceCheckpoint = 0
}

function coalescePatches(t: number, patches: EditorTapePatch[]): void {
  if (!session) return
  const last = session.events[session.events.length - 1]
  if (
    last &&
    last.type === 'patch' &&
    t - last.t <= CAPTURE_COALESCE_MS
  ) {
    last.patches.push(...patches)
    last.t = t
    session.lastEventAt = t
    return
  }
  pushEvent({ t, type: 'patch', patches })
}

export function startCapture(input: CaptureStartInput): EditorTape | null {
  const adapter = getEditorCaptureAdapter(input.kind)
  if (!adapter) {
    session = null
    return null
  }
  const now = clockNow()
  const initial = adapter.sanitize(input.live)
  session = {
    briefId: input.briefId.trim(),
    attemptId: input.attemptId,
    phaseId: input.phaseId,
    kind: input.kind,
    startedAtMs: now,
    startedAtIso: new Date(now).toISOString(),
    initial: cloneCheckpoint(initial),
    last: cloneCheckpoint(initial),
    events: [{ t: 0, type: 'checkpoint', checkpoint: cloneCheckpoint(initial) }],
    patchCountSinceCheckpoint: 0,
    lastEventAt: 0,
    truncated: false,
  }
  return snapshotTape(false)
}

export function tickCapture(input: CaptureTickInput): void {
  if (!session || session.kind !== input.kind) return
  const adapter = getEditorCaptureAdapter(session.kind)
  if (!adapter) return
  const next = adapter.sanitize(input.live)
  const patches = adapter.diff(session.last, next)
  if (patches.length === 0) {
    session.last = next
    return
  }
  const t = elapsed()
  maybeIdle(t)
  const inferred = adapter.inferActions?.(session.last, next) ?? []
  const skipInferredPaste = recentBotEdit(t)
  for (const row of inferred) {
    if (skipInferredPaste && (row.action === 'paste' || row.action === 'paste_route')) continue
    pushEvent({ t, type: 'action', action: row.action, detail: row.detail })
  }
  coalescePatches(t, patches)
  session.last = next
  session.patchCountSinceCheckpoint += patches.length
  maybeCheckpoint(t)
}

export function actionCapture(
  action: EditorTapeActionName,
  detail?: Record<string, unknown>,
): void {
  if (!session) return
  const t = elapsed()
  maybeIdle(t)
  pushEvent({ t, type: 'action', action, detail })
  if (action === 'run' || action === 'copilot_apply') {
    maybeCheckpoint(t, true)
  }
}

export function snapshotTape(ended: boolean): EditorTape | null {
  if (!session) return null
  const t = elapsed()
  const events = [...session.events]
  if (ended) {
    const last = events[events.length - 1]
    if (!last || last.type !== 'session_end') {
      events.push({ t, type: 'session_end' })
    }
  }
  return {
    schema: 'vurify/editor-tape',
    schemaVersion: 1,
    briefId: session.briefId,
    attemptId: session.attemptId,
    phaseId: session.phaseId,
    kind: session.kind,
    startedAt: session.startedAtIso,
    endedAt: ended ? new Date(clockNow()).toISOString() : null,
    durationMs: t,
    truncated: session.truncated || undefined,
    initial: cloneCheckpoint(session.initial),
    events,
    final: cloneCheckpoint(session.last),
  }
}

export function flushCapture(): EditorTape | null {
  const tape = snapshotTape(true)
  session = null
  return tape
}

export const Capture = {
  start: startCapture,
  tick: tickCapture,
  action: actionCapture,
  flush: flushCapture,
  peek: peekCaptureSession,
  reset: resetCaptureSession,
}
