/**
 * Copilot converse `# Interview` packs — lean continuity always; retrieve only when the
 * ask is about prior interview substance (CV / last section / earlier talk).
 * Plan/editor hops never receive this helper's extra packs.
 */
import type { Creator2BriefDocument } from '../../interviewBrief/creator2BriefTypes'
import type { AssistDayContinuity } from '../buildAssistDayContinuity'
import { askNeedsPriorInterviewMemory } from '../../../../../back_end/supabase/functions/_shared/interview-sitting-peel/needDayMemory.ts'
import { resolveInterviewEdgeAccessToken } from '../edgeAccessToken'
import { resolveCandidateCvNote } from '../resolveCandidateCvNote'
import {
  alwaysOnReferencedPatch,
  bindRefs,
  copilotDayReferencedSlice,
  evidenceForPhase,
  retrieveReferencedArg,
} from '../referencedTurn'
import type { InterviewResponse } from '../talkTypes'
import {
  bindPriorSectionNeeds,
  broaderContextPlan,
  type PriorSectionOpts,
} from './broaderContext'
import { planDayMemory } from './dayMemoryEdgeClient'
import { retrieveDayMemory } from './retrieveDayMemory'
import type { MemoryRetrievalPlan } from './types'
import { unionDayHistoryTail } from './unionDayHistoryTail'

export type CopilotDayPack = {
  continuing: boolean
  previousSectionTitle: string | null
  priorNote: string | null
  standingNotes?: string | null
  candidateCvNote?: string | null
  dayHistoryTail?: Array<{
    role: 'assistant' | 'candidate'
    text: string
    phaseId: string
  }>
  referencedStages?: Array<{
    phaseId: string
    title: string
    kind: string
    available?: string[]
  }>
  candidateSafe?: {
    artifacts?: unknown[]
    runs?: unknown[]
    synths?: unknown[]
  }
}

function priorOpts(input: {
  continuing: boolean
  previousSectionTitle: string | null
  currentPhaseId: string
  sectionIds: Array<{ phaseId: string; title: string }>
}): PriorSectionOpts {
  return {
    continuing: input.continuing,
    previousSectionTitle: input.previousSectionTitle,
    currentPhaseId: input.currentPhaseId,
    sectionIndex: input.sectionIds,
  }
}

function planToUse(
  skipped: boolean,
  plan: MemoryRetrievalPlan,
  candidateText: string,
  opts: PriorSectionOpts,
): MemoryRetrievalPlan {
  if (skipped) return broaderContextPlan(candidateText, opts)
  return {
    ...plan,
    needs: bindPriorSectionNeeds(plan.needs, opts),
  }
}

function clipNote(text: string | null | undefined, max = 900): string | null {
  const t = String(text ?? '').trim()
  if (!t) return null
  return t.length <= max ? t : `${t.slice(0, max - 1).trim()}…`
}

function leanCopilotDay(input: {
  leanDay: AssistDayContinuity
  brief: Creator2BriefDocument | null | undefined
  phaseId: string
  response: InterviewResponse
}): CopilotDayPack {
  const evidence = evidenceForPhase(input.brief, input.phaseId, input.response)
  return {
    continuing: input.leanDay.continuing,
    previousSectionTitle: input.leanDay.previousSectionTitle,
    priorNote: input.leanDay.priorNote,
    standingNotes: input.leanDay.standingNotes,
    dayHistoryTail: unionDayHistoryTail(input.leanDay.dayHistoryTail, null),
    ...copilotDayReferencedSlice(evidence),
  }
}

/**
 * Always posts lean continuity + standing notes + prior-section tail.
 * When the ask needs prior substance, plan+retrieve and merge CV / hits.
 */
export async function retrieveCopilotDayMemory(input: {
  briefId: string
  brief: Creator2BriefDocument | null | undefined
  phaseId: string
  candidateText: string
  lastAssistantText?: string | null
  leanDay: AssistDayContinuity
  sectionIds: Array<{ phaseId: string; title: string }>
  gateTitle: string
  response: InterviewResponse
}): Promise<CopilotDayPack> {
  const base = leanCopilotDay(input)
  if (!askNeedsPriorInterviewMemory(input.candidateText, 'clarify') || !input.brief) {
    return base
  }

  try {
    const accessToken = await resolveInterviewEdgeAccessToken(null, input.briefId)
    const evidence = evidenceForPhase(input.brief, input.phaseId, input.response)
    const sectionOpts = priorOpts({
      continuing: input.leanDay.continuing,
      previousSectionTitle: input.leanDay.previousSectionTitle,
      currentPhaseId: input.phaseId,
      sectionIds: input.sectionIds,
    })
    const planResult = await planDayMemory({
      surface: 'assist',
      candidateText: input.candidateText,
      lastAssistantText: input.lastAssistantText,
      alwaysOnMeta: {
        continuing: input.leanDay.continuing,
        previousSectionTitle: input.leanDay.previousSectionTitle,
        currentPhaseId: input.phaseId,
        currentTitle: input.gateTitle,
        situationHint: 'clarify',
        sectionIds: input.sectionIds,
        standingNotes: input.leanDay.standingNotes,
        ...alwaysOnReferencedPatch(evidence),
      },
      accessToken,
      briefId: input.briefId,
    })
    let plan = planToUse(
      Boolean(planResult.composeMeta.skipped),
      planResult.plan,
      input.candidateText,
      sectionOpts,
    )
    plan = { ...plan, needs: bindRefs(plan.needs, evidence, input.phaseId) }
    const speculativeCv = plan.needs.some((n) => n.sourceId === 'candidate_cv')
      ? await resolveCandidateCvNote(input.briefId)
      : null
    const retrieved = retrieveDayMemory({
      plan,
      response: input.response,
      currentPhaseId: input.phaseId,
      cv: speculativeCv,
      sectionIndex: input.sectionIds,
      referenced: retrieveReferencedArg(evidence),
    })
    const priorFromRetrieve =
      retrieved.topicSynths.length || retrieved.dayHits.length
        ? clipNote(
            [
              ...retrieved.topicSynths.map((t) => t.text),
              ...retrieved.dayHits.map((h) => h.text),
            ].join('\n'),
          )
        : null
    return {
      ...base,
      priorNote: priorFromRetrieve || base.priorNote,
      standingNotes:
        base.standingNotes ||
        (retrieved.botNotes.length ? retrieved.botNotes.map((n) => `- ${n}`).join('\n') : null),
      candidateCvNote: retrieved.candidateCvNote || speculativeCv?.note || null,
      dayHistoryTail: unionDayHistoryTail(input.leanDay.dayHistoryTail, retrieved),
    }
  } catch {
    return base
  }
}
