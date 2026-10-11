/**
 * Additive section-reference helpers for Talk / Assist / Copilot plan→retrieve.
 * Empty evidence → callers omit wire fields (unbound bodies stay bit-identical).
 */
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import { bindReferencedStageNeeds } from './dayMemory/broaderContext'
import type { MemoryRetrievalNeed } from './dayMemory/types'
import {
  buildReferencedEvidence,
  leanReferencedMeta,
  type ReferencedEvidencePack,
} from './referencedEvidence'
import type { InterviewResponse } from './talkTypes'

export function alwaysOnReferencedPatch(
  evidence: ReferencedEvidencePack | null | undefined,
): { referencedStages: ReturnType<typeof leanReferencedMeta> } | Record<string, never> {
  if (!evidence?.index.length) return {}
  return { referencedStages: leanReferencedMeta(evidence.index) }
}

export function bindRefs(
  needs: MemoryRetrievalNeed[],
  evidence: ReferencedEvidencePack | null | undefined,
  currentPhaseId: string,
): MemoryRetrievalNeed[] {
  if (!evidence?.index.length) return needs
  return bindReferencedStageNeeds(needs, evidence.index, currentPhaseId)
}

export function retrieveReferencedArg(
  evidence: ReferencedEvidencePack | null | undefined,
): ReferencedEvidencePack | null {
  return evidence?.index.length ? evidence : null
}

export function composeDayMeta(
  base: {
    continuing: boolean
    previousSectionTitle: string | null
    standingNotes?: string | null
  },
  evidence: ReferencedEvidencePack | null | undefined,
): {
  continuing: boolean
  previousSectionTitle: string | null
  standingNotes?: string | null
  referencedStages?: ReturnType<typeof leanReferencedMeta>
} {
  return { ...base, ...alwaysOnReferencedPatch(evidence) }
}

export function copilotDayReferencedSlice(
  evidence: ReferencedEvidencePack | null | undefined,
): Record<string, unknown> {
  if (!evidence?.index.length) return {}
  return {
    referencedStages: leanReferencedMeta(evidence.index),
    candidateSafe: evidence.candidateSafe,
  }
}

export function evidenceForPhase(
  brief: Creator2BriefDocument | null | undefined,
  phaseId: string,
  response: InterviewResponse,
): ReferencedEvidencePack | null {
  if (!brief) return null
  const pack = buildReferencedEvidence({
    brief,
    consumingPhaseId: phaseId,
    response,
  })
  return pack.index.length ? pack : null
}
