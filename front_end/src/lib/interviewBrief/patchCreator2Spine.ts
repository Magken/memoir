import type {
  Creator2BriefDocument,
  Creator2Phase,
  Creator2Tool,
  Creator2Topic,
  Creator2When,
} from './creator2BriefTypes'
import { scrubReferencesToEarlier } from './creator2References'
import { priorSpineSets } from './creator2SpineRules'
import { impliedToolTemplateIds } from '../interviewRunApi/buildTalkContext'
import {
  codingAssessmentSample,
  formAssessmentSample,
  formToolFromSample,
  talkAssessmentSample,
  writingAssessmentSample,
} from './createSectionSamples'
import {
  canonicalizeRollupKey,
  keepRollupFolder,
  liveBoardFromCreator2,
} from './rollupFolders'

function shortId(prefix: string): string {
  return `${prefix}.${Math.random().toString(36).slice(2, 9)}`
}

function seedMinutes(doc: Creator2BriefDocument): number {
  const n = doc.definition.probeDefaults?.targetMinutes
  return typeof n === 'number' && n > 0 ? n : 5
}

function scrubWhen(when: Creator2When, removedPhaseId: string): Creator2When {
  if (!when) return when
  const filter = (list: NonNullable<NonNullable<Creator2When>['all']>) =>
    list.filter((c) => c.phaseCompleted !== removedPhaseId)
  const all = when.all ? filter(when.all) : undefined
  const any = when.any ? filter(when.any) : undefined
  if ((!all || all.length === 0) && (!any || any.length === 0)) return null
  return {
    ...(all?.length ? { all } : {}),
    ...(any?.length ? { any } : {}),
  }
}

function scrubDocRefs(doc: Creator2BriefDocument, removedPhaseId: string): Creator2BriefDocument {
  const phases = doc.phases.map((phase) => {
    let onFail = phase.onFail
    if (
      onFail &&
      typeof onFail === 'object' &&
      onFail.goToPhaseId === removedPhaseId
    ) {
      onFail = null
    }
    const earlier = priorSpineSets(
      doc.phases.filter((p) => p.id !== removedPhaseId),
      phase.id,
    )
    return {
      ...phase,
      when: scrubWhen(phase.when ?? null, removedPhaseId),
      onFail,
      references: scrubReferencesToEarlier(phase.references ?? null, earlier.phaseIds),
    }
  })
  return scrubRollupWeights({ ...doc, phases })
}

function scrubAllPhaseReferences(doc: Creator2BriefDocument): Creator2BriefDocument {
  const phases = doc.phases.map((phase) => ({
    ...phase,
    references: scrubReferencesToEarlier(
      phase.references ?? null,
      priorSpineSets(doc.phases, phase.id).phaseIds,
    ),
  }))
  return { ...doc, phases }
}

/** Drop Decision weights for leftover keys and families no longer on the spine. */
function scrubRollupWeights(doc: Creator2BriefDocument): Creator2BriefDocument {
  const weights = { ...(doc.analysis?.rollup?.weights ?? {}) }
  const liveBoard = liveBoardFromCreator2(doc)
  const rollupMaps = {
    weights,
    weightSections: doc.analysis?.rollup?.weightSections,
    weightTemplates: doc.analysis?.rollup?.weightTemplates,
    weightLabels: doc.analysis?.rollup?.weightLabels,
  }
  const next: Record<string, number | 'gate_only'> = {}
  for (const [rawKey, value] of Object.entries(weights)) {
    const k = canonicalizeRollupKey(rawKey)
    if (!keepRollupFolder(rawKey, rollupMaps, liveBoard)) continue
    if (
      (rawKey === 'coding' || rawKey === 'delivery' || rawKey === 'writing' || rawKey === 'doc') &&
      next[k] != null
    ) {
      continue
    }
    if (next[k] == null || rawKey === k) next[k] = value as number | 'gate_only'
  }
  const timingSections = doc.timingSummary?.sections
  const live = new Set(doc.phases.map((p) => p.id))
  const sections = Array.isArray(timingSections)
    ? timingSections.filter((row) => !row?.phaseId || live.has(String(row.phaseId)))
    : timingSections
  const prevSections = doc.analysis?.rollup?.weightSections ?? {}
  const nextSections: Record<string, string[]> = {}
  for (const [key, ids] of Object.entries(prevSections)) {
    if (!(key in next)) continue
    if (!Array.isArray(ids)) continue
    const kept = ids.map(String).filter((id) => live.has(id))
    if (kept.length) nextSections[key] = kept
  }
  const prevTemplates = doc.analysis?.rollup?.weightTemplates ?? {}
  const nextTemplates: Record<string, string[]> = {}
  for (const [key, ids] of Object.entries(prevTemplates)) {
    if (!(key in next)) continue
    if (!Array.isArray(ids)) continue
    nextTemplates[key] = ids.map(String).filter(Boolean)
  }
  const prevLabels = doc.analysis?.rollup?.weightLabels ?? {}
  const nextLabels: Record<string, string> = {}
  for (const [key, label] of Object.entries(prevLabels)) {
    if (!(key in next)) continue
    const text = String(label ?? '').trim()
    if (text) nextLabels[key] = text
  }
  return {
    ...doc,
    analysis: {
      ...doc.analysis,
      rollup: {
        ...doc.analysis.rollup,
        weights: next,
        weightSections: nextSections,
        weightTemplates: nextTemplates,
        weightLabels: nextLabels,
      },
    },
    timingSummary: doc.timingSummary
      ? { ...doc.timingSummary, ...(sections ? { sections } : {}) }
      : doc.timingSummary,
  }
}

function insertPhase(
  doc: Creator2BriefDocument,
  phase: Creator2Phase,
  afterPhaseId?: string | null,
  tools?: Record<string, Creator2Tool>,
  topicLibrary?: Creator2Topic[],
): Creator2BriefDocument {
  const phases = [...doc.phases]
  const at = afterPhaseId ? phases.findIndex((p) => p.id === afterPhaseId) : -1
  if (at >= 0) phases.splice(at + 1, 0, phase)
  else phases.push(phase)

  return {
    ...doc,
    phases,
    ...(tools ? { tools: { ...doc.tools, ...tools } } : {}),
    ...(topicLibrary ? { topicLibrary } : {}),
  }
}

/** Addable spine section kinds (Templates + Decision package are not spine inserts). */
export type SpineSectionKind = 'talk' | 'form' | 'coding' | 'doc'

export type SpineTalkOp =
  | { type: 'addTalk'; afterPhaseId?: string | null }
  | { type: 'addSection'; kind: SpineSectionKind; afterPhaseId?: string | null }
  | { type: 'removeTalk'; phaseId: string }
  | { type: 'moveTalk'; phaseId: string; direction: 'up' | 'down' }
  | { type: 'reorderPhases'; phaseIds: string[] }
  | { type: 'duplicateTalk'; phaseId: string }

export function patchCreator2Spine(
  doc: Creator2BriefDocument,
  op: SpineTalkOp,
): Creator2BriefDocument {
  switch (op.type) {
    case 'addTalk':
      return addTalk(doc, op.afterPhaseId)
    case 'addSection':
      if (op.kind === 'talk') return addTalk(doc, op.afterPhaseId)
      if (op.kind === 'form') return addForm(doc, op.afterPhaseId)
      if (op.kind === 'coding') return addCoding(doc, op.afterPhaseId)
      return addWriting(doc, op.afterPhaseId)
    case 'removeTalk':
      return removeTalk(doc, op.phaseId)
    case 'moveTalk':
      return moveTalk(doc, op.phaseId, op.direction)
    case 'reorderPhases':
      return reorderPhases(doc, op.phaseIds)
    case 'duplicateTalk':
      return duplicateTalk(doc, op.phaseId)
  }
}

function addTalk(
  doc: Creator2BriefDocument,
  afterPhaseId?: string | null,
): Creator2BriefDocument {
  const topicId = shortId('topic')
  const phaseId = shortId('ph')
  const sample = talkAssessmentSample(topicId, seedMinutes(doc))
  const topic: Creator2Topic = {
    id: topicId,
    label: sample.label,
    purpose: sample.purpose,
    targetMinutes: sample.minutes,
    probes: sample.probes,
    targets: sample.targets,
    analysis: { attachPack: null, templateIds: sample.templateIds },
  }
  const phase: Creator2Phase = {
    id: phaseId,
    kind: 'discussion',
    topicId,
    title: sample.label,
    estimatedMinutes: sample.minutes,
    summary: {
      blurb: sample.blurb,
    },
  }

  return insertPhase(doc, phase, afterPhaseId, undefined, [
    ...doc.topicLibrary,
    topic,
  ])
}

function addForm(
  doc: Creator2BriefDocument,
  afterPhaseId?: string | null,
): Creator2BriefDocument {
  const toolRef = shortId('tool.form')
  const phaseId = shortId('ph')
  const sample = formAssessmentSample()
  const tool: Creator2Tool = {
    ...formToolFromSample(sample, { estimatedMinutes: sample.minutes }),
  }
  const phase: Creator2Phase = {
    id: phaseId,
    kind: 'tool',
    toolRef,
    title: sample.title,
    estimatedMinutes: sample.minutes,
    summary: {
      blurb: sample.blurb,
      packLabel: sample.packLabel,
    },
  }
  return insertPhase(doc, phase, afterPhaseId, { [toolRef]: tool })
}

function addCoding(
  doc: Creator2BriefDocument,
  afterPhaseId?: string | null,
): Creator2BriefDocument {
  const toolRef = shortId('tool.coding')
  const phaseId = shortId('ph')
  const sample = codingAssessmentSample(seedMinutes(doc))
  const tool: Creator2Tool = {
    type: 'coding',
    title: sample.title,
    instructions: sample.instructions,
    editorKind: 'code',
    timing: {
      mode: 'timed',
      estimatedMinutes: sample.minutes,
      limitMinutes: 25,
    },
    languages: ['typescript', 'python'],
    defaultLanguage: 'typescript',
    artifact: {
      docKind: 'code',
      nodeId: null,
      inline: sample.workspace,
    },
    tests: sample.testsBundle,
    analysis: {
      attachPack: null,
      templateIds: impliedToolTemplateIds('coding'),
    },
  }
  const phase: Creator2Phase = {
    id: phaseId,
    kind: 'tool',
    toolRef,
    title: sample.title,
    estimatedMinutes: sample.minutes,
    summary: {
      blurb: sample.blurb,
      packLabel: sample.packLabel,
    },
  }
  return insertPhase(doc, phase, afterPhaseId, { [toolRef]: tool })
}

function addWriting(
  doc: Creator2BriefDocument,
  afterPhaseId?: string | null,
): Creator2BriefDocument {
  const toolRef = shortId('tool.doc')
  const phaseId = shortId('ph')
  const sample = writingAssessmentSample(seedMinutes(doc))
  const tool: Creator2Tool = {
    type: 'doc',
    title: sample.title,
    instructions: sample.instructions,
    editorKind: 'doc',
    timing: {
      mode: 'untimed',
      estimatedMinutes: sample.minutes,
      limitMinutes: null,
    },
    prompt: sample.prompt,
    assessment: sample.assessment,
    minWords: sample.minWords,
    maxWords: sample.maxWords,
    artifact: {
      docKind: 'doc',
      nodeId: null,
      inline: sample.inline,
    },
    analysis: {
      attachPack: null,
      templateIds: impliedToolTemplateIds('doc'),
    },
  }
  const phase: Creator2Phase = {
    id: phaseId,
    kind: 'tool',
    toolRef,
    title: sample.title,
    estimatedMinutes: sample.minutes,
    summary: {
      blurb: sample.blurb,
      packLabel: sample.packLabel,
    },
  }
  return insertPhase(doc, phase, afterPhaseId, { [toolRef]: tool })
}

function removeTalk(doc: Creator2BriefDocument, phaseId: string): Creator2BriefDocument {
  const phase = doc.phases.find((p) => p.id === phaseId)
  if (!phase) return doc

  if (phase.kind === 'discussion') {
    const topicId = phase.topicId
    const phases = doc.phases.filter((p) => p.id !== phaseId)
    const stillUsed =
      topicId != null &&
      phases.some((p) => p.kind === 'discussion' && p.topicId === topicId)
    const topicLibrary =
      topicId && !stillUsed
        ? doc.topicLibrary.filter((t) => t.id !== topicId)
        : doc.topicLibrary
    return scrubDocRefs({ ...doc, phases, topicLibrary }, phaseId)
  }

  const toolRef = phase.toolRef
  const phases = doc.phases.filter((p) => p.id !== phaseId)
  let tools = doc.tools
  if (toolRef && !phases.some((p) => p.toolRef === toolRef)) {
    const { [toolRef]: _removed, ...rest } = doc.tools
    tools = rest
  }
  return scrubDocRefs({ ...doc, phases, tools }, phaseId)
}

function moveTalk(
  doc: Creator2BriefDocument,
  phaseId: string,
  direction: 'up' | 'down',
): Creator2BriefDocument {
  const phases = [...doc.phases]
  const i = phases.findIndex((p) => p.id === phaseId)
  if (i < 0) return doc
  const j = direction === 'up' ? i - 1 : i + 1
  if (j < 0 || j >= phases.length) return doc
  ;[phases[i], phases[j]] = [phases[j], phases[i]]
  return scrubAllPhaseReferences({ ...doc, phases })
}

/** Reorder spine phases to match a full permutation (Contents drag). */
function reorderPhases(
  doc: Creator2BriefDocument,
  phaseIds: string[],
): Creator2BriefDocument {
  if (phaseIds.length !== doc.phases.length) return doc
  const byId = new Map(doc.phases.map((phase) => [phase.id, phase]))
  if (phaseIds.some((id) => !byId.has(id))) return doc
  const seen = new Set<string>()
  for (const id of phaseIds) {
    if (seen.has(id)) return doc
    seen.add(id)
  }
  return scrubAllPhaseReferences({
    ...doc,
    phases: phaseIds.map((id) => byId.get(id)!),
  })
}

function duplicateTalk(doc: Creator2BriefDocument, phaseId: string): Creator2BriefDocument {
  const phase = doc.phases.find((p) => p.id === phaseId)
  if (!phase) return doc

  if (phase.kind === 'discussion') {
    if (!phase.topicId) return doc
    const topic = doc.topicLibrary.find((t) => t.id === phase.topicId)
    if (!topic) return doc

    const topicId = shortId('topic')
    const newPhaseId = shortId('ph')
    const clonedTopic: Creator2Topic = {
      ...structuredClone(topic),
      id: topicId,
      label: `${topic.label} (copy)`,
      probes: topic.probes.map((p) => ({ ...p, id: shortId('p') })),
    }
    const clonedPhase: Creator2Phase = {
      ...structuredClone(phase),
      id: newPhaseId,
      topicId,
      title: `${phase.title ?? topic.label} (copy)`,
      isOpening: undefined,
      isClosing: undefined,
    }

    const phases = [...doc.phases]
    const at = phases.findIndex((p) => p.id === phaseId)
    phases.splice(at + 1, 0, clonedPhase)

    return {
      ...doc,
      topicLibrary: [...doc.topicLibrary, clonedTopic],
      phases,
    }
  }

  if (!phase.toolRef) return doc
  const tool = doc.tools[phase.toolRef]
  if (!tool) return doc
  const typeKey = String(tool.type ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  let refKind: 'coding' | 'doc' | 'form' | null =
    typeKey === 'coding' || tool.editorKind === 'code'
      ? 'coding'
      : typeKey === 'doc' || typeKey === 'writing' || typeKey === 'essay' || tool.editorKind === 'doc'
        ? 'doc'
        : typeKey === 'form_quiz' ||
            typeKey === 'form' ||
            typeKey === 'assessment' ||
            typeKey === 'screening' ||
            tool.editorKind === 'testform'
          ? 'form'
          : null
  // Never silent-default unknown types to Form — refuse the duplicate.
  if (!refKind) return doc
  const toolRef = shortId(
    refKind === 'coding' ? 'tool.coding' : refKind === 'doc' ? 'tool.doc' : 'tool.form',
  )
  const newPhaseId = shortId('ph')
  const clonedTool = structuredClone(tool)
  clonedTool.title = `${tool.title} (copy)`
  const clonedPhase: Creator2Phase = {
    ...structuredClone(phase),
    id: newPhaseId,
    toolRef,
    title: `${phase.title ?? tool.title} (copy)`,
  }
  const phases = [...doc.phases]
  const at = phases.findIndex((p) => p.id === phaseId)
  phases.splice(at + 1, 0, clonedPhase)
  return {
    ...doc,
    phases,
    tools: { ...doc.tools, [toolRef]: clonedTool },
  }
}
