/** Flush a tape into the sidecar store and the InterviewResponse index. */
import { getInterviewResponse, saveInterviewResponse } from '../interviewResponse'
import { flushCapture, tickCapture } from './recorder'
import { saveEditorTape } from './store'
import type { CaptureTickInput, EditorTape, EditorTapeIndexEntry } from './types'

export function persistEditorTape(tape: EditorTape): EditorTapeIndexEntry {
  const entry = saveEditorTape(tape)
  const doc = getInterviewResponse(tape.briefId)
  saveInterviewResponse({
    ...doc,
    editorTapes: {
      ...(doc.editorTapes ?? {}),
      [tape.phaseId]: entry,
    },
  })
  return entry
}

/** Optional last tick so tape.final matches the artifact sent to assess. */
export function flushAndPersistCapture(tick?: CaptureTickInput | null): EditorTape | null {
  if (tick) tickCapture(tick)
  const tape = flushCapture()
  if (!tape) return null
  persistEditorTape(tape)
  return tape
}
