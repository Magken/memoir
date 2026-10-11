import type { Creator2OnFail } from './creator2BriefTypes'
import type { InterviewFlowFormOnFail } from './flowTimelineTypes'

export const CREATOR2_FAIL_OPTIONS: {
  value: InterviewFlowFormOnFail
  label: string
  description: string
}[] = [
  {
    value: 'none',
    label: 'Just skip ahead',
    description: 'If this section shouldn’t run, continue without a special jump',
  },
  {
    value: 'skip',
    label: 'Skip this section',
    description: 'Leave this section out and go to the next one that should run',
  },
  {
    value: 'endAttempt',
    label: 'End the interview',
    description: 'Stop the interview here if this section can’t run',
  },
  {
    value: 'goToPhase',
    label: 'Jump to another section',
    description: 'Skip ahead to a later section you choose',
  },
]

export function toCreator2OnFail(
  onFail: InterviewFlowFormOnFail,
  onFailPhaseId?: string | null,
): Creator2OnFail {
  if (onFail === 'skip') return 'skip'
  if (onFail === 'endAttempt') return 'endAttempt'
  if (onFail === 'goToPhase' && onFailPhaseId) {
    return { goToPhaseId: onFailPhaseId }
  }
  return null
}

export function fromCreator2OnFail(onFail: Creator2OnFail | undefined): {
  onFail: InterviewFlowFormOnFail
  onFailPhaseId: string | null
} {
  if (onFail === 'skip') return { onFail: 'skip', onFailPhaseId: null }
  if (onFail === 'endAttempt') return { onFail: 'endAttempt', onFailPhaseId: null }
  if (onFail && typeof onFail === 'object' && onFail.goToPhaseId) {
    return { onFail: 'goToPhase', onFailPhaseId: onFail.goToPhaseId }
  }
  return { onFail: 'none', onFailPhaseId: null }
}
