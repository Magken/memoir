import type { Creator2BriefDocument } from './creator2BriefTypes'
import { toCreator2OnFail } from './creator2OnFail'
import { patchPhaseReferences } from './creator2References'
import { isForwardJump } from './creator2SpineRules'
import {
  ensureCodingTestFiles,
  resolveCodingTestsFromWorkspace,
} from './codingWorkspaceFiles'
import {
  normalizeCodingLanguages,
  resolveCodingDefaultLanguage,
} from './codingLanguages'
import type { InterviewFlowCodingEditorState } from './flowTimelineTypes'
import { lockedToolTemplateIds } from '../interviewRunApi/buildTalkContext'
import { toolAssistForStore } from './toolAssistBundles'
import { setLivePhaseTemplateWeights } from './rollupFolders'

/** Patch coding tool — workspace is source of truth; `tests` mirrors `tests/cases.json`. */
export function patchCreator2CodingStep(
  doc: Creator2BriefDocument,
  phaseId: string,
  next: InterviewFlowCodingEditorState,
): Creator2BriefDocument {
  const sectionTitle = next.sectionTitle.trim()
  const summaryBlurb = next.summaryBlurb.trim()
  const packLabel = next.packLabel.trim()
  const instructions = next.instructions.trim()
  const languages = normalizeCodingLanguages(next.languages)
  const defaultLanguage = resolveCodingDefaultLanguage(languages, next.defaultLanguage)

  const tests = resolveCodingTestsFromWorkspace(next.workspace, {
    runner: next.tests.runner || 'hidden_cases_v1',
    entryPoint: next.tests.entryPoint.trim() || 'solve',
    cases: next.tests.cases,
    referenceSolution: next.tests.referenceSolution ?? null,
  })

  const workspace = ensureCodingTestFiles(
    {
      ...next.workspace,
      title: sectionTitle || next.workspace.title,
    },
    tests,
    { preferExistingFiles: true },
  )

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

  const cases = tests.cases.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description?.trim() || undefined,
    args: c.args,
    expected: c.expected,
    compare: c.compare,
    hidden: c.hidden,
    timeoutMs: c.timeoutMs ?? null,
  }))

  const assistStore = toolAssistForStore(next.assist)
  const nextTool = {
    ...prevTool,
    type: 'coding',
    editorKind: 'code',
    title: sectionTitle || prevTool.title,
    instructions: instructions || prevTool.instructions,
    languages,
    defaultLanguage,
    timing: {
      ...prevTool.timing,
      mode: (next.timed ? 'timed' : 'untimed') as 'timed' | 'untimed',
      estimatedMinutes: next.estimatedMinutes ?? prevTool.timing?.estimatedMinutes,
      limitMinutes: next.timed
        ? (next.limitMinutes ?? next.estimatedMinutes ?? 20)
        : null,
    },
    artifact: {
      ...prevArtifact,
      docKind: 'code',
      inline: workspace,
    },
    tests: {
      runner: tests.runner,
      entryPoint: tests.entryPoint,
      cases,
      referenceSolution: tests.referenceSolution,
    },
  }
  if (assistStore) nextTool.assist = assistStore
  else delete nextTool.assist
  nextTool.analysis = {
    ...(prevTool.analysis ?? {}),
    attachPack: prevTool.analysis?.attachPack ?? null,
    templateIds: lockedToolTemplateIds({
      toolType: 'coding',
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
