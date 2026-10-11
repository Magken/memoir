import { impliedToolTemplateIds } from '../interviewRunApi/buildTalkContext'
import { emptyComposeMeta, emptyCreator2BriefDocument } from './compose'
import { TALK_KIND_LABEL } from './interviewLandingView'
import type { Creator2BriefDocument, Creator2Topic } from './creator2BriefTypes'
import { MIDDLE_TALK_TEMPLATE_IDS } from './createSectionSamples'
import type { SpineSectionKind } from './patchCreator2Spine'
import { patchCreator2Spine } from './patchCreator2Spine'
import {
  namedFoldersFromLiveSpine,
  readPhaseTemplateWeights,
  seedAllSectionTemplateWeights,
} from './rollupFolders'
import { countedGradeTemplateIds, ensureSectionTemplateWeights } from './rollupWeights'

export { MIDDLE_TALK_TEMPLATE_IDS } from './createSectionSamples'

const FORBIDDEN_TALK_IDS = [
  'iv.conflict.v1',
  'iv.design.v1',
  'mark.doc.brief.v1',
  'mark.form.rubric.v1',
  'mark.doc.rubric.v1',
] as const

export type CreateTemplateId =
  | 'create.form'
  | 'create.talk'
  | 'create.coding'
  | 'create.doc'
  | 'create.full'

export type CreateTemplateEntry = {
  id: CreateTemplateId
  title: string
  summary: string
  description: string
  kinds: readonly SpineSectionKind[]
}

export const CREATE_TEMPLATE_KIND_LABEL: Record<SpineSectionKind, string> = {
  form: 'Form',
  talk: TALK_KIND_LABEL,
  coding: 'Coding',
  doc: 'Writing',
}

/** First-order picker rows — same order as the editor Add bar, then the combo. */
export const CREATE_TEMPLATE_CATALOG: readonly CreateTemplateEntry[] = [
  {
    id: 'create.form',
    title: 'Form assessment',
    summary: 'Screening sample with an answer key',
    description:
      'A screening form that already covers every question type: short answer, multiple choice, checkboxes, dropdown, fill-in, scales, a grid, and a paragraph, with an answer key filled in. Treat it as a kit: retitle the form for this role, swap questions, or add a conversation beside it.',
    kinds: ['form'],
  },
  {
    id: 'create.talk',
    title: 'Conversation assessment',
    summary: 'Sample conversation with probes and targets',
    description:
      'A sample conversation with three probes, harvest targets, and delivery plus content marks already attached. Rewrite the probes for this role, or ask to add a form, coding, or writing section beside the conversation.',
    kinds: ['talk'],
  },
  {
    id: 'create.coding',
    title: 'Coding assessment',
    summary: 'Timed two-sum with hidden tests',
    description:
      'A timed two-sum drill with a problem README, TypeScript and Python solve files, and hidden tests. Change the prompt, languages, or cases for this role, or add a form or conversation around the drill.',
    kinds: ['coding'],
  },
  {
    id: 'create.doc',
    title: 'Writing assessment',
    summary: 'Essay with outline and rubric',
    description:
      'A writing assessment with a Situation / Decision / Impact outline, a sample answer scaffold, and a five-criterion rubric. Rewrite the prompt and bands for this role, or add a form, conversation, or coding section beside the essay.',
    kinds: ['doc'],
  },
  {
    id: 'create.full',
    title: 'Full interview',
    summary: 'Four sections plus a Decision package',
    description:
      'A full sample loop: form, conversation, coding, and writing, with a Decision package already weighted. Treat the content as a kit. Tailor the section that matters first, or upload a brief so the loop starts from that role.',
    kinds: ['form', 'talk', 'coding', 'doc'],
  },
]

export function createTemplateEntry(id: string): CreateTemplateEntry {
  const entry = CREATE_TEMPLATE_CATALOG.find((row) => row.id === id)
  if (!entry) throw new Error(`Unknown create template id: ${id}`)
  return entry
}

type SpineFamilies = {
  hasForm: boolean
  hasCoding: boolean
  hasDoc: boolean
  hasTalk: boolean
}

function toolTypeOf(
  doc: Creator2BriefDocument,
  phase: Creator2BriefDocument['phases'][number],
): string {
  if (phase.kind !== 'tool' || !phase.toolRef) return ''
  return String(doc.tools[phase.toolRef]?.type ?? '').trim()
}

export function spineFamilies(doc: Creator2BriefDocument): SpineFamilies {
  let hasForm = false
  let hasCoding = false
  let hasDoc = false
  let hasTalk = false
  for (const phase of doc.phases ?? []) {
    if (phase.kind === 'discussion') {
      hasTalk = true
      continue
    }
    const t = toolTypeOf(doc, phase)
    if (t === 'form_quiz' || /form/i.test(t)) hasForm = true
    if (t === 'coding' || /cod/i.test(t)) hasCoding = true
    if (t === 'doc' || /writ|essay/i.test(t)) hasDoc = true
  }
  return { hasForm, hasCoding, hasDoc, hasTalk }
}

function finishTalkAnalysis(topic: Creator2Topic): Creator2Topic {
  const stored = (topic.analysis?.templateIds ?? [])
    .map((id) => String(id).trim())
    .filter(Boolean)
  const templateIds = stored.length ? stored : [...MIDDLE_TALK_TEMPLATE_IDS]
  return {
    ...topic,
    analysis: {
      attachPack: null,
      templateIds,
    },
  }
}

export function finishCreateTemplateAnalysis(
  doc: Creator2BriefDocument,
): Creator2BriefDocument {
  const topicLibrary = (doc.topicLibrary ?? []).map(finishTalkAnalysis)
  const named = namedFoldersFromLiveSpine({
    phases: doc.phases,
    tools: doc.tools,
  })
  const prevRollup = { ...(doc.analysis.rollup ?? {}) }
  delete prevRollup.weightTemplates
  return seedAllSectionTemplateWeights({
    ...doc,
    topicLibrary,
    analysis: {
      ...doc.analysis,
      rollup: {
        ...prevRollup,
        templateId: doc.analysis.rollup?.templateId || 'rollup.attempt.v1',
        weights: named.weights,
        weightSections: named.weightSections,
        weightLabels: named.weightLabels,
      },
    },
  })
}

function stampTemplateTiming(doc: Creator2BriefDocument): Creator2BriefDocument {
  const estimatedMinutes = (doc.phases ?? []).reduce(
    (sum, phase) => sum + (typeof phase.estimatedMinutes === 'number' ? phase.estimatedMinutes : 0),
    0,
  )
  return {
    ...doc,
    definition: {
      ...doc.definition,
      meta: {
        ...doc.definition.meta,
        proposedMinutes: estimatedMinutes || undefined,
        estimatedMinutes: estimatedMinutes || undefined,
      },
    },
    timingSummary: {
      ...(doc.timingSummary ?? {}),
      estimatedMinutes,
      proposedMinutes: estimatedMinutes,
    },
  }
}


export function buildBlankCreateDocument(): Creator2BriefDocument {
  return emptyCreator2BriefDocument(emptyComposeMeta())
}

export function buildCreateTemplateDocument(id: string): Creator2BriefDocument {
  const entry = createTemplateEntry(id)
  let doc = emptyCreator2BriefDocument(emptyComposeMeta())
  for (const kind of entry.kinds) {
    doc = patchCreator2Spine(doc, { type: 'addSection', kind })
  }
  const timed = stampTemplateTiming(finishCreateTemplateAnalysis(doc))
  return {
    ...timed,
    definition: {
      ...timed.definition,
      meta: {
        ...timed.definition.meta,
        title: entry.title,
        roleDescription: entry.description,
      },
    },
  }
}

export function canOpenCreator2Builder(
  doc: Creator2BriefDocument | null | undefined,
  from: 'picker' | 'generate',
): boolean {
  if (!doc) return false
  if (from === 'picker') return true
  return Array.isArray(doc.phases) && doc.phases.length > 0
}

const CONFLICT_PAIRS: readonly [string, string][] = [
  ['iv.content.v1', 'iv.star.v1'],
  ['iv.content.v1', 'iv.ownership.v1'],
]

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((id, i) => id === b[i])
}

/** Issues that make a picker seed inaccurate for the live Creator-2 editor. */
export function createTemplateAccuracyIssues(doc: Creator2BriefDocument): string[] {
  const issues: string[] = []
  const rawLibrary = doc.analysis?.overrides?.libraryIds
  const libraryIds = Array.isArray(rawLibrary) ? rawLibrary.map(String) : []
  for (const id of libraryIds) {
    if (id.startsWith('mark.') || id === 'synth.tool.v1') {
      issues.push(`Templates shelf must not list ${id}`)
    }
  }

  for (const topic of doc.topicLibrary ?? []) {
    const pack = topic.analysis?.attachPack ?? null
    if (pack) issues.push(`Conversation ${topic.id} must use templateIds, not attachPack ${pack}`)
    const ids = (topic.analysis?.templateIds ?? []).map(String)
    for (const id of ids) {
      if (id.startsWith('mark.') || id === 'synth.tool.v1') {
        issues.push(`Conversation ${topic.id} must not attach ${id}`)
      }
      if ((FORBIDDEN_TALK_IDS as readonly string[]).includes(id)) {
        issues.push(`Conversation ${topic.id} uses abandoned template ${id}`)
      }
    }
    for (const [a, b] of CONFLICT_PAIRS) {
      if (ids.includes(a) && ids.includes(b)) {
        issues.push(`Conversation ${topic.id} attaches conflicting ${a} + ${b}`)
      }
    }
  }

  for (const phase of doc.phases ?? []) {
    if (phase.kind !== 'tool' || !phase.toolRef) continue
    const tool = doc.tools[phase.toolRef]
    const type = String(tool?.type ?? '')
    const implied = impliedToolTemplateIds(type)
    const stored = (tool?.analysis?.templateIds ?? []).map(String)
    if (implied.length && !sameIds(stored, implied)) {
      issues.push(
        `Tool ${phase.toolRef} templateIds ${JSON.stringify(stored)} !== implied ${JSON.stringify(implied)}`,
      )
    }
  }

  const families = spineFamilies(doc)
  const weightKeys = Object.keys(doc.analysis?.rollup?.weights ?? {})
  if (!families.hasForm && weightKeys.includes('formMark')) {
    issues.push('Decision has formMark without a form section')
  }
  if (!families.hasCoding && (weightKeys.includes('codingTests') || weightKeys.includes('codingMethod'))) {
    issues.push('Decision has coding weights without a coding section')
  }
  if (!families.hasDoc && weightKeys.includes('essay')) {
    issues.push('Decision has essay without a writing section')
  }
  if (
    !families.hasTalk &&
    (weightKeys.includes('interviewDelivery') || weightKeys.includes('interviewContent'))
  ) {
    issues.push('Decision has talk weights without a conversation section')
  }

  for (const phase of doc.phases ?? []) {
    const phaseId = String(phase.id ?? '').trim()
    if (!phaseId) continue
    let ids: string[] = []
    if (phase.kind === 'discussion') {
      const topic = (doc.topicLibrary ?? []).find((t) => t.id === phase.topicId)
      ids = (topic?.analysis?.templateIds ?? []).map(String)
    } else if (phase.toolRef) {
      ids = (doc.tools[phase.toolRef]?.analysis?.templateIds ?? []).map(String)
    }
    const gradeIds = countedGradeTemplateIds(ids, doc as unknown as Record<string, unknown>)
    if (gradeIds.length < 2) continue
    const stored = readPhaseTemplateWeights(doc, phaseId) ?? {}
    const allOne = gradeIds.every((tid) => (stored[tid] ?? 1) === 1)
    if (allOne) {
      issues.push(`Section ${phaseId} template weights must not all be 1`)
    }
    const ensured = ensureSectionTemplateWeights(ids, stored)
    const counted = ids.filter((tid) => (ensured[tid] ?? 0) > 0)
    const sum = counted.reduce((s, tid) => s + (ensured[tid] ?? 0), 0)
    if (counted.length && Math.abs(sum - 1) > 0.02) {
      issues.push(`Section ${phaseId} counted template weights must sum to 1`)
    }
  }
  return issues
}

export function stampCopyTitleOnBriefBody(
  body: Record<string, unknown> | null | undefined,
  copyTitle: string,
): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') return null
  const root = { ...body }
  const definition =
    root.definition && typeof root.definition === 'object'
      ? { ...(root.definition as Record<string, unknown>) }
      : {}
  const meta =
    definition.meta && typeof definition.meta === 'object'
      ? { ...(definition.meta as Record<string, unknown>) }
      : {}
  meta.title = copyTitle
  definition.meta = meta
  root.definition = definition
  return root
}

export type PickerStartKind = 'blank' | 'template' | 'copy'

export type CreateTemplatePreviewTag = {
  label: string
}

export type CreateTemplatePreview = {
  id: CreateTemplateId
  title: string
  summary: string
  description: string
  estimatedMinutes: number
  phaseCount: number
  restTags: CreateTemplatePreviewTag[]
  hoverTags: CreateTemplatePreviewTag[]
}

export function createTemplatePreview(id: CreateTemplateId): CreateTemplatePreview {
  const entry = createTemplateEntry(id)
  const doc = buildCreateTemplateDocument(id)
  const restTags = entry.kinds.map((kind) => ({ label: CREATE_TEMPLATE_KIND_LABEL[kind] }))
  const estimatedMinutes =
    typeof doc.timingSummary?.estimatedMinutes === 'number'
      ? doc.timingSummary.estimatedMinutes
      : (doc.phases ?? []).reduce(
          (sum, phase) => sum + (typeof phase.estimatedMinutes === 'number' ? phase.estimatedMinutes : 0),
          0,
        )
  const phaseCount = doc.phases?.length ?? 0
  return {
    id: entry.id,
    title: entry.title,
    summary: entry.summary,
    description: entry.description,
    estimatedMinutes,
    phaseCount,
    restTags,
    hoverTags: [
      { label: phaseCount === 1 ? '1 step' : `${phaseCount} steps` },
      { label: `${estimatedMinutes || 0}m` },
    ],
  }
}

const PREVIEW_CACHE = new Map<CreateTemplateId, CreateTemplatePreview>()

export function cachedCreateTemplatePreview(id: CreateTemplateId): CreateTemplatePreview {
  const hit = PREVIEW_CACHE.get(id)
  if (hit) return hit
  const next = createTemplatePreview(id)
  PREVIEW_CACHE.set(id, next)
  return next
}

export function pickerStartWelcomeMarkdown(input: {
  kind: PickerStartKind
  templateId?: string
  sourceTitle?: string
}): string {
  if (input.kind === 'blank') {
    return [
      'Hello. This interview is **blank**. I can help you build it from here.',
      '',
      'A useful first pass usually needs:',
      '1. A title and what this interview is for (Interview notes)',
      '2. Any role documents you can upload',
      '3. Which sections you want: form, conversation, coding, or writing',
      '',
      'Tell me the role, or ask me to add the first section.',
    ].join('\n')
  }
  if (input.kind === 'copy') {
    const title = input.sourceTitle?.trim() || 'that interview'
    return [
      `Hello. This is a **copy of ${title}**. I can help you retitle it, drop sections you do not need, or add a form / conversation / coding / writing step.`,
      '',
      'What should change first?',
    ].join('\n')
  }
  const id = input.templateId?.trim() || ''
  if (id === 'create.form') {
    return [
      'Hello. I loaded a **form assessment** with a screening sample covering every question type (short answer, multiple choice, checkboxes, dropdown, fill-in, scales, a grid, and a paragraph) plus an answer key.',
      '',
      'Treat this as a kit, not a finished interview. Tell me the role and I can retitle the form, swap questions, or add a conversation / coding / writing section next.',
    ].join('\n')
  }
  if (id === 'create.talk') {
    return [
      'Hello. I loaded a **conversation assessment** with three sample probes, harvest targets, and delivery plus content marks.',
      '',
      'Rewrite the probes for this role, or ask me to add a form / coding / writing section beside this talk.',
    ].join('\n')
  }
  if (id === 'create.coding') {
    return [
      'Hello. I loaded a **coding assessment**: a timed two-sum drill with a problem README, TypeScript and Python solve files, and hidden tests.',
      '',
      'Tell me the role and I can change the prompt, languages, or cases, or add a form / conversation / writing section.',
    ].join('\n')
  }
  if (id === 'create.doc') {
    return [
      'Hello. I loaded a **writing assessment** with a Situation / Decision / Impact outline, a sample answer scaffold, and a five-criterion rubric.',
      '',
      'Tell me the role and I can rewrite the prompt and bands, or add a form / conversation / coding section.',
    ].join('\n')
  }
  return [
    'Hello. I loaded a **full interview** sample: form, conversation, coding, and writing, with a Decision package already weighted.',
    '',
    'Treat the content as a kit. Tell me the role and which section to tailor first, or upload a brief so I can start from that.',
  ].join('\n')
}

/** Pure document for a picker start. Copy requires a source body. */
export function documentForPickerStart(input: {
  kind: PickerStartKind
  templateId?: string
  sourceBody?: Record<string, unknown> | null
  copyTitle?: string
}): Creator2BriefDocument | Record<string, unknown> {
  if (input.kind === 'blank') return buildBlankCreateDocument()
  if (input.kind === 'template') {
    const id = input.templateId?.trim()
    if (!id) throw new Error('Missing create template id')
    return buildCreateTemplateDocument(id)
  }
  const stamped = stampCopyTitleOnBriefBody(input.sourceBody, input.copyTitle ?? 'Untitled interview (copy)')
  if (!stamped) throw new Error('Missing source interview to copy')
  return stamped
}
