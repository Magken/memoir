import type {
  Creator2BriefDocument,
  Creator2Topic,
  Creator2When,
} from './creator2BriefTypes'
import { toCreator2OnFail } from './creator2OnFail'
import { patchPhaseReferences } from './creator2References'
import {
  isForwardJump,
  priorSpineSets,
  scrubWhenToEarlier,
} from './creator2SpineRules'
import { TALK_KIND_LABEL } from './interviewLandingView'
import type { InterviewFlowProbeDefaults, InterviewFlowTalkEditorState } from './flowTimelineTypes'
import { setLivePhaseTemplateWeights } from './rollupFolders'

function shortId(prefix: string): string {
  return `${prefix}.${Math.random().toString(36).slice(2, 9)}`
}

/** Rebuild timingSummary from live phases so budget UI stays correct. */
function rebuildTimingSummary(
  doc: Creator2BriefDocument,
): Creator2BriefDocument['timingSummary'] {
  const prev = doc.timingSummary
  const sections = doc.phases.map((p) => ({
    phaseId: p.id,
    kind: p.kind,
    estimatedMinutes: p.estimatedMinutes ?? 0,
  }))
  const sumSections = sections.reduce((a, s) => a + (s.estimatedMinutes || 0), 0)
  const slack = prev?.slackMinutes ?? doc.definition.meta.timing?.slackMinutes ?? 2
  const proposed =
    prev?.proposedMinutes ?? doc.definition.meta.proposedMinutes ?? sumSections
  const estimated = sumSections + slack
  return {
    ...prev,
    proposedMinutes: proposed,
    estimatedMinutes: estimated,
    sumSections,
    slackMinutes: slack,
    fitsProposed: estimated <= proposed + slack,
    sections,
  }
}

function buildSparseTopic(
  next: InterviewFlowTalkEditorState,
  defaults: InterviewFlowProbeDefaults,
): Creator2Topic {
  const topicLabel =
    next.topicLabel.trim() || next.sectionTitle.trim() || TALK_KIND_LABEL
  const purpose = next.purpose.trim() || next.summaryBlurb.trim()
  const targetMinutes = Math.max(1, Math.round(next.targetMinutes) || 1)

  const topic: Creator2Topic = {
    id: next.topicId,
    label: topicLabel,
    purpose: purpose || undefined,
    targetMinutes,
    behaviourPromptOverride: next.behaviourPromptOverride?.trim() || null,
    probes: next.probes.map((p, order) => ({
      id: p.id,
      goal: p.goal,
      required: p.required,
      hint: p.hint ?? null,
      order,
    })),
    targets: next.targets.map((t) => ({
      key: t.key,
      label: t.label,
      required: t.required,
      datatype: t.datatype,
      description: t.description,
      enumValues: t.enumValues,
    })),
    analysis: {
      attachPack: null,
      templateIds: [...next.templateIds],
    },
  }

  if (next.maxFollowUps != null && next.maxFollowUps !== defaults.maxFollowUps) {
    topic.maxFollowUps = next.maxFollowUps
  }
  if (next.maxProbes != null && next.maxProbes !== defaults.maxProbes) {
    topic.maxProbes = next.maxProbes
  }
  if (next.minCandidateTurns != null && next.minCandidateTurns !== defaults.minCandidateTurns) {
    topic.minCandidateTurns = next.minCandidateTurns
  }

  return topic
}

/**
 * Patch discussion phase + bound topic from the timeline talk editor.
 * Enforces 1:1 phase↔topic: if the topic is shared, clone before mutating.
 */
export function patchCreator2TalkStep(
  doc: Creator2BriefDocument,
  phaseId: string,
  next: InterviewFlowTalkEditorState,
): Creator2BriefDocument {
  // Prefer the paired fields the Creator UI writes (sectionTitle / summaryBlurb).
  const sectionTitle =
    next.sectionTitle.trim() || next.topicLabel.trim() || TALK_KIND_LABEL
  const summaryBlurb = next.summaryBlurb.trim() || next.purpose.trim()
  const packLabel = next.packLabel.trim()
  const targetMinutes = Math.max(1, Math.round(next.targetMinutes) || 1)
  const defaults = (doc.definition.probeDefaults ?? {}) as InterviewFlowProbeDefaults
  const synced: InterviewFlowTalkEditorState = {
    ...next,
    sectionTitle,
    topicLabel: sectionTitle,
    summaryBlurb,
    purpose: summaryBlurb,
  }

  let topicId = synced.topicId
  const sharedCount = doc.phases.filter(
    (p) => p.kind === 'discussion' && p.topicId === topicId,
  ).length
  let topicLibrary = [...doc.topicLibrary]
  const existing = topicLibrary.find((t) => t.id === topicId)

  if (sharedCount > 1 && existing) {
    topicId = shortId('topic')
    const cloned = buildSparseTopic({ ...synced, topicId }, defaults)
    topicLibrary = [...topicLibrary, cloned]
  } else {
    const topic = buildSparseTopic({ ...synced, topicId }, defaults)
    topicLibrary = existing
      ? topicLibrary.map((t) => (t.id === topicId ? topic : t))
      : [...topicLibrary, topic]
  }

  const phases = doc.phases.map((phase) => {
    if (phase.id !== phaseId) return phase
    const orderedIds = doc.phases.map((p) => p.id)
    const jumpId =
      synced.onFail === 'goToPhase' &&
      synced.onFailPhaseId &&
      isForwardJump(orderedIds, phaseId, synced.onFailPhaseId)
        ? synced.onFailPhaseId
        : synced.onFail === 'goToPhase'
          ? null
          : synced.onFailPhaseId
    const onFail =
      synced.onFail === 'goToPhase' && !jumpId
        ? 'skip'
        : toCreator2OnFail(synced.onFail, jumpId)
    const when = scrubWhenToEarlier(
      synced.when as Creator2When,
      priorSpineSets(doc.phases, phaseId),
    ) as Creator2When
    const references = patchPhaseReferences(
      phaseId,
      synced.referencesPhaseIds ?? synced.referencesPhaseId,
      doc.phases,
    )
    return {
      ...phase,
      title: sectionTitle,
      topicId,
      // Drop static tags — mapper derives live chips only.
      summary: {
        blurb: summaryBlurb || undefined,
        packLabel: packLabel || undefined,
      },
      estimatedMinutes: targetMinutes,
      isOpening: synced.isOpening && !synced.isClosing ? true : undefined,
      isClosing: synced.isClosing && !synced.isOpening ? true : undefined,
      required: synced.required || undefined,
      onFail,
      when,
      references,
      notes: synced.notes?.trim() || null,
    }
  })

  const withPhases: Creator2BriefDocument = {
    ...doc,
    phases,
    topicLibrary,
    definition: {
      ...doc.definition,
      meta: {
        ...doc.definition.meta,
        estimatedMinutes: undefined,
      },
    },
  }

  return setLivePhaseTemplateWeights(
    {
      ...withPhases,
      timingSummary: rebuildTimingSummary(withPhases),
    },
    phaseId,
    next.templateIds,
    next.templateWeights,
  )
}
