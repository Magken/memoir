import type { InterviewFlowTalkEditorState } from './flowTimelineTypes'

function pickSyncedPair(
  primary: string | undefined,
  secondary: string | undefined,
  prevPrimary: string,
  prevSecondary: string,
): string {
  const left = (primary ?? prevPrimary).trim()
  const right = (secondary ?? prevSecondary).trim()
  if (left === right) return left
  if (primary != null && secondary == null) return String(primary).trim()
  if (secondary != null && primary == null) return String(secondary).trim()
  const leftChanged = left !== prevPrimary.trim()
  const rightChanged = right !== prevSecondary.trim()
  if (rightChanged && !leftChanged) return right
  if (leftChanged && !rightChanged) return left
  return left || right
}

/**
 * Keep timeline title/summary and editor topic/purpose as one pair.
 * Editing either surface updates both fields so they never drift.
 */
export function withSyncedTalkCopy(
  state: InterviewFlowTalkEditorState,
  partial: Partial<InterviewFlowTalkEditorState> = {},
): InterviewFlowTalkEditorState {
  const next: InterviewFlowTalkEditorState = { ...state, ...partial }

  const title = pickSyncedPair(
    partial.sectionTitle,
    partial.topicLabel,
    state.sectionTitle,
    state.topicLabel,
  )
  next.sectionTitle = title
  next.topicLabel = title

  const summary = pickSyncedPair(
    partial.summaryBlurb,
    partial.purpose,
    state.summaryBlurb,
    state.purpose,
  )
  next.summaryBlurb = summary
  next.purpose = summary

  return next
}
