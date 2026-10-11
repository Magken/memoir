/**
 * Legacy gate-scene conversational string — **unused on candidate gate UI**.
 *
 * Section page shows title + description + preamble only. Persona / position /
 * purpose / ask live in the Talk peel via `composeTalkOpenerUtterance` after Start.
 *
 * Kept exported for wiring checklist C2 → future Edge intro turn; returns '' so
 * callers that still pass `introMessage` stay empty.
 */
export function composeGateIntroMessage(_input: {
  stageLabel: string
  sectionTitle: string
  description: string
  startPrompt: string
  interviewerName?: string | null
  kindLabel?: string
  previousStageLabel?: string | null
  previousTitle?: string | null
  completedCount?: number
  index?: number
  total?: number
  isOpening?: boolean
  isClosing?: boolean
}): string {
  return ''
}
