import { useCallback, useEffect, useRef, useState } from 'react'
import type { InterviewFlowTalkEditorState } from '../lib/interviewBrief/flowTimelineTypes'
import { diffHistoryFocusPath } from '../lib/interviewBrief/sectionHistoryFocus'

const MAX_HISTORY = 40

type HistoryEntry = {
  state: InterviewFlowTalkEditorState
  focus: string | null
}

function fingerprint(state: InterviewFlowTalkEditorState): string {
  return JSON.stringify(state)
}

function cloneState(state: InterviewFlowTalkEditorState): InterviewFlowTalkEditorState {
  return structuredClone(state)
}

/**
 * Per-talk-section undo/redo — section settings only (not timeline spine / other sections).
 * `onHistoryNavigate(focus)` — scroll the changed control into view after undo/redo.
 */
export function useTalkSectionHistory(
  state: InterviewFlowTalkEditorState,
  onChange: (next: InterviewFlowTalkEditorState) => void,
  onHistoryNavigate?: (focus?: string | null) => void,
) {
  const pastRef = useRef<HistoryEntry[]>([])
  const futureRef = useRef<HistoryEntry[]>([])
  const presentRef = useRef(cloneState(state))
  const presentFocusRef = useRef<string | null>(null)
  const applyingRef = useRef(false)
  const phaseIdRef = useRef(state.phaseId)
  const navigateRef = useRef(onHistoryNavigate)
  navigateRef.current = onHistoryNavigate
  const [tick, setTick] = useState(0)
  const bump = () => setTick((n) => n + 1)

  useEffect(() => {
    if (phaseIdRef.current === state.phaseId) return
    phaseIdRef.current = state.phaseId
    pastRef.current = []
    futureRef.current = []
    presentRef.current = cloneState(state)
    presentFocusRef.current = null
    bump()
  }, [state.phaseId, state])

  useEffect(() => {
    if (applyingRef.current) return
    if (state.phaseId !== phaseIdRef.current) return
    if (fingerprint(state) === fingerprint(presentRef.current)) return
    presentRef.current = cloneState(state)
  }, [state])

  const navigate = (focus: string | null) => {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => navigateRef.current?.(focus), 80)
    })
  }

  const commit = useCallback(
    (next: InterviewFlowTalkEditorState, focusHint?: string | null) => {
      if (applyingRef.current) {
        onChange(next)
        return
      }
      if (fingerprint(next) === fingerprint(presentRef.current)) return
      const focus =
        focusHint ??
        diffHistoryFocusPath(presentRef.current, next) ??
        null
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
    presentRef.current = cloneState(entry.state)
    presentFocusRef.current = entry.focus
    applyingRef.current = true
    bump()
    onChange(entry.state)
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
    presentRef.current = cloneState(entry.state)
    presentFocusRef.current = entry.focus
    applyingRef.current = true
    bump()
    onChange(entry.state)
    navigate(entry.focus)
    queueMicrotask(() => {
      applyingRef.current = false
    })
  }, [onChange])

  void tick

  return {
    commit,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  }
}
