import type { Creator2BriefDocument } from './creator2BriefTypes'
import { lockedToolTemplateIds } from '../interviewRunApi/buildTalkContext'
import { patchPhaseReferences } from './creator2References'
import { toCreator2OnFail } from './creator2OnFail'
import { isForwardJump } from './creator2SpineRules'
import type { InterviewFlowFormEditorState } from './flowTimelineTypes'
import { toolAssistForStore } from './toolAssistBundles'
import { setLivePhaseTemplateWeights } from './rollupFolders'

/** Patch tool form artifact + phase copy / gate / fail meta from the timeline form editor. */
export function patchCreator2FormStep(
  doc: Creator2BriefDocument,
  phaseId: string,
  next: InterviewFlowFormEditorState,
): Creator2BriefDocument {
  const sectionTitle = next.sectionTitle.trim()
  const summaryBlurb = next.summaryBlurb.trim()
  const packLabel = next.packLabel.trim()
  const document = {
    ...next.document,
    title: sectionTitle || next.document.title,
  }

  const phases = doc.phases.map((phase) => {
    if (phase.id !== phaseId) return phase
    const orderedIds = doc.phases.map((p) => p.id)
    const jumpId =
      next.onFail === 'goToPhase' &&
      next.onFailPhaseId &&
      isForwardJump(orderedIds, phaseId, next.onFailPhaseId)
        ? next.onFailPhaseId
        : next.onFail === 'goToPhase'
          ? null
          : next.onFailPhaseId
    const onFail =
      next.onFail === 'goToPhase' && !jumpId
        ? 'skip'
        : toCreator2OnFail(next.onFail, jumpId)
    const references = patchPhaseReferences(
      phaseId,
      next.referencesPhaseIds ?? next.referencesPhaseId,
      doc.phases,
    )
    return {
      ...phase,
      title: sectionTitle || phase.title,
      summary: {
        blurb: summaryBlurb || undefined,
        packLabel: packLabel || undefined,
        // Drop static tags — mapper derives question/gate chips from the live form.
      },
      estimatedMinutes: next.estimatedMinutes ?? phase.estimatedMinutes,
      onFail,
      references,
    }
  })

  const prevTool = doc.tools[next.toolRef]
  if (!prevTool) {
    return { ...doc, phases }
  }

  const requiredIds = document.questions.filter((q) => q.required).map((q) => q.id)
  const passThreshold = next.isGate
    ? {
        mode: 'required_items' as const,
        minScore: null,
        requiredQuestionIds:
          requiredIds.length > 0
            ? requiredIds
            : document.questions.slice(0, 1).map((q) => q.id),
      }
    : undefined

  const prevArtifact =
    prevTool.artifact && typeof prevTool.artifact === 'object'
      ? (prevTool.artifact as Record<string, unknown>)
      : {}

  const nextTool = {
    ...prevTool,
    title: sectionTitle || document.title || prevTool.title,
    timing: {
      ...prevTool.timing,
      mode: (next.timed ? 'timed' : 'untimed') as 'timed' | 'untimed',
      estimatedMinutes: next.estimatedMinutes ?? prevTool.timing?.estimatedMinutes,
      limitMinutes: next.timed
        ? (next.limitMinutes ?? next.estimatedMinutes ?? 5)
        : null,
    },
    artifact: {
      ...prevArtifact,
      docKind: 'form',
      inline: document,
    },
  }
  const assistStore = toolAssistForStore(next.assist)
  if (assistStore) nextTool.assist = assistStore
  else delete nextTool.assist
  nextTool.analysis = {
    ...(prevTool.analysis ?? {}),
    attachPack: prevTool.analysis?.attachPack ?? null,
    templateIds: lockedToolTemplateIds({
      toolType: 'form_quiz',
      stored: prevTool.analysis?.templateIds,
      assistChat: next.assist?.chat,
    }),
  }
  if (passThreshold) {
    nextTool.passThreshold = passThreshold
  } else {
    delete nextTool.passThreshold
  }

  return setLivePhaseTemplateWeights(
    {
      ...doc,
      phases,
      tools: {
        ...doc.tools,
        [next.toolRef]: nextTool,
      },
    },
    phaseId,
    next.analysisTemplateIds,
    next.templateWeights,
  )
}
