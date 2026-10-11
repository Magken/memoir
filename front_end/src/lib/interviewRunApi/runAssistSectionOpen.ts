/**
 * Assist / Copilot first peel bubble — Edge `section_open`, FE opener as fallback.
 * Copilot openers are speech only (never interview-copilot-edit / editorApply).
 */
import { DataApiError } from '../dataApi'
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import { composeAssistOpenerUtterance } from './composeAssistOpenerUtterance'
import { buildAssistDayContinuity } from './buildAssistDayContinuity'
import { runAssistMemoryCompose } from './dayMemory/runAssistMemoryCompose'
import { persistAssistAssistantMessage } from './assistChatPersist'
import { ensureInterviewResponse } from './interviewResponse'
import { resolveCandidateCvNote } from './resolveCandidateCvNote'
import type { GateToolMount } from './resolveGateToolMount'
import type { AssistDayContinuity } from './buildAssistDayContinuity'

export type AssistSectionOpenResult = {
  utterance: string
  from: 'edge' | 'fallback'
}

function fallbackOpener(input: {
  title: string
  description?: string
  kind: 'form' | 'coding' | 'doc'
  timed: boolean
  limitMinutes: number | null
  phaseId: string
  personaName: string
  preferredName: string
  previousTitle: string | null
  bundleId?: string | null
  caps?: { chat?: boolean; spoilers?: boolean; write?: boolean } | null
}): string {
  return composeAssistOpenerUtterance({
    title: input.title,
    description: input.description,
    kind: input.kind,
    timed: input.timed,
    limitMinutes: input.limitMinutes,
    seed: input.phaseId,
    personaName: input.personaName,
    preferredName: input.preferredName,
    previousTitle: input.previousTitle,
    bundleId: input.bundleId,
    caps: input.caps,
  }).replace(/\s+/g, ' ').trim()
}

export async function runAssistSectionOpen(input: {
  briefId: string
  brief: Creator2BriefDocument
  phaseId: string
  timed: boolean
  limitMinutes: number | null
  mount: GateToolMount | null
  gateTitle: string
  gateDescription?: string
  personaName: string
  previousTitle: string | null
  bundleId?: string | null
  caps?: { chat?: boolean; spoilers?: boolean; write?: boolean } | null
  leanDay?: AssistDayContinuity | null
  sectionIds: Array<{ phaseId: string; title: string }>
  onComposeDelta?: (fullText: string) => void
}): Promise<AssistSectionOpenResult> {
  const cv = await resolveCandidateCvNote(input.briefId)
  const preferred = cv.preferredName?.trim() || cv.displayName?.trim() || ''
  const title = input.gateTitle.trim() || input.mount?.title || 'the next section'
  const kind = input.mount?.kind ?? 'form'
  const local = fallbackOpener({
    title,
    description: input.gateDescription || input.mount?.instructions,
    kind,
    timed: input.timed,
    limitMinutes: input.limitMinutes,
    phaseId: input.phaseId,
    personaName: input.personaName,
    preferredName: preferred,
    previousTitle: input.previousTitle,
    bundleId: input.bundleId,
    caps: input.caps,
  })

  if (!input.mount) {
    persistAssistAssistantMessage({
      briefId: input.briefId,
      phaseId: input.phaseId,
      text: local,
      id: `assist-open-${input.phaseId}`,
    })
    return { utterance: local, from: 'fallback' }
  }

  const response = ensureInterviewResponse(input.briefId)
  const dayPack =
    input.leanDay ??
    buildAssistDayContinuity({
      response,
      currentPhaseId: input.phaseId,
      previousSectionTitle: input.previousTitle,
    })
  const leanDay = {
    continuing: dayPack.continuing,
    previousSectionTitle: dayPack.previousSectionTitle,
    priorNote: dayPack.priorNote,
    standingNotes: dayPack.standingNotes,
    dayHistoryTail: dayPack.dayHistoryTail,
  }

  try {
    const result = await runAssistMemoryCompose({
      briefId: input.briefId,
      brief: input.brief,
      phaseId: input.phaseId,
      timed: input.timed,
      limitMinutes: input.limitMinutes,
      mount: input.mount,
      candidateText: '',
      lastAssistantText: null,
      situation: 'section_open',
      leanDay,
      historyTail: [],
      response,
      sectionIds: input.sectionIds,
      gateTitle: title,
      onComposeDelta: input.onComposeDelta,
    })
    const spoken = (result.utterance || '').replace(/\s+/g, ' ').trim()
    if (!spoken) throw new Error('empty_section_open')
    persistAssistAssistantMessage({
      briefId: input.briefId,
      phaseId: input.phaseId,
      text: spoken,
      id: `assist-open-${input.phaseId}`,
    })
    return { utterance: spoken, from: 'edge' }
  } catch (e: unknown) {
    const code =
      e instanceof DataApiError
        ? e.code
        : e instanceof Error
          ? e.message
          : 'unknown'
    if (!/missing_openai_key|not_authenticated|empty_section_open|assist_context/i.test(String(code))) {
      /* fall through */
    }
    persistAssistAssistantMessage({
      briefId: input.briefId,
      phaseId: input.phaseId,
      text: local,
      id: `assist-open-${input.phaseId}`,
    })
    return { utterance: local, from: 'fallback' }
  }
}
