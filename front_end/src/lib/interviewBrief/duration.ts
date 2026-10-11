import type { FlowDocument } from '../flowEditor/types'
import { INTERVIEW_KIND, type InterviewDiscussionConfig, type InterviewToolConfig } from './types'

/** Default minutes contributed by each spine piece (auto estimate). */
export const INTERVIEW_PHASE_MINUTE_WEIGHTS = {
  discussionOpening: 5,
  discussionClosing: 5,
  discussion: 10,
  toolCoding: 25,
  toolDoc: 20,
  toolFormQuiz: 15,
  toolDefault: 20,
} as const

/**
 * Auto duration from discussion + tool phases on the brief spine.
 * Topics / meta nodes do not add time.
 */
export function estimateInterviewMinutes(flow: FlowDocument): number {
  let total = 0
  for (const node of flow.nodes) {
    if (node.kind === INTERVIEW_KIND.discussion) {
      const config = (node.config ?? {}) as InterviewDiscussionConfig
      if (config.isOpening) total += INTERVIEW_PHASE_MINUTE_WEIGHTS.discussionOpening
      else if (config.isClosing) total += INTERVIEW_PHASE_MINUTE_WEIGHTS.discussionClosing
      else total += INTERVIEW_PHASE_MINUTE_WEIGHTS.discussion
      continue
    }
    if (node.kind === INTERVIEW_KIND.tool) {
      const config = (node.config ?? {}) as InterviewToolConfig
      const toolType = config.toolType ?? 'coding'
      if (toolType === 'coding') total += INTERVIEW_PHASE_MINUTE_WEIGHTS.toolCoding
      else if (toolType === 'doc') total += INTERVIEW_PHASE_MINUTE_WEIGHTS.toolDoc
      else if (toolType === 'form_quiz') total += INTERVIEW_PHASE_MINUTE_WEIGHTS.toolFormQuiz
      else total += INTERVIEW_PHASE_MINUTE_WEIGHTS.toolDefault
    }
  }
  return total > 0 ? total : INTERVIEW_PHASE_MINUTE_WEIGHTS.discussionOpening +
    INTERVIEW_PHASE_MINUTE_WEIGHTS.toolCoding +
    INTERVIEW_PHASE_MINUTE_WEIGHTS.discussionClosing
}
