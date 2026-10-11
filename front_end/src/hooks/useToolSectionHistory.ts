import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { diffHistoryFocusPath } from '../lib/interviewBrief/sectionHistoryFocus'

const MAX_HISTORY = 40

type HistoryEntry<T> = {
  state: T
  /** JSON path that changed when leaving this state toward the newer snapshot. */
  focus: string | null
}

export type ToolSectionHistoryOptions = {
  /**
   * Top-level keys owned by the embedded editor (document / workspace / derived tests).
   * Changes to these alone do not push section undo; undo keeps the live editor payload.
   */
  editorKeys?: readonly string[]
}

function cloneState<T>(state: T): T {
  return structuredClone(state)
}

function asRecord(state: unknown): Record<string, unknown> | null {
  if (state == null || typeof state !== 'object' || Array.isArray(state)) return null
  return state as Record<string, unknown>
}

function settingsSlice<T>(state: T, editorKeys: readonly string[]): unknown {
  const row = asRecord(state)
  if (!row || editorKeys.length === 0) return state
  const next: Record<string, unknown> = { ...row }
  for (const key of editorKeys) delete next[key]
  return next
}

function settingsFingerprint<T>(state: T, editorKeys: readonly string[]): string {
  return JSON.stringify(settingsSlice(state, editorKeys))
}

function mergeKeepingEditor<T>(restored: T, present: T, editorKeys: readonly string[]): T {
  if (editorKeys.length === 0) return cloneState(restored)
  const base = asRecord(restored)
  const live = asRecord(present)
  if (!base || !live) return cloneState(restored)
  const next: Record<string, unknown> = { ...cloneState(base) }
  for (const key of editorKeys) {
    if (key in live) next[key] = cloneState(live[key])
  }
  return next as T
}

function focusForSettingsChange<T>(
  before: T,
  after: T,
  editorKeys: readonly string[],
  focusHint?: string | null,
): string | null {
  if (focusHint) return focusHint
  const path = diffHistoryFocusPath(
    settingsSlice(before, editorKeys),
    settingsSlice(after, editorKeys),
  )
  if (!path) return null
  // Never treat embedded editor paths as section-history focus.
  const root = path.split('.')[0] ?? ''
  if (editorKeys.includes(root)) return null
  return path
}

/**
 * Per-section undo/redo for tool editors (coding / writing) — **section settings only**.
 * Embedded document/workspace edits use `sync` and do not enter this stack.
 * `onHistoryNavigate(focus)` — scroll the changed settings control after undo/redo.
 */
export function useToolSectionHistory<T>(
  state: T,
  onChange: (next: T) => void,
  sectionKey: string,
  onHistoryNavigate?: (focus?: string | null) => void,
  options?: ToolSectionHistoryOptions,
) {
  const editorKeys = options?.editorKeys ?? []
  const editorKeysRef = useRef(editorKeys)
  editorKeysRef.current = editorKeys

  const pastRef = useRef<HistoryEntry<T>[]>([])
  const futureRef = useRef<HistoryEntry<T>[]>([])
  const presentRef = useRef(cloneState(state))
  const presentFocusRef = useRef<string | null>(null)
  const applyingRef = useRef(false)
  const keyRef = useRef(sectionKey)
  const navigateRef = useRef(onHistoryNavigate)
  navigateRef.current = onHistoryNavigate
  const [tick, setTick] = useState(0)
  const bump = () => setTick((n) => n + 1)

  useEffect(() => {
    if (keyRef.current === sectionKey) return
    keyRef.current = sectionKey
    pastRef.current = []
    futureRef.current = []
    presentRef.current = cloneState(state)
    presentFocusRef.current = null
    bump()
  }, [sectionKey, state])

  useEffect(() => {
    if (applyingRef.current) return
    if (sectionKey !== keyRef.current) return
    if (
      settingsFingerprint(state, editorKeysRef.current) ===
        settingsFingerprint(presentRef.current, editorKeysRef.current) &&
      JSON.stringify(state) === JSON.stringify(presentRef.current)
    ) {
      return
    }
    // Parent pushed a new full state (e.g. brief remap) — adopt without inventing history.
    presentRef.current = cloneState(state)
  }, [state, sectionKey])

  const navigate = (focus: string | null) => {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => navigateRef.current?.(focus), 100)
    })
  }

  /** Persist embedded-editor payload without pushing section undo. */
  const sync = useCallback(
    (next: T) => {
      if (applyingRef.current) {
        onChange(next)
        return
      }
      presentRef.current = cloneState(next)
      onChange(next)
    },
    [onChange],
  )

  /** Commit a section-settings change onto the undo stack. */
  const commit = useCallback(
    (next: T, focusHint?: string | null) => {
      if (applyingRef.current) {
        onChange(next)
        return
      }
      const keys = editorKeysRef.current
      const settingsChanged =
        settingsFingerprint(next, keys) !==
        settingsFingerprint(presentRef.current, keys)
      if (!settingsChanged) {
        // Only editor payload drifted — keep stack intact.
        if (JSON.stringify(next) === JSON.stringify(presentRef.current)) return
        presentRef.current = cloneState(next)
        onChange(next)
        return
      }
      const focus = focusForSettingsChange(
        presentRef.current,
        next,
        keys,
        focusHint,
      )
      pastRef.current = [
        ...pastRef.current,
        { state: cloneState(presentRef.current), focus },
      ].slice(-MAX_HISTORY)
      futureRef.current = []
      presentRef.current = cloneState(next)
      presentFocusRef.current = focus
      bump()
      onChange(next)
    },
    [onChange],
  )

  const undo = useCallback(() => {
    const entry = pastRef.current[pastRef.current.length - 1]
    if (!entry) return
    pastRef.current = pastRef.current.slice(0, -1)
    futureRef.current = [
      {
        state: cloneState(presentRef.current),
        focus: presentFocusRef.current,
      },
      ...futureRef.current,
    ]
    const restored = mergeKeepingEditor(
      entry.state,
      presentRef.current,
      editorKeysRef.current,
    )
    presentRef.current = restored
    presentFocusRef.current = entry.focus
    applyingRef.current = true
    bump()
    onChange(restored)
    navigate(entry.focus)
    queueMicrotask(() => {
      applyingRef.current = false
    })
  }, [onChange])

  const redo = useCallback(() => {
    const entry = futureRef.current[0]
    if (!entry) return
    futureRef.current = futureRef.current.slice(1)
    pastRef.current = [
      ...pastRef.current,
      {
        state: cloneState(presentRef.current),
        focus: entry.focus,
      },
    ].slice(-MAX_HISTORY)
    const restored = mergeKeepingEditor(
      entry.state,
      presentRef.current,
      editorKeysRef.current,
    )
    presentRef.current = restored
    presentFocusRef.current = entry.focus
    applyingRef.current = true
    bump()
    onChange(restored)
    navigate(entry.focus)
    queueMicrotask(() => {
      applyingRef.current = false
    })
  }, [onChange])

  void tick

  return {
    commit,
    sync,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  }
}

/**
 * Bot apply / parent brief swap: push a new payload into a mounted editor
 * (Monaco / Lexical / TestForm) without remounting the whole timeline.
 * Call `markLocal(fp)` from onPayloadChange so typing does not retrigger adopt.
 */
export function useSoftAdoptEditorPayload(fingerprint: string, adopt: () => void) {
  const skipOutboundRef = useRef(false)
  const lastFpRef = useRef(fingerprint)
  const localFpRef = useRef(fingerprint)
  const adoptRef = useRef(adopt)
  adoptRef.current = adopt

  useLayoutEffect(() => {
    if (fingerprint === lastFpRef.current) return
    lastFpRef.current = fingerprint
    if (fingerprint === localFpRef.current) return
    skipOutboundRef.current = true
    adoptRef.current()
    localFpRef.current = fingerprint
    const t = window.setTimeout(() => {
      skipOutboundRef.current = false
    }, 700)
    return () => window.clearTimeout(t)
  }, [fingerprint])

  const markLocal = useCallback((fp: string) => {
    localFpRef.current = fp
    lastFpRef.current = fp
  }, [])

  return { skipOutboundRef, markLocal }
}
