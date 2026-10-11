import type { Creator2BriefDocument } from './creator2BriefTypes'
import { toCreator2OnFail } from './creator2OnFail'
import { patchPhaseReferences } from './creator2References'
import { isForwardJump } from './creator2SpineRules'
import type { InterviewFlowDocEditorState } from './flowTimelineTypes'
import { lockedToolTemplateIds } from '../interviewRunApi/buildTalkContext'
import { toolAssistForStore } from './toolAssistBundles'
import { normalizeRubricDimension } from './writingDocCompose'
import { setLivePhaseTemplateWeights } from './rollupFolders'

/** Patch writing/doc tool prompt + assessment + artifact + phase copy from the timeline editor. */
export function patchCreator2DocStep(
  doc: Creator2BriefDocument,
  phaseId: string,
  next: InterviewFlowDocEditorState,
): Creator2BriefDocument {
  const sectionTitle = next.sectionTitle.trim()
  const summaryBlurb = next.summaryBlurb.trim()
  const packLabel = next.packLabel.trim()
  const instructions = next.instructions.trim()
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

  const prevArtifact =
    prevTool.artifact && typeof prevTool.artifact === 'object'
      ? (prevTool.artifact as Record<string, unknown>)
      : {}

  const assistStore = toolAssistForStore(next.assist)
  const nextTool = {
        ...prevTool,
        title: sectionTitle || prevTool.title,
        instructions: instructions || prevTool.instructions,
        minWords: next.minWords,
        maxWords: next.maxWords,
        timing: {
          ...prevTool.timing,
          mode: (next.timed ? 'timed' : 'untimed') as 'timed' | 'untimed',
          estimatedMinutes: next.estimatedMinutes ?? prevTool.timing?.estimatedMinutes,
          limitMinutes: next.timed
            ? (next.limitMinutes ?? next.estimatedMinutes ?? 15)
            : null,
        },
        prompt: {
          brief: next.prompt.brief,
          structure: next.prompt.structure.map((s) => ({
            id: s.id,
            label: s.label,
            hint: s.hint,
            minParagraphs: s.minParagraphs,
          })),
          requirements: [...next.prompt.requirements],
        },
        assessment: {
          kind: next.assessment.kind,
          dimensions: next.assessment.dimensions.map((d, i) => {
            const dim = normalizeRubricDimension(d, i)
            return {
              key: dim.key,
              label: dim.label,
              criterion: dim.criterion,
              ...(dim.weight != null ? { weight: dim.weight } : {}),
              ...(dim.structureIds != null ? { structureIds: [...dim.structureIds] } : {}),
              bands: dim.bands.map((b) => ({
                id: b.id,
                label: b.label,
                descriptor: b.descriptor,
              })),
              /** Mirror labels for older consumers that still read `options`. */
              options: dim.bands.map((b) => b.label),
            }
          }),
          formatNotes: next.assessment.formatNotes,
        },
        artifact: {
          ...prevArtifact,
          docKind: 'doc',
          inline: document,
        },
      }
  if (assistStore) nextTool.assist = assistStore
  else delete nextTool.assist
  nextTool.analysis = {
    ...(prevTool.analysis ?? {}),
    attachPack: prevTool.analysis?.attachPack ?? null,
    templateIds: lockedToolTemplateIds({
      toolType: 'doc',
      stored: prevTool.analysis?.templateIds,
      assistChat: next.assist?.chat,
    }),
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
