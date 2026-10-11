/**
 * One live Results card — Overview, Finished row, and Conversation/Work share this.
 */
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import {
  buildOutputCardFromScored,
  buildResultOverview,
  type InterviewOutputCardFixture,
  type ResultOverview,
} from './fixtures/output-cards/outputCardFixture'
import { collectSittingRead, sittingDurationMinutes } from './collectSittingRead'
import { getInterviewResponse } from './interviewResponse'
import { scoreAttempt, type AttemptScorePackage } from './scoreAttempt'
import { metaFromSessionSignals, overviewSignalGrains } from './sessionSignals'
import { packageIntakeDeclarations } from './sittingDeclaration'
import type { InterviewResponse } from './talkTypes'

export type LiveOutputCardPack = {
  card: InterviewOutputCardFixture
  overview: ResultOverview
  scored: AttemptScorePackage
  response: InterviewResponse
}

export function buildLiveOutputCard(input: {
  briefId: string
  brief: Creator2BriefDocument
}): LiveOutputCardPack {
  const response = getInterviewResponse(input.briefId)
  const { atlas, grains } = overviewSignalGrains({ brief: input.brief, response })
  const merged: InterviewResponse = {
    ...response,
    analysis: { ...response.analysis, signals: grains },
  }
  const scored = scoreAttempt({ brief: input.brief, response: merged })
  const sittingRead = collectSittingRead({
    brief: input.brief,
    response: merged,
    scored,
    sessionSeries: atlas.sessionSeries,
  })
  const card = buildOutputCardFromScored({
    id: response.attemptId,
    candidate: { displayName: 'You' },
    briefTitle: input.brief.definition?.meta?.title,
    sittingRead,
    scored,
    summary: scored.artifacts.sittingThesis?.summary,
    meta: {
      sectionsCompleted: response.completedPhaseIds.length,
      sectionsTotal: input.brief.phases.length,
      skipped: response.skippedPhaseIds.length,
      gate: scored.formGate?.passed === false ? 'fail' : 'pass',
      durationMinutes: sittingDurationMinutes(atlas.sessionSeries),
      limitMinutes:
        typeof input.brief.definition?.meta?.proposedMinutes === 'number'
          ? input.brief.definition.meta.proposedMinutes
          : undefined,
      ...metaFromSessionSignals(merged, atlas),
      sessionMix: scored.artifacts.sessionMix ?? undefined,
      tensions: scored.artifacts.tensions,
      sittingThesis: scored.artifacts.sittingThesis,
    },
  })
  return {
    card,
    overview: {
      ...buildResultOverview(card),
      intakeDeclarations: packageIntakeDeclarations({
        terms: merged.sittingTerms,
        supportNote: merged.sittingDeclaration,
      }),
    },
    scored,
    response: merged,
  }
}
