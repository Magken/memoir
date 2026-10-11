import { useCallback, useEffect, useRef, useState } from 'react'
import type { InterviewFlowAnalysisShelfState } from '../lib/interviewBrief/flowTimelineTypes'
import { diffHistoryFocusPath } from '../lib/interviewBrief/sectionHistoryFocus'

const MAX_HISTORY = 40

type LibrarySnapshot = Pick<
  InterviewFlowAnalysisShelfState,
  'libraryIds' | 'templateMeta'
>

type HistoryEntry = {
  state: LibrarySnapshot
  focus: string | null
}

function fingerprint(state: LibrarySnapshot): string {
  return JSON.stringify({
    libraryIds: state.libraryIds,
    templateMeta: state.templateMeta,
  })
}

function cloneSnapshot(state: LibrarySnapshot): LibrarySnapshot {
  return {
    libraryIds: [...state.libraryIds],
    templateMeta: structuredClone(state.templateMeta),
  }
}

/**
 * Undo/redo for the Analysis templates library (ids + card meta only).
 * `onHistoryNavigate(focus)` — scroll the changed template/control into view.
 */
export function useTemplateLibraryHistory(
  state: InterviewFlowAnalysisShelfState,
  onChange: (next: InterviewFlowAnalysisShelfState) => void,
  onHistoryNavigate?: (focus?: string | null) => void,
) {
  const pastRef = useRef<HistoryEntry[]>([])
  const futureRef = useRef<HistoryEntry[]>([])
  const presentRef = useRef(
    cloneSnapshot({ libraryIds: state.libraryIds, templateMeta: state.templateMeta }),
  )
  const presentFocusRef = useRef<string | null>(null)
  const applyingRef = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state
  const navigateRef = useRef(onHistoryNavigate)
  navigateRef.current = onHistoryNavigate
  const [tick, setTick] = useState(0)
  const bump = () => setTick((n) => n + 1)

  useEffect(() => {
    if (applyingRef.current) return
    const snap = { libraryIds: state.libraryIds, templateMeta: state.templateMeta }
    if (fingerprint(snap) === fingerprint(presentRef.current)) return
    presentRef.current = cloneSnapshot(snap)
  }, [state.libraryIds, state.templateMeta])

  const applySnapshot = useCallback(
    (snap: LibrarySnapshot) => {
      onChange({
        ...stateRef.current,
        libraryIds: snap.libraryIds,
        templateMeta: snap.templateMeta,
      })
    },
    [onChange],
  )

  const navigate = (focus: string | null) => {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => navigateRef.current?.(focus), 80)
    })
  }

  const commit = useCallback(
    (next: InterviewFlowAnalysisShelfState, focusHint?: string | null) => {
      const snap = { libraryIds: next.libraryIds, templateMeta: next.templateMeta }
      if (applyingRef.current) {
        onChange(next)
        return
      }
      if (fingerprint(snap) === fingerprint(presentRef.current)) return
      const focus =
        focusHint ??
        diffHistoryFocusPath(presentRef.current, snap) ??
        null
      pastRef.current = [
        ...pastRef.current,
        { state: cloneSnapshot(presentRef.current), focus },
      ].slice(-MAX_HISTORY)
      futureRef.current = []
      presentRef.current = cloneSnapshot(snap)
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
        state: cloneSnapshot(presentRef.current),
        focus: presentFocusRef.current,
      },
      ...futureRef.current,
    ]
    presentRef.current = cloneSnapshot(entry.state)
    presentFocusRef.current = entry.focus
    applyingRef.current = true
    bump()
    applySnapshot(entry.state)
    navigate(entry.focus)
    queueMicrotask(() => {
      applyingRef.current = false
    })
  }, [applySnapshot])

  const redo = useCallback(() => {
    const entry = futureRef.current[0]
    if (!entry) return
    futureRef.current = futureRef.current.slice(1)
    pastRef.current = [
      ...pastRef.current,
      {
        state: cloneSnapshot(presentRef.current),
        focus: entry.focus,
      },
    ].slice(-MAX_HISTORY)
    presentRef.current = cloneSnapshot(entry.state)
    presentFocusRef.current = entry.focus
    applyingRef.current = true
    bump()
    applySnapshot(entry.state)
    navigate(entry.focus)
    queueMicrotask(() => {
      applyingRef.current = false
    })
  }, [applySnapshot])

  /** Push current library onto the undo stack without changing present (e.g. before cascade delete). */
  const checkpoint = useCallback(() => {
    pastRef.current = [
      ...pastRef.current,
      { state: cloneSnapshot(presentRef.current), focus: presentFocusRef.current },
    ].slice(-MAX_HISTORY)
    futureRef.current = []
    bump()
  }, [])

  void tick

  return {
    commit,
    checkpoint,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  }
}
