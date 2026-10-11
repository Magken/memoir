/**
 * Reconstruct a checkpoint at time t (ms from session start).
 */
import { getEditorCaptureAdapter } from './registry'
import type { Checkpoint, EditorTape, EditorTapeEvent } from './types'

function cloneCheckpoint(row: Checkpoint): Checkpoint {
  return JSON.parse(JSON.stringify(row)) as Checkpoint
}

export function replayTape(tape: EditorTape, t: number): Checkpoint {
  const adapter = getEditorCaptureAdapter(tape.kind)
  let frame = cloneCheckpoint(tape.initial)
  const limit = Number.isFinite(t) ? t : Number.POSITIVE_INFINITY
  for (const event of tape.events) {
    if (event.t > limit) break
    if (event.type === 'checkpoint') {
      frame = cloneCheckpoint(event.checkpoint)
      continue
    }
    if (event.type === 'patch') {
      if (!adapter) continue
      for (const patch of event.patches) {
        frame = adapter.apply(frame, patch)
      }
    }
  }
  return frame
}

export function replayTapeFinal(tape: EditorTape): Checkpoint {
  const reconstructed = replayTape(tape, Number.POSITIVE_INFINITY)
  return reconstructed
}

export function actionTicks(tape: EditorTape): Array<{
  t: number
  action: string
  detail?: Record<string, unknown>
}> {
  const out: Array<{ t: number; action: string; detail?: Record<string, unknown> }> = []
  for (const event of tape.events) {
    if (event.type === 'action') {
      out.push({ t: event.t, action: event.action, detail: event.detail })
    }
  }
  return out
}

export function tapeDurationMs(tape: EditorTape): number {
  if (tape.durationMs > 0) return tape.durationMs
  let max = 0
  for (const event of tape.events) {
    if (event.t > max) max = event.t
  }
  return max
}

export function lastCheckpointAtOrBefore(tape: EditorTape, t: number): Checkpoint {
  let frame = cloneCheckpoint(tape.initial)
  for (const event of tape.events) {
    if (event.t > t) break
    if (event.type === 'checkpoint') frame = cloneCheckpoint(event.checkpoint)
  }
  return frame
}

/** Events that should be applied after the nearest checkpoint (used by replayTape). */
export function eventsAfterCheckpoint(
  events: EditorTapeEvent[],
  t: number,
): EditorTapeEvent[] {
  let lastIdx = -1
  for (let i = 0; i < events.length; i += 1) {
    const event = events[i]
    if (!event || event.t > t) break
    if (event.type === 'checkpoint') lastIdx = i
  }
  return events.slice(lastIdx + 1).filter((e) => e.t <= t)
}
