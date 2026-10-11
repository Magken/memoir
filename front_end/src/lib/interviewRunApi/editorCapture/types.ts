/**
 * Editor History Capture — session tape schema (not editor-local undo).
 * Downstream systems (playback, anti-cheat, timeline marking) consume this JSON.
 */

export const EDITOR_TAPE_SCHEMA = 'vurify/editor-tape' as const
export const EDITOR_TAPES_PACK_SCHEMA = 'vurify/editor-tapes' as const
export const EDITOR_TAPE_VERSION = 1 as const

export type EditorCaptureKind = 'form' | 'coding' | 'doc'

export type EditorTapeActionName =
  | 'open_file'
  | 'language'
  | 'run'
  | 'undo'
  | 'redo'
  | 'paste'
  | 'paste_route'
  | 'copilot_apply'
  | 'idle'

export type Checkpoint = Record<string, unknown>

export type EditorTapePatch = {
  op: string
  [key: string]: unknown
}

export type EditorTapeEvent =
  | { t: number; type: 'checkpoint'; checkpoint: Checkpoint }
  | { t: number; type: 'patch'; patches: EditorTapePatch[] }
  | {
      t: number
      type: 'action'
      action: EditorTapeActionName
      /** `copilot_apply`: `{ messageId, files? }` joins the Apply receipt in `messages[]`. */
      detail?: Record<string, unknown>
    }
  | { t: number; type: 'session_end' }

export type EditorTape = {
  schema: typeof EDITOR_TAPE_SCHEMA
  schemaVersion: 1
  briefId: string
  attemptId: string
  phaseId: string
  kind: string
  startedAt: string
  endedAt: string | null
  durationMs: number
  truncated?: boolean
  initial: Checkpoint
  events: EditorTapeEvent[]
  final: Checkpoint
}

export type EditorTapeIndexEntry = {
  schema: typeof EDITOR_TAPE_SCHEMA
  kind: string
  eventCount: number
  durationMs: number
  bytes: number
  truncated?: boolean
}

export type EditorTapesPack = {
  schema: typeof EDITOR_TAPES_PACK_SCHEMA
  schemaVersion: 1
  briefId?: string
  byKind: Partial<Record<string, EditorTape>>
  byPhaseId?: Record<string, EditorTape>
}

export type EditorCaptureAdapter<TLive = unknown> = {
  kind: string
  sanitize(live: TLive): Checkpoint
  diff(prev: Checkpoint, next: Checkpoint): EditorTapePatch[]
  apply(checkpoint: Checkpoint, patch: EditorTapePatch): Checkpoint
  inferActions?(
    prev: Checkpoint,
    next: Checkpoint,
  ): Array<{ action: EditorTapeActionName; detail?: Record<string, unknown> }>
}

export type CaptureStartInput = {
  briefId: string
  attemptId: string
  phaseId: string
  kind: string
  live: unknown
}

export type CaptureTickInput = {
  kind: string
  live: unknown
}
