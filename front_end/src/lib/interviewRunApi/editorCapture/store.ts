/**
 * localStorage sidecar for editor tapes — same adapter pattern as InterviewResponse.
 * Swap this file for blob/jsonb later; JSON shape stays.
 */
import {
  EDITOR_TAPE_SCHEMA,
  EDITOR_TAPES_PACK_SCHEMA,
  type EditorTape,
  type EditorTapeIndexEntry,
  type EditorTapesPack,
} from './types'

const STORAGE_PREFIX = 'vurify.interviewEditorTape.v1:'

export function editorTapeStorageKey(briefId: string): string {
  return `${STORAGE_PREFIX}${briefId.trim()}`
}

type StoreShape = Record<string, EditorTape>

function emptyStore(): StoreShape {
  return {}
}

function readStore(briefId: string): StoreShape {
  if (typeof localStorage === 'undefined') return emptyStore()
  try {
    const raw = localStorage.getItem(editorTapeStorageKey(briefId))
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as StoreShape
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyStore()
    const out: StoreShape = {}
    for (const [phaseId, tape] of Object.entries(parsed)) {
      if (tape?.schema === EDITOR_TAPE_SCHEMA) out[phaseId] = tape
    }
    return out
  } catch {
    return emptyStore()
  }
}

function writeStore(briefId: string, store: StoreShape): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(editorTapeStorageKey(briefId), JSON.stringify(store))
}

export function loadEditorTapes(briefId: string): StoreShape {
  return readStore(briefId)
}

export function loadEditorTape(briefId: string, phaseId: string): EditorTape | null {
  return readStore(briefId)[phaseId] ?? null
}

export function tapeIndexEntry(tape: EditorTape): EditorTapeIndexEntry {
  let bytes = 0
  try {
    bytes = JSON.stringify(tape).length
  } catch {
    bytes = 0
  }
  return {
    schema: EDITOR_TAPE_SCHEMA,
    kind: tape.kind,
    eventCount: tape.events.length,
    durationMs: tape.durationMs,
    bytes,
    truncated: tape.truncated || undefined,
  }
}

export function saveEditorTape(tape: EditorTape): EditorTapeIndexEntry {
  const store = readStore(tape.briefId)
  store[tape.phaseId] = tape
  writeStore(tape.briefId, store)
  return tapeIndexEntry(tape)
}

export function clearEditorTapes(briefId: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(editorTapeStorageKey(briefId))
}

export function tapesPackFromStore(briefId: string): EditorTapesPack {
  const byPhaseId = readStore(briefId)
  const byKind: EditorTapesPack['byKind'] = {}
  for (const tape of Object.values(byPhaseId)) {
    byKind[tape.kind] = tape
  }
  return {
    schema: EDITOR_TAPES_PACK_SCHEMA,
    schemaVersion: 1,
    briefId: briefId.trim(),
    byKind,
    byPhaseId,
  }
}

export function exportEditorTapesJson(briefId: string, pretty = true): string {
  const pack = tapesPackFromStore(briefId)
  return pretty ? JSON.stringify(pack, null, 2) : JSON.stringify(pack)
}

export function downloadEditorTapesJson(briefId: string): void {
  if (typeof document === 'undefined') return
  const json = exportEditorTapesJson(briefId, true)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const name = `interview-editor-tapes-${briefId.replace(/[^a-z0-9._-]+/gi, '_')}-${stamp}.json`
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function resolveTapeFromPack(
  pack: EditorTapesPack | null | undefined,
  kind: string,
  phaseId?: string | null,
): EditorTape | null {
  if (!pack) return null
  if (phaseId && pack.byPhaseId?.[phaseId]) return pack.byPhaseId[phaseId] ?? null
  return pack.byKind[kind] ?? null
}

/** Live sidecar wins; fixture companion fills gaps (Soft Decision). */
export function pickEditorTape(input: {
  kind: string
  phaseId?: string | null
  live?: EditorTapesPack | null
  fixture?: EditorTapesPack | null
}): EditorTape | null {
  return (
    resolveTapeFromPack(input.live, input.kind, input.phaseId) ??
    resolveTapeFromPack(input.fixture, input.kind, input.phaseId)
  )
}
