import type { Creator2BriefDocument, Creator2Phase } from '../interviewBrief/creator2BriefTypes'
import staffSecurityEngineerFullInterview from '../interviewBrief/fixtures/staffSecurityEngineerFullInterview.json'
import { stampStructureCopilotAssist } from '../interviewBrief/toolAssistBundles'
import { adaptTryInterviewScenario } from './tryInterviewScenarios'
import type { TryInterviewKitId } from './tryInterviewKits'

const STAFF = staffSecurityEngineerFullInterview as unknown as Creator2BriefDocument

export const TRY_INTERVIEW_BRIEF_IDS = {
  talk: 'fixture:try-talk',
  coding: 'fixture:try-coding',
  full: 'fixture:try-full',
} as const satisfies Record<TryInterviewKitId, `fixture:${string}`>

/** Ownership talk (pack.talk + follow-ups). Not the three-phase mobile demo. */
const TALK_PHASE_IDS = ['ph.k5wuze'] as const
const CODING_PHASE_IDS = ['ph.8xz0sd'] as const
const FULL_PHASE_IDS = ['ph.fi4fpq', 'ph.8xz0sd', 'ph.6pltkr', 'ph.6mvyht'] as const

function cloneBrief(doc: Creator2BriefDocument): Creator2BriefDocument {
  return JSON.parse(JSON.stringify(doc)) as Creator2BriefDocument
}

function stripDeadGates(
  phase: Creator2Phase,
  keepPhases: ReadonlySet<string>,
  keepTools: ReadonlySet<string>,
): Creator2Phase {
  const next = { ...phase }
  if (next.onFail && typeof next.onFail === 'object' && 'goToPhaseId' in next.onFail) {
    const go = next.onFail.goToPhaseId
    if (typeof go === 'string' && !keepPhases.has(go)) next.onFail = 'skip'
  }
  const when = next.when
  if (when && typeof when === 'object') {
    const filterConds = (list: NonNullable<typeof when.all> | undefined) =>
      list?.filter((cond) => {
        if (cond.phaseCompleted && !keepPhases.has(cond.phaseCompleted)) return false
        if (cond.toolPassed && !keepTools.has(cond.toolPassed)) return false
        return true
      })
    const all = filterConds(when.all)
    const any = filterConds(when.any)
    next.when = {
      ...(all && all.length ? { all } : {}),
      ...(any && any.length ? { any } : {}),
    }
    if (!next.when.all && !next.when.any) delete next.when
  }
  return next
}

function filterRollup(
  rollup: Creator2BriefDocument['analysis']['rollup'],
  keep: ReadonlySet<string>,
): Creator2BriefDocument['analysis']['rollup'] {
  if (!rollup) return rollup
  const weightSections: Record<string, string[]> = {}
  for (const [key, ids] of Object.entries(rollup.weightSections ?? {})) {
    const next = ids.filter((id) => keep.has(id))
    if (next.length) weightSections[key] = next
  }
  const keys = Object.keys(weightSections)
  const share = keys.length ? 1 / keys.length : 1
  const weights = Object.fromEntries(keys.map((key) => [key, share]))
  const weightLabels = Object.fromEntries(
    keys.map((key) => [key, rollup.weightLabels?.[key] ?? key]),
  )
  const sectionWeights = rollup.sectionWeights
    ? Object.fromEntries(
        Object.entries(rollup.sectionWeights).filter(([id]) => keep.has(id)),
      )
    : undefined
  const templateWeights = rollup.templateWeights
    ? Object.fromEntries(
        Object.entries(rollup.templateWeights).filter(([id]) => keep.has(id)),
      )
    : undefined
  return {
    ...rollup,
    weightSections,
    weights,
    weightLabels,
    ...(sectionWeights && Object.keys(sectionWeights).length ? { sectionWeights } : {}),
    ...(templateWeights && Object.keys(templateWeights).length ? { templateWeights } : {}),
  }
}

/** Candidate-facing intro for Home Try kits — Harbor sample, no fixture jargon. */
export const TRY_INTERVIEW_CANDIDATE_DESCRIPTION = {
  talk: 'This is a practice conversational interview with Harbor, a notes product team. Speak as yourself. You will tell one story about work you owned. When you finish, you will see how you did.',
  coding:
    'This is a practice coding challenge from Harbor. You will write a small function for their weekly recap. Copilot can help. When you finish, you will see how you did.',
  full: 'This is a practice interview for a software engineer role at Harbor. You will fill a short form, write a small function, write a ship or wait memo, then a conversation. Take each stage in order. When you finish, you will see how you did.',
} as const

export function sliceTryInterviewBrief(
  source: Creator2BriefDocument,
  phaseIds: readonly string[],
  meta: {
    title: string
    roleTitle: string
    proposedMinutes: number
    candidateDescription: string
  },
  kit?: TryInterviewKitId,
): Creator2BriefDocument {
  const keep = new Set(phaseIds)
  const kept = source.phases.filter((phase) => keep.has(phase.id))
  const toolRefs = new Set(
    kept.map((phase) => phase.toolRef).filter((id): id is string => Boolean(id)),
  )
  const phases = kept.map((phase) => stripDeadGates(phase, keep, toolRefs))
  if (phases.length === 1 && phases[0]?.kind === 'discussion') {
    phases[0] = { ...phases[0], isOpening: true }
    delete phases[0].when
    delete phases[0].onFail
  }
  const topicIds = new Set(
    phases.map((phase) => phase.topicId).filter((id): id is string => Boolean(id)),
  )
  const tools = Object.fromEntries(
    Object.entries(source.tools).filter(([id]) => toolRefs.has(id)),
  )
  const topicLibrary = source.topicLibrary.filter((topic) => topicIds.has(topic.id))
  const estimatedMinutes = phases.reduce((sum, phase) => sum + (phase.estimatedMinutes ?? 0), 0)
  const doc = cloneBrief({
    ...source,
    phases,
    tools,
    topicLibrary,
    analysis: {
      ...source.analysis,
      rollup: filterRollup(source.analysis.rollup, keep),
    },
  })
  doc.definition = {
    ...doc.definition,
    meta: {
      ...doc.definition.meta,
      title: meta.title,
      roleTitle: meta.roleTitle,
      proposedMinutes: meta.proposedMinutes,
      estimatedMinutes,
      candidateDescription: meta.candidateDescription,
    },
  }
  doc.timingSummary = {
    ...doc.timingSummary,
    proposedMinutes: meta.proposedMinutes,
    estimatedMinutes,
    sumSections: estimatedMinutes,
  }
  const stamped = stampStructureCopilotAssist(doc)
  return kit ? adaptTryInterviewScenario(stamped, kit) : stamped
}

function talkBrief(): Creator2BriefDocument {
  return sliceTryInterviewBrief(
    STAFF,
    TALK_PHASE_IDS,
    {
      title: 'Test conversational interview',
      roleTitle: 'Software engineer',
      proposedMinutes: 8,
      candidateDescription: TRY_INTERVIEW_CANDIDATE_DESCRIPTION.talk,
    },
    'talk',
  )
}

function codingBrief(): Creator2BriefDocument {
  return sliceTryInterviewBrief(
    STAFF,
    CODING_PHASE_IDS,
    {
      title: 'Test coding interview',
      roleTitle: 'Software engineer',
      proposedMinutes: 20,
      candidateDescription: TRY_INTERVIEW_CANDIDATE_DESCRIPTION.coding,
    },
    'coding',
  )
}

function fullBrief(): Creator2BriefDocument {
  return sliceTryInterviewBrief(
    STAFF,
    FULL_PHASE_IDS,
    {
      title: 'Test full interview',
      roleTitle: 'Software engineer',
      proposedMinutes: 45,
      candidateDescription: TRY_INTERVIEW_CANDIDATE_DESCRIPTION.full,
    },
    'full',
  )
}

const BRIEFS: Record<TryInterviewKitId, () => Creator2BriefDocument> = {
  talk: talkBrief,
  coding: codingBrief,
  full: fullBrief,
}

const BRIEF_CACHE: Partial<Record<TryInterviewKitId, Creator2BriefDocument>> = {}

let pendingTryKit: TryInterviewKitId | null = null

export function setPendingTryInterviewKit(kit: TryInterviewKitId): void {
  pendingTryKit = kit
}

export function peekPendingTryInterviewKit(): TryInterviewKitId | null {
  return pendingTryKit
}

export function isTryInterviewKitId(value: string | null | undefined): value is TryInterviewKitId {
  return value === 'talk' || value === 'coding' || value === 'full'
}

/** Missing / unknown kit: coding (landing Try Vurify). */
export function resolveTryInterviewKit(raw: string | null | undefined): TryInterviewKitId {
  if (isTryInterviewKitId(raw)) return raw
  return 'coding'
}

export function tryInterviewBriefIdForKit(kit: TryInterviewKitId): string {
  return TRY_INTERVIEW_BRIEF_IDS[kit]
}

export function tryInterviewBriefForKit(kit: TryInterviewKitId): Creator2BriefDocument {
  const hit = BRIEF_CACHE[kit]
  if (hit) return hit
  const next = BRIEFS[kit]()
  BRIEF_CACHE[kit] = next
  return next
}
