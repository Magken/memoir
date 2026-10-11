import {
  grainHintForTemplate,
  labelPack,
  labelTemplate,
  resolveAttachTemplateIds,
  defaultTemplateCardMeta,
  resolveTemplateCardMeta,
} from './analysisLabels'
import type {
  Creator2BriefDocument,
  Creator2OnFail,
  Creator2Phase,
  Creator2Summary,
  Creator2SummaryTag,
  Creator2Tool,
  Creator2Topic,
  Creator2When,
} from './creator2BriefTypes'
import { lockedToolTemplateIds } from '../interviewRunApi/buildTalkContext'
import { canonicalizeToolType, type Creator2ToolType } from '../../../../back_end/supabase/functions/interview-brief-edit/sectionTypes.ts'
import { buildCreatorTemplateRoster } from '../../../../back_end/supabase/functions/interview-brief-edit/templateRoster.ts'
import {
  isToolAssistNone,
  matchToolAssistBundle,
  resolveToolAssistCaps,
  toolAssistBundleById,
} from './toolAssistBundles'
import { readReferencesPhaseId, readReferencesPhaseIds } from './creator2References'
import type {
  InterviewFlowAnalysisLine,
  InterviewFlowAnalysisShelfState,
  InterviewFlowBranch,
  InterviewFlowCodingEditorState,
  InterviewFlowCodingTestCase,
  InterviewFlowDocAssessment,
  InterviewFlowDocEditorState,
  InterviewFlowDocPromptStructure,
  InterviewFlowFormEditorState,
  InterviewFlowFormOnFail,
  InterviewFlowFormQuestion,
  InterviewFlowProbeDefaults,
  InterviewFlowStep,
  InterviewFlowStepKind,
  InterviewFlowSummaryTag,
  InterviewFlowSummaryTagTone,
  InterviewFlowTalkEditorState,
  InterviewFlowTimelineBrief,
  InterviewFlowTimingBudget,
  InterviewFlowWrapEditorState,
} from './flowTimelineTypes'
import { fromCreator2OnFail, CREATOR2_FAIL_OPTIONS } from './creator2OnFail'
import { rollupFolderLabel, readPhaseTemplateWeights } from './rollupFolders'
import { ensureSectionTemplateWeights } from './rollupWeights'
import { resolveRollupWeightSections } from './patchCreator2Rollup'
import {
  codingLanguageDisplayLabel,
  codingLanguageTagLabel,
  filterSupportedCodingLanguages,
  normalizeCodingLanguages,
  resolveCodingDefaultLanguage,
} from './codingLanguages'
import {
  CODING_CASES_PATH,
  ensureCodingTestFiles,
  ensureSolveFilesForLanguages,
  parseCodingTestsFromWorkspace,
  serializeCodingCasesFile,
  type CodingTestsBundle,
} from './codingWorkspaceFiles'
import { composeWritingDocument, defaultWritingRubricDimensions, fillEmptyWritingAnswer, resolveDocAssessment, stripWritingPageBreakLexical, syncWritingDocumentLengthTime, WRITING_PAGELESS_SETUP } from './writingDocCompose'
import { isCreatorAnalysisLibraryTemplateId } from './analysisTemplateCatalog'
import { DEFAULT_ATTACH_PACKS } from './defaultAttachPacks'
import { collectAttachedTemplateIds } from './patchCreator2TemplateLibrary'
import { isTestFormDocument, normalizeTestFormDocument } from '../testForm/parse'
import type { TestFormDocument } from '../testForm/types'
import type { CodeEditorPayload, DocEditorPayload } from '../editorContext/types'
import { estimateFormSectionMinutes } from './estimateFormSectionMinutes'

const SUMMARY_TAG_TONES = new Set<InterviewFlowSummaryTagTone>([
  'kind',
  'count',
  'time',
  'pack',
  'gate',
  'meta',
  'accent',
])

/**
 * Hard timer from `tools.*.timing`. Canonical write path is Edge NECP + spineRuntime
 * (`mode: timed` + `limitMinutes`). Tolerate bot synonyms (`hard` / `minutes`) on
 * read so chrome still lights if a bad store slipped through.
 */
function readToolHardTimer(tool: Creator2Tool | null | undefined): {
  timed: boolean
  limitMinutes: number | null
  estimatedMinutes: number | undefined
} {
  const raw = tool?.timing as
    | {
        mode?: string
        limitMinutes?: number | null
        estimatedMinutes?: number
        minutes?: number
      }
    | undefined
  if (!raw) return { timed: false, limitMinutes: null, estimatedMinutes: undefined }
  const mode = String(raw.mode ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  const timed =
    mode === 'timed' ||
    mode === 'hard' ||
    mode === 'hard_limit' ||
    mode === 'timer' ||
    mode === 'time_limit' ||
    mode === 'strict' ||
    mode === 'limited'
  const limitRaw = raw.limitMinutes ?? raw.minutes ?? null
  const limitMinutes =
    timed && limitRaw != null && Number.isFinite(Number(limitRaw))
      ? Number(limitRaw)
      : null
  return {
    timed,
    limitMinutes,
    estimatedMinutes: raw.estimatedMinutes,
  }
}

function readToolAssist(tool: Creator2Tool | null | undefined) {
  return resolveToolAssistCaps(tool?.assist)
}

function firstSentence(text: string, max = 140): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  const cut = cleaned.search(/[.!?](?:\s|$)/)
  const sentence = cut >= 0 ? cleaned.slice(0, cut + 1) : cleaned
  if (sentence.length <= max) return sentence
  return `${sentence.slice(0, max - 1).trimEnd()}…`
}

function mapOverrideTags(
  tags: Creator2SummaryTag[] | undefined,
  prefix: string,
): InterviewFlowSummaryTag[] {
  if (!tags?.length) return []
  return tags.map((t, i) => {
    const toneRaw = t.tone?.trim() as InterviewFlowSummaryTagTone | undefined
    return {
      id: `${prefix}.override.${i}`,
      label: t.label,
      tone: toneRaw && SUMMARY_TAG_TONES.has(toneRaw) ? toneRaw : 'meta',
    }
  })
}

function mergeSummary(
  override: Creator2Summary | undefined,
  derivedBlurb: string,
  derivedTags: InterviewFlowSummaryTag[],
  prefix: string,
  opts?: { liveTagsOnly?: boolean },
): { summary: string; tags: InterviewFlowSummaryTag[] } {
  const summary = override?.blurb?.trim() || derivedBlurb
  if (opts?.liveTagsOnly) {
    return { summary, tags: derivedTags }
  }
  const overrideTags = mapOverrideTags(override?.tags, prefix).filter(
    (t) => t.tone !== 'time' && t.tone !== 'kind' && t.tone !== 'pack',
  )
  return {
    summary,
    tags: overrideTags.length ? overrideTags : derivedTags,
  }
}

function phaseTitleMap(phases: readonly Creator2Phase[]): Map<string, string> {
  return new Map(phases.map((p) => [String(p.id), String(p.title ?? p.id)]))
}

function clipTagLabel(text: string, max = 22): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trimEnd()}…`
}

function refsSummaryTag(
  phase: Creator2Phase,
  titles: Map<string, string>,
): InterviewFlowSummaryTag | null {
  const ids = readReferencesPhaseIds(phase.references)
  if (!ids.length) return null
  const names = ids.map((id) => titles.get(id) ?? id)
  return {
    id: `${phase.id}.tag.refs`,
    label: names.length === 1 ? `Refs ${clipTagLabel(names[0]!)}` : `Refs ${names.length}`,
    tone: 'meta',
    glyph: 'refs',
    tooltip: `Section history: ${names.join(' · ')}`,
  }
}

function lockedAnalysisSummaryTag(
  phaseId: string,
  templateIds: readonly string[],
  cardMeta?: Record<string, { title?: string } | undefined>,
): InterviewFlowSummaryTag | null {
  if (!templateIds.length) return null
  return {
    id: `${phaseId}.tag.analysis`,
    label: `${templateIds.length} locked`,
    tone: 'meta',
    glyph: 'lock',
    tooltip: templateIds
      .map((id) => labelTemplate(id, cardMeta?.[id]))
      .join(' · '),
  }
}

function assistSummaryTag(
  phaseId: string,
  tool: Creator2Tool | undefined,
): InterviewFlowSummaryTag | null {
  const caps = readToolAssist(tool)
  const match = matchToolAssistBundle(caps)
  const bundle = match === 'custom' ? null : toolAssistBundleById(match)
  const label = bundle
    ? `Assist ${bundle.label}`
    : isToolAssistNone(caps)
      ? 'Assist None'
      : 'Assist custom'
  return {
    id: `${phaseId}.tag.assist`,
    label,
    tone: 'meta',
    glyph: 'meta',
    tooltip: bundle?.summary ?? 'Named helper peel for this tool',
  }
}

function whenHasConditions(when: Creator2When | undefined): boolean {
  if (!when) return false
  return Boolean(when.all?.length || when.any?.length)
}

function summaryForDiscussion(
  topic: Creator2Topic | undefined,
  phase: Creator2Phase,
): { summary: string; tags: InterviewFlowSummaryTag[] } {
  const purpose = purposeForDiscussion(topic, phase)
  const probeCount = topic?.probes?.length ?? 0
  const targetCount = topic?.targets?.length ?? 0
  const bits: string[] = []
  const lead = firstSentence(purpose, 120)
  if (lead) bits.push(lead)
  if (probeCount) bits.push(`${probeCount} probe${probeCount === 1 ? '' : 's'}`)
  if (targetCount) bits.push(`${targetCount} target${targetCount === 1 ? '' : 's'}`)
  const derivedBlurb = bits.join(' · ') || 'Conversation'

  const tags: InterviewFlowSummaryTag[] = []
  if (probeCount) {
    tags.push({
      id: `${phase.id}.tag.probes`,
      label: `${probeCount} probe${probeCount === 1 ? '' : 's'}`,
      tone: 'count',
      glyph: 'probes',
    })
  }
  if (targetCount) {
    tags.push({
      id: `${phase.id}.tag.targets`,
      label: `${targetCount} target${targetCount === 1 ? '' : 's'}`,
      tone: 'count',
      glyph: 'targets',
    })
  }
  if (phase.isOpening) {
    tags.push({
      id: `${phase.id}.tag.open`,
      label: 'Opening',
      tone: 'accent',
      glyph: 'opening',
    })
  }
  if (phase.isClosing) {
    tags.push({
      id: `${phase.id}.tag.close`,
      label: 'Closing',
      tone: 'accent',
      glyph: 'closing',
    })
  }
  if (whenHasConditions(phase.when)) {
    tags.push({
      id: `${phase.id}.tag.when`,
      label: 'Only if',
      tone: 'meta',
      glyph: 'when',
    })
  }

  return mergeSummary(phase.summary, derivedBlurb, tags, phase.id, { liveTagsOnly: true })
}

function summaryForTool(
  phase: Creator2Phase,
  tool: Creator2Tool | undefined,
  formQuestions: InterviewFlowFormQuestion[],
  testCases: { id: string; name: string }[],
  opts?: { offSpine?: boolean },
): { summary: string; tags: InterviewFlowSummaryTag[] } {
  const kind = toolKind(tool)
  const purpose = purposeForTool(tool)
  const lead = firstSentence(purpose, 110)
  const bits: string[] = []
  if (lead) bits.push(lead)

  const tags: InterviewFlowSummaryTag[] = []
  if (kind === 'form') {
    const qCount = formQuestions.length
    if (qCount) {
      bits.push(`${qCount} question${qCount === 1 ? '' : 's'}`)
      tags.push({
        id: `${phase.id}.tag.qs`,
        label: `${qCount} question${qCount === 1 ? '' : 's'}`,
        tone: 'count',
      })
    }
    const gateCount = formQuestions.filter((q) => q.gatesPass).length
    if (gateCount) {
      bits.push(`${gateCount} gate item${gateCount === 1 ? '' : 's'}`)
      tags.push({
        id: `${phase.id}.tag.gate`,
        label: `${gateCount} gate`,
        tone: 'gate',
      })
    }
  } else if (kind === 'coding') {
    const n = testCases.length
    if (n) {
      bits.push(`${n} hidden test${n === 1 ? '' : 's'}`)
      tags.push({
        id: `${phase.id}.tag.tests`,
        label: `${n} test${n === 1 ? '' : 's'}`,
        tone: 'count',
      })
    }
    if (tool?.languages?.length) {
      const langs = normalizeCodingLanguages(tool.languages)
      if (langs.length) {
        bits.push(langs.map(codingLanguageTagLabel).join(' · '))
        for (const id of langs) {
          tags.push({
            id: `${phase.id}.tag.lang.${id}`,
            label: codingLanguageTagLabel(id),
            tone: 'meta',
            glyph: 'lang',
            tooltip: codingLanguageDisplayLabel(id),
          })
        }
      }
    }
  } else if (kind === 'doc') {
    if (tool?.minWords != null || tool?.maxWords != null) {
      const range = `${tool?.minWords ?? 0}–${tool?.maxWords ?? '∞'} words`
      bits.push(range)
      tags.push({ id: `${phase.id}.tag.words`, label: range, tone: 'count' })
    }
  }

  // Kind + duration + analysis pack stay on the meta row only — never as tags.

  if (opts?.offSpine) {
    tags.push({ id: `${phase.id}.tag.off`, label: 'Optional', tone: 'meta' })
    bits.push('optional pack')
  }

  const derivedBlurb = bits.join(' · ') || purpose || 'Tool section'
  const merged = mergeSummary(phase.summary ?? tool?.summary, derivedBlurb, tags, phase.id)
  // Form / coding / writing stay live — ignore frozen summary.tags from JSON.
  if (kind === 'form' || kind === 'coding' || kind === 'doc') {
    return { summary: merged.summary, tags }
  }
  return merged
}

function summaryForRollup(stepId: string, weightCount: number): {
  summary: string
  tags: InterviewFlowSummaryTag[]
} {
  return {
    summary:
      weightCount > 0
        ? `Attempt rollup for the reviewer · ${weightCount} soft weight${weightCount === 1 ? '' : 's'} · form stays a pass or fail screen`
        : 'Attempt rollup for the reviewer · gate result, topic summaries, and open risks',
    tags: [
      { id: `${stepId}.tag.gate`, label: 'Hard form gate', tone: 'gate' },
      ...(weightCount
        ? [
            {
              id: `${stepId}.tag.weights`,
              label: `${weightCount} weight${weightCount === 1 ? '' : 's'}`,
              tone: 'count' as const,
            },
          ]
        : []),
    ],
  }
}

/**
 * Stored leftovers (`writing`, `code`, `form`, `leetcode`, …) → live `tools[].type`.
 * Same SSOT persist uses (`canonicalizeToolType`); editorKind is a last-resort
 * stamp when type is missing, not a second alias table.
 */
function canonicalBoardToolType(tool: Creator2Tool | undefined): Creator2ToolType | null {
  if (!tool) return null
  const fromType = canonicalizeToolType(tool.type)
  if (fromType) return fromType
  const ek = String(tool.editorKind ?? '')
    .trim()
    .toLowerCase()
  if (ek === 'code') return 'coding'
  if (ek === 'doc') return 'doc'
  if (ek === 'testform') return 'form_quiz'
  return null
}

function toolKind(tool: Creator2Tool | undefined): InterviewFlowStepKind | null {
  const t = canonicalBoardToolType(tool)
  if (t === 'coding') return 'coding'
  if (t === 'doc') return 'doc'
  if (t === 'form_quiz') return 'form'
  // Unknown / illegal type — never silent-default to Form.
  return null
}

function describeWhen(
  when: Creator2When | undefined,
  tools: Record<string, Creator2Tool>,
  topics: Map<string, Creator2Topic>,
): string | undefined {
  if (!when) return undefined
  const parts: string[] = []
  for (const c of when.all ?? []) {
    if (c.toolPassed) {
      const title = tools[c.toolPassed]?.title ?? c.toolPassed
      parts.push(`${title} passed`)
    }
    if (c.phaseCompleted) parts.push(`${c.phaseCompleted} completed`)
    if (c.targetEquals) {
      const topic = topics.get(c.targetEquals.topicId)
      parts.push(
        `${topic?.label ?? c.targetEquals.topicId}: ${c.targetEquals.key} = ${c.targetEquals.value}`,
      )
    }
  }
  for (const c of when.any ?? []) {
    if (c.toolPassed) {
      const title = tools[c.toolPassed]?.title ?? c.toolPassed
      parts.push(`${title} passed (any)`)
    }
  }
  if (!parts.length) return undefined
  return `Only if ${parts.join(' · ')}`
}

function branchesFromOnFail(
  phase: Creator2Phase,
  phases: Creator2Phase[],
  whenLabel: string | undefined,
): InterviewFlowBranch[] | undefined {
  if (!whenLabel || phase.onFail == null) return undefined
  return [
    { id: `${phase.id}.pass`, label: 'Condition met', next: 'Continue this section', tone: 'pass' },
    {
      id: `${phase.id}.fail`,
      label: 'Condition not met',
      next: describeOnFail(phase.onFail, phases),
      tone: 'fail',
    },
  ]
}

function describeOnFail(onFail: Creator2OnFail, phases: Creator2Phase[]): string {
  if (onFail === 'skip') return 'Skip this section'
  if (onFail === 'endAttempt') return 'End the interview'
  if (onFail && typeof onFail === 'object' && onFail.goToPhaseId) {
    const target = phases.find((p) => p.id === onFail.goToPhaseId)
    return `Jump to ${target?.title ?? onFail.goToPhaseId}`
  }
  return 'Skip this section'
}

function analysisLinesFor(
  attach: { attachPack?: string | null; templateIds?: string[] } | undefined,
  attachPacks: Record<string, string[]> | undefined,
): { packId: string | null; packLabel: string | null; lines: InterviewFlowAnalysisLine[] } {
  const ids = resolveAttachTemplateIds(attach, attachPacks)
  const packId = attach?.attachPack ?? null
  const fromPack = labelPack(packId)
  const packLabel =
    fromPack ??
    (ids.length === 1 ? labelTemplate(ids[0]) : ids.length > 0 ? 'Custom templates' : null)
  return {
    packId,
    packLabel,
    lines: ids.map((id) => ({
      id,
      templateId: id,
      label: labelTemplate(id),
      when: grainHintForTemplate(id),
    })),
  }
}

function formGateBranches(toolRef: string, phases: Creator2Phase[]): InterviewFlowBranch[] {
  const dependents = phases.filter((p) =>
    (p.when?.all ?? []).some((c) => c.toolPassed === toolRef),
  )
  const jump = dependents.find(
    (p) => p.onFail && typeof p.onFail === 'object' && 'goToPhaseId' in p.onFail,
  )
  const failNext =
    jump && typeof jump.onFail === 'object' && jump.onFail
      ? describeOnFail(jump.onFail, phases)
      : 'Skip gated sections'
  return [
    { id: `${toolRef}.pass`, label: 'Passes', next: 'Continue the interview', tone: 'pass' },
    { id: `${toolRef}.fail`, label: 'Doesn’t pass', next: failNext, tone: 'fail' },
  ]
}

function readFormQuestions(tool: Creator2Tool | undefined): InterviewFlowFormQuestion[] {
  const inline = tool?.artifact as
    | {
        inline?: {
          questions?: Array<{
            id: string
            prompt: string
            required?: boolean
            kind?: string
          }>
          answerKey?: Record<string, unknown>
        }
      }
    | undefined
  const questions = inline?.inline?.questions ?? []
  const requiredGateIds = new Set(
    ((tool?.passThreshold as { requiredQuestionIds?: string[] } | undefined)
      ?.requiredQuestionIds ?? []) as string[],
  )
  const gateActive = requiredGateIds.size > 0
  return questions.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    required: q.required,
    kind: q.kind,
    // Gate chips only when passThreshold is on — answer keys alone are not gates.
    gatesPass: gateActive && requiredGateIds.has(q.id),
  }))
}

function readFormDocument(tool: Creator2Tool | undefined): TestFormDocument | undefined {
  if (!tool || canonicalBoardToolType(tool) !== 'form_quiz') return undefined
  const artifact = tool.artifact as { inline?: unknown } | undefined
  if (!artifact?.inline) return undefined
  if (isTestFormDocument(artifact.inline)) {
    return normalizeTestFormDocument(artifact.inline).document
  }
  return normalizeTestFormDocument(artifact.inline).document
}

function readFormOnFail(onFail: Creator2OnFail | undefined): {
  onFail: InterviewFlowFormOnFail
  onFailPhaseId?: string | null
} {
  return fromCreator2OnFail(onFail)
}

function buildFormEditor(
  phase: Creator2Phase,
  tool: Creator2Tool | undefined,
  opts: {
    sectionTitle: string
    summaryBlurb: string
    packLabel: string
    doc: Creator2BriefDocument
  },
): InterviewFlowFormEditorState | undefined {
  if (!tool || !phase.toolRef) return undefined
  if (canonicalBoardToolType(tool) !== 'form_quiz') return undefined
  const document = readFormDocument(tool)
  if (!document) return undefined
  const threshold = tool.passThreshold as
    | { mode?: string; requiredQuestionIds?: string[] }
    | undefined
  const fail = readFormOnFail(phase.onFail)
  const { timed, limitMinutes, estimatedMinutes } = readToolHardTimer(tool)
  const analysisTemplateIds = lockedToolTemplateIds({
    toolType: 'form_quiz',
    stored: tool.analysis?.templateIds,
    assistChat: readToolAssist(tool).chat,
  })
  return {
    toolRef: phase.toolRef,
    document,
    sectionTitle: opts.sectionTitle,
    summaryBlurb: opts.summaryBlurb,
    packLabel: opts.packLabel,
    isGate: Boolean(
      threshold &&
        (threshold.mode === 'required_items' ||
          (threshold.requiredQuestionIds?.length ?? 0) > 0 ||
          threshold.mode === 'min_score'),
    ),
    onFail: fail.onFail,
    onFailPhaseId: fail.onFailPhaseId,
    referencesPhaseId: readReferencesPhaseId(phase.references),
    referencesPhaseIds: readReferencesPhaseIds(phase.references),
    estimatedMinutes:
      phase.estimatedMinutes ?? estimatedMinutes ?? estimateFormSectionMinutes(document),
    timed,
    limitMinutes,
    analysisTemplateIds,
    templateWeights: ensureSectionTemplateWeights(
      analysisTemplateIds,
      readPhaseTemplateWeights(opts.doc, phase.id),
    ),
    assist: readToolAssist(tool),
  }
}

function defaultCodingWorkspace(title: string): CodeEditorPayload {
  const cases = [
    {
      id: 't1',
      name: 'basic',
      description: 'Happy path',
      args: [] as unknown[],
      expected: null,
      compare: 'deep_equal' as const,
      hidden: false,
      timeoutMs: null,
    },
    {
      id: 't2',
      name: 'edge',
      description: 'Hidden edge',
      args: [] as unknown[],
      expected: null,
      compare: 'deep_equal' as const,
      hidden: true,
      timeoutMs: null,
    },
  ]
  const seeded = ensureSolveFilesForLanguages(
    {
      title,
      files: [
        {
          path: 'README.md',
          language: 'markdown',
          content: '# Coding challenge\n\nImplement the function and pass the hidden tests.\n',
        },
        {
          path: CODING_CASES_PATH,
          language: 'json',
          content: serializeCodingCasesFile({
            runner: 'hidden_cases_v1',
            entryPoint: 'solve',
            cases,
            referenceSolution: null,
          }),
        },
      ],
      folders: ['src', 'tests'],
      openIds: ['README.md', 'src/solve.ts'],
      activeId: 'README.md',
    },
    ['typescript'],
    { entryPoint: 'solve', activateDefault: true, defaultLanguage: 'typescript' },
  )
  return {
    ...seeded,
    openIds: Array.from(new Set(['README.md', ...(seeded.openIds ?? [])])),
    activeId: 'README.md',
  }
}

function readCodingWorkspace(tool: Creator2Tool | undefined): CodeEditorPayload {
  const title = tool?.title?.trim() || 'Coding'
  const artifact = tool?.artifact as
    | { inline?: unknown; files?: unknown; title?: unknown }
    | undefined
  const inline =
    artifact?.inline && typeof artifact.inline === 'object'
      ? (artifact.inline as Partial<CodeEditorPayload> & { files?: unknown[] })
      : null
  // Prefer FE dialect (artifact.inline.files); lift legacy artifact.files.
  const rawFiles = Array.isArray(inline?.files)
    ? inline.files
    : Array.isArray(artifact?.files)
      ? (artifact.files as unknown[])
      : []
  if (rawFiles.length > 0) {
    const files = rawFiles.map((f) => {
      const row = (f && typeof f === 'object' ? f : {}) as Record<string, unknown>
      return {
        path: String(row.path ?? 'file.ts'),
        language: String(row.language ?? 'typescript'),
        content: String(row.content ?? ''),
      }
    })
    return {
      title:
        typeof inline?.title === 'string'
          ? inline.title
          : typeof artifact?.title === 'string'
            ? artifact.title
            : title,
      files,
      folders: Array.isArray(inline?.folders)
        ? inline.folders.map(String)
        : [...new Set(files.map((f) => f.path.split('/')[0]).filter(Boolean))],
      openIds: Array.isArray(inline?.openIds)
        ? inline.openIds.map(String)
        : files.slice(0, 2).map((f) => f.path),
      activeId: inline?.activeId ?? files[0]?.path ?? null,
    }
  }
  return defaultCodingWorkspace(title)
}

function readCodingCases(tool: Creator2Tool | undefined): InterviewFlowCodingTestCase[] {
  const cases = tool?.tests?.cases ?? []
  return cases.map((c, i) => {
    const row = c as {
      id?: string
      name?: string
      description?: string
      args?: unknown
      input?: unknown
      expected?: unknown
      compare?: string
      hidden?: boolean
      timeoutMs?: number | null
    }
    let args: unknown[] = []
    if (Array.isArray(row.args)) {
      args = row.args
    } else if (row.input != null && typeof row.input === 'object' && !Array.isArray(row.input)) {
      // Legacy kwargs object → positional values (stable key order)
      args = Object.values(row.input as Record<string, unknown>)
    } else if (row.input !== undefined) {
      args = [row.input]
    }
    const compare =
      row.compare === 'exact' || row.compare === 'unordered' || row.compare === 'deep_equal'
        ? row.compare
        : 'deep_equal'
    return {
      id: row.id ?? `t${i + 1}`,
      name: row.name ?? row.id ?? `Case ${i + 1}`,
      description: typeof row.description === 'string' ? row.description : undefined,
      args,
      expected: row.expected ?? null,
      compare,
      hidden: row.hidden !== false,
      timeoutMs: row.timeoutMs ?? null,
    }
  })
}

function buildCodingEditor(
  phase: Creator2Phase,
  tool: Creator2Tool | undefined,
  opts: {
    sectionTitle: string
    summaryBlurb: string
    packLabel: string
    doc: Creator2BriefDocument
  },
): InterviewFlowCodingEditorState | undefined {
  if (!tool || !phase.toolRef) return undefined
  if (canonicalBoardToolType(tool) !== 'coding') return undefined
  const fail = readFormOnFail(phase.onFail)
  const { timed, limitMinutes, estimatedMinutes } = readToolHardTimer(tool)
  const cases = readCodingCases(tool)
  const refRaw = tool.tests?.referenceSolution
  const referenceSolution =
    typeof refRaw === 'string' ? refRaw : refRaw == null ? null : JSON.stringify(refRaw, null, 2)
  const fromTool: CodingTestsBundle = {
    runner: tool.tests?.runner ?? 'hidden_cases_v1',
    entryPoint: tool.tests?.entryPoint?.trim() || 'solve',
    cases:
      cases.length > 0
        ? cases
        : [
            {
              id: 't1',
              name: 'basic',
              description: 'Happy path',
              args: [],
              expected: null,
              compare: 'deep_equal',
              hidden: true,
              timeoutMs: null,
            },
          ],
    referenceSolution,
  }
  const rawWorkspace = readCodingWorkspace(tool)
  // Prefer existing tests/cases.json in the workspace when authors already edited files.
  const fromFiles = parseCodingTestsFromWorkspace(rawWorkspace)
  const bundle = fromFiles ?? fromTool
  const languages = filterSupportedCodingLanguages(tool.languages ?? [])
  const defaultLanguage = resolveCodingDefaultLanguage(
    languages,
    tool.defaultLanguage ?? languages[0] ?? null,
  )
  const workspace = ensureSolveFilesForLanguages(
    ensureCodingTestFiles(rawWorkspace, bundle, {
      preferExistingFiles: Boolean(fromFiles),
    }),
    languages,
    {
      entryPoint: bundle.entryPoint,
      activateDefault: true,
      defaultLanguage,
    },
  )
  const analysisTemplateIds = lockedToolTemplateIds({
    toolType: 'coding',
    stored: tool.analysis?.templateIds,
    assistChat: readToolAssist(tool).chat,
  })
  return {
    toolRef: phase.toolRef,
    sectionTitle: opts.sectionTitle,
    summaryBlurb: opts.summaryBlurb,
    packLabel: opts.packLabel,
    instructions: tool.instructions?.trim() || '',
    languages,
    defaultLanguage,
    workspace,
    tests: {
      runner: bundle.runner,
      entryPoint: bundle.entryPoint,
      cases: bundle.cases,
      referenceSolution: bundle.referenceSolution,
    },
    onFail: fail.onFail,
    onFailPhaseId: fail.onFailPhaseId,
    referencesPhaseId: readReferencesPhaseId(phase.references),
    referencesPhaseIds: readReferencesPhaseIds(phase.references),
    estimatedMinutes: phase.estimatedMinutes ?? estimatedMinutes ?? undefined,
    timed,
    limitMinutes,
    analysisTemplateIds,
    templateWeights: ensureSectionTemplateWeights(
      analysisTemplateIds,
      readPhaseTemplateWeights(opts.doc, phase.id),
    ),
    assist: readToolAssist(tool),
  }
}

function defaultDocDocument(
  title: string,
  brief: string,
  prompt?: { structure?: InterviewFlowDocPromptStructure[]; requirements?: string[] },
  assessment?: InterviewFlowDocAssessment,
  limits?: {
    minWords?: number | null
    maxWords?: number | null
    timed?: boolean
    limitMinutes?: number | null
  },
): DocEditorPayload {
  return composeWritingDocument({
    title,
    brief,
    structure: prompt?.structure ?? [{ id: 'body', label: 'Response' }],
    requirements: prompt?.requirements ?? [],
    assessment: assessment ?? {
      kind: 'rubric',
      dimensions: defaultWritingRubricDimensions(),
    },
    minWords: limits?.minWords,
    maxWords: limits?.maxWords,
    timed: limits?.timed,
    limitMinutes: limits?.limitMinutes,
  })
}

function readDocDocument(
  tool: Creator2Tool | undefined,
  prompt: { brief: string; structure: InterviewFlowDocPromptStructure[]; requirements: string[] },
  assessment: InterviewFlowDocAssessment,
): DocEditorPayload {
  const title = tool?.title?.trim() || 'Writing'
  const { timed, limitMinutes } = readToolHardTimer(tool)
  const limits = {
    minWords: tool?.minWords,
    maxWords: tool?.maxWords,
    timed,
    limitMinutes,
  }
  const artifact = tool?.artifact as { inline?: unknown } | undefined
  const inline = artifact?.inline
  if (inline && typeof inline === 'object') {
    const row = inline as Partial<DocEditorPayload> & { pageSetup?: unknown }
    const hasContent =
      typeof row.markdown === 'string' ||
      row.lexical != null ||
      typeof row.title === 'string'
    if (hasContent) {
      const filledMd =
        typeof row.markdown === 'string'
          ? fillEmptyWritingAnswer(row.markdown, prompt.structure)
          : undefined
      return syncWritingDocumentLengthTime(
        {
          title: typeof row.title === 'string' ? row.title : title,
          markdown: filledMd,
          lexical: stripWritingPageBreakLexical(row.lexical ?? null) as DocEditorPayload['lexical'],
          pageSetup: WRITING_PAGELESS_SETUP,
        },
        limits,
      )
    }
  }
  return defaultDocDocument(title, prompt.brief, prompt, assessment, limits)
}

function readDocPrompt(tool: Creator2Tool | undefined): InterviewFlowDocEditorState['prompt'] {
  const prompt = tool?.prompt
  const brief =
    prompt?.brief?.trim() ||
    tool?.instructions?.trim() ||
    'Write your response.'
  const rawStructure: unknown = prompt?.structure
  const structureRows: unknown[] = Array.isArray(rawStructure)
    ? rawStructure
    : typeof rawStructure === 'string' && rawStructure.trim()
      ? rawStructure
          .split(/\s*(?:→|->|,|;|\n)\s*/)
          .map((s) => s.trim())
          .filter(Boolean)
          .map((label, i) => ({ id: `sec.${i + 1}`, label }))
      : []
  const structure: InterviewFlowDocPromptStructure[] = structureRows.map((row, i) => {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      const s = row as { id?: string; label?: string; hint?: string; minParagraphs?: number }
      return {
        id: s.id?.trim() || `sec.${i + 1}`,
        label: s.label?.trim() || `Section ${i + 1}`,
        hint: s.hint?.trim() || undefined,
        minParagraphs: s.minParagraphs,
      }
    }
    return {
      id: `sec.${i + 1}`,
      label: String(row ?? '').trim() || `Section ${i + 1}`,
    }
  })
  const rawReqs: unknown = prompt?.requirements
  const requirements = (
    Array.isArray(rawReqs)
      ? rawReqs
      : typeof rawReqs === 'string' && rawReqs.trim()
        ? rawReqs.split(/\n|;|•/).map((r) => r.trim()).filter(Boolean)
        : []
  )
    .map((r) => String(r).trim())
    .filter(Boolean)
  return {
    brief,
    structure:
      structure.length > 0
        ? structure
        : [{ id: 'body', label: 'Response', minParagraphs: 1 }],
    requirements,
  }
}

/** Delegates to the shared resolver so the graded matrix and the results table cannot drift. */
function readDocAssessment(tool: Creator2Tool | undefined): InterviewFlowDocAssessment {
  return resolveDocAssessment(tool)
}

function buildDocEditor(
  phase: Creator2Phase,
  tool: Creator2Tool | undefined,
  opts: {
    sectionTitle: string
    summaryBlurb: string
    packLabel: string
    doc: Creator2BriefDocument
  },
): InterviewFlowDocEditorState | undefined {
  if (!tool || !phase.toolRef) return undefined
  if (canonicalBoardToolType(tool) !== 'doc') return undefined
  const fail = readFormOnFail(phase.onFail)
  const { timed, limitMinutes, estimatedMinutes } = readToolHardTimer(tool)
  const prompt = readDocPrompt(tool)
  const assessment = readDocAssessment(tool)
  const analysisTemplateIds = lockedToolTemplateIds({
    toolType: 'doc',
    stored: tool.analysis?.templateIds,
    assistChat: readToolAssist(tool).chat,
  })
  return {
    toolRef: phase.toolRef,
    sectionTitle: opts.sectionTitle,
    summaryBlurb: opts.summaryBlurb,
    packLabel: opts.packLabel,
    instructions: tool.instructions?.trim() || '',
    prompt,
    assessment,
    document: readDocDocument(tool, prompt, assessment),
    minWords: tool.minWords,
    maxWords: tool.maxWords,
    onFail: fail.onFail,
    onFailPhaseId: fail.onFailPhaseId,
    referencesPhaseId: readReferencesPhaseId(phase.references),
    referencesPhaseIds: readReferencesPhaseIds(phase.references),
    estimatedMinutes: phase.estimatedMinutes ?? estimatedMinutes ?? undefined,
    timed,
    limitMinutes,
    analysisTemplateIds,
    templateWeights: ensureSectionTemplateWeights(
      analysisTemplateIds,
      readPhaseTemplateWeights(opts.doc, phase.id),
    ),
    assist: readToolAssist(tool),
  }
}

function purposeForDiscussion(topic: Creator2Topic | undefined, phase: Creator2Phase): string {
  if (topic?.purpose?.trim()) return topic.purpose
  if (phase.summary?.blurb?.trim()) return phase.summary.blurb
  return phase.notes || phase.title || 'Discussion for this role'
}

function purposeForTool(tool: Creator2Tool | undefined): string {
  if (!tool) return 'Tool section for this role'
  if (tool.instructions?.trim()) return tool.instructions
  return tool.title
}

function buildTalkEditor(
  phase: Creator2Phase,
  topic: Creator2Topic | undefined,
  _teaser: { summary: string },
  probeDefaults: InterviewFlowProbeDefaults,
  attachPacks: Record<string, string[]> | undefined,
  doc: Creator2BriefDocument,
): InterviewFlowTalkEditorState {
  const topicId = phase.topicId || topic?.id || `topic.${phase.id}`
  const fail = fromCreator2OnFail(phase.onFail)
  const analysis = topic?.analysis
  const templateIds = resolveAttachTemplateIds(analysis, attachPacks)
  const packLabel =
    phase.summary?.packLabel?.trim() ||
    (templateIds.length
      ? templateIds.length === 1
        ? labelTemplate(templateIds[0]!)
        : `${templateIds.length} templates`
      : labelPack(analysis?.attachPack) || '') ||
    ''

  const title = (phase.title || topic?.label || 'Conversation').trim()
  const authoredSummary =
    phase.summary?.blurb?.trim() || topic?.purpose?.trim() || ''

  return {
    phaseId: phase.id,
    topicId,
    sectionTitle: title,
    summaryBlurb: authoredSummary,
    packLabel,
    purpose: authoredSummary,
    topicLabel: title,
    targetMinutes: topic?.targetMinutes ?? phase.estimatedMinutes ?? probeDefaults.targetMinutes ?? 5,
    isOpening: Boolean(phase.isOpening),
    isClosing: Boolean(phase.isClosing),
    required: Boolean(phase.required),
    maxFollowUps: topic?.maxFollowUps ?? null,
    maxProbes: topic?.maxProbes ?? null,
    minCandidateTurns: topic?.minCandidateTurns ?? null,
    behaviourPromptOverride: topic?.behaviourPromptOverride ?? null,
    probes: [...(topic?.probes ?? [])]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((p) => ({
        id: p.id,
        goal: p.goal,
        required: p.required,
        hint: p.hint,
      })),
    targets: (topic?.targets ?? []).map((t) => ({
      key: t.key,
      label: t.label,
      required: t.required,
      description: t.description,
      datatype: t.datatype,
      enumValues: t.enumValues,
    })),
    templateIds,
    templateWeights: ensureSectionTemplateWeights(
      templateIds,
      readPhaseTemplateWeights(doc, phase.id),
    ),
    onFail: fail.onFail,
    onFailPhaseId: fail.onFailPhaseId,
    when: phase.when ?? null,
    referencesPhaseId: readReferencesPhaseId(phase.references),
    referencesPhaseIds: readReferencesPhaseIds(phase.references),
    notes: phase.notes ?? null,
  }
}

function parseTemplateMeta(
  raw: unknown,
): InterviewFlowAnalysisShelfState['templateMeta'] {
  if (!raw || typeof raw !== 'object') return {}
  const out: InterviewFlowAnalysisShelfState['templateMeta'] = {}
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue
    const row = value as Record<string, unknown>
    const title = typeof row.title === 'string' ? row.title.trim() : ''
    const subtitle = typeof row.subtitle === 'string' ? row.subtitle.trim() : ''
    const details = typeof row.details === 'string' ? row.details.trim() : ''
    const hasCopy = Boolean(title || subtitle || details)
    const hasShape =
      typeof row.outputKind === 'string' ||
      typeof row.storageKey === 'string' ||
      Array.isArray(row.dimensions) ||
      Array.isArray(row.taxonomy) ||
      Array.isArray(row.enumValues)
    if (!hasCopy && !hasShape) continue
    out[id] = resolveTemplateCardMeta(id, {
      title,
      subtitle,
      details,
      ...row,
    })
  }
  return out
}

function parseLibraryIds(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null
  const ids = raw
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim())
    .filter(Boolean)
  return [...new Set(ids)]
}

function buildAnalysisShelf(doc: Creator2BriefDocument): InterviewFlowAnalysisShelfState {
  const pd = (doc.definition.probeDefaults ?? {}) as InterviewFlowProbeDefaults
  const overrides = doc.analysis.overrides ?? {}
  const templateMeta = parseTemplateMeta(overrides.templateCards)
  const attached = collectAttachedTemplateIds(doc).filter(isCreatorAnalysisLibraryTemplateId)
  const storedLibrary = parseLibraryIds(overrides.libraryIds)?.filter(
    isCreatorAnalysisLibraryTemplateId,
  )
  const metaKeys = Object.keys(templateMeta).filter(isCreatorAnalysisLibraryTemplateId)
  const libraryIds = storedLibrary?.length
    ? storedLibrary
    : [...new Set([...attached, ...metaKeys])]

  for (const id of Object.keys(templateMeta)) {
    if (!isCreatorAnalysisLibraryTemplateId(id)) delete templateMeta[id]
  }
  for (const id of libraryIds) {
    if (!templateMeta[id]) templateMeta[id] = defaultTemplateCardMeta(id)
  }

  const roster = buildCreatorTemplateRoster(doc as unknown as Record<string, unknown>)
  for (const row of roster) {
    if (!templateMeta[row.templateId]) templateMeta[row.templateId] = defaultTemplateCardMeta(row.templateId)
  }

  return {
    attachPacks: { ...(doc.analysis.attachPacks ?? DEFAULT_ATTACH_PACKS) },
    libraryIds,
    templateMeta,
    analysisDefaults: { ...(doc.definition.analysisDefaults ?? {}) },
    probeDefaults: {
      maxFollowUps: pd.maxFollowUps,
      targetMinutes: pd.targetMinutes,
      maxProbes: pd.maxProbes,
      minCandidateTurns: pd.minCandidateTurns,
    },
    roster,
  }
}

function topicForDiscussionPhase(
  phase: Creator2Phase,
  topics: Map<string, Creator2Topic>,
  library: Creator2Topic[],
): Creator2Topic | undefined {
  const byId = topics.get(phase.topicId ?? '')
  if (byId) return byId
  if (library.length === 1) return library[0]
  const title = (phase.title || '').trim().toLowerCase()
  if (!title) return undefined
  return library.find((t) => String(t.label ?? '').trim().toLowerCase() === title)
}

function mapDiscussionPhase(
  phase: Creator2Phase,
  topic: Creator2Topic | undefined,
  doc: Creator2BriefDocument,
  topics: Map<string, Creator2Topic>,
  probeDefaults: InterviewFlowProbeDefaults,
): InterviewFlowStep {
  const whenLabel = describeWhen(phase.when, doc.tools, topics)
  const analysis = analysisLinesFor(
    topic?.analysis,
    doc.analysis.attachPacks ?? DEFAULT_ATTACH_PACKS,
  )
  const probes = [...(topic?.probes ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const depthLines = [
    topic?.targetMinutes != null ? `Talk target · ${topic.targetMinutes} min` : null,
    phase.estimatedMinutes != null ? `Phase estimate · ${phase.estimatedMinutes} min` : null,
    topic?.maxFollowUps != null ? `Follow-ups · max ${topic.maxFollowUps}` : null,
    topic?.minCandidateTurns != null
      ? `Min candidate turns · ${topic.minCandidateTurns}`
      : null,
    topic?.maxProbes != null ? `Probe cap · ${topic.maxProbes}` : null,
    phase.isOpening ? 'Opening section' : null,
    phase.isClosing ? 'Closing section' : null,
  ].filter(Boolean) as string[]

  const teaser = summaryForDiscussion(topic, phase)
  const talkEditor = buildTalkEditor(
    phase,
    topic,
    teaser,
    probeDefaults,
    doc.analysis.attachPacks ?? DEFAULT_ATTACH_PACKS,
    doc,
  )
  const displayPack =
    phase.summary?.packLabel?.trim() ||
    analysis.packLabel ||
    (talkEditor.templateIds.length
      ? talkEditor.templateIds.length === 1
        ? labelTemplate(
            talkEditor.templateIds[0]!,
            parseTemplateMeta(doc.analysis.overrides?.templateCards)[
              talkEditor.templateIds[0]!
            ],
          )
        : `${talkEditor.templateIds.length} templates`
      : null)

  const minutes = phase.estimatedMinutes ?? topic?.targetMinutes ?? null
  const turns =
    topic?.minCandidateTurns ?? probeDefaults.minCandidateTurns ?? null
  const fail = fromCreator2OnFail(phase.onFail)
  const failOpt = CREATOR2_FAIL_OPTIONS.find((o) => o.value === fail.onFail)
  const cardMeta = parseTemplateMeta(doc.analysis.overrides?.templateCards)
  const extraTags: InterviewFlowSummaryTag[] = []
  if (minutes != null) {
    extraTags.push({
      id: `${phase.id}.tag.minutes`,
      label: `${minutes}m`,
      tone: 'time',
      glyph: 'time',
      tooltip: `About ${minutes} minute${minutes === 1 ? '' : 's'} for this conversation`,
    })
  }
  if (turns != null) {
    extraTags.push({
      id: `${phase.id}.tag.turns`,
      label: `${turns} turn${turns === 1 ? '' : 's'}`,
      tone: 'count',
      glyph: 'turns',
      tooltip: 'Minimum answers before moving on',
    })
  }
  extraTags.push({
    id: `${phase.id}.tag.templates`,
    label: talkEditor.templateIds.length
      ? `${talkEditor.templateIds.length} template${talkEditor.templateIds.length === 1 ? '' : 's'}`
      : 'No templates',
    tone: 'pack',
    glyph: 'pack',
    tooltip: talkEditor.templateIds.length
      ? talkEditor.templateIds.map((id) => labelTemplate(id, cardMeta[id])).join(' · ')
      : 'No analysis templates attached',
  })
  if (phase.required) {
    extraTags.push({
      id: `${phase.id}.tag.required`,
      label: 'Required',
      tone: 'meta',
      glyph: 'required',
      tooltip: 'Candidate must finish this section once it starts',
    })
  }
  if (fail.onFail !== 'none' && failOpt) {
    extraTags.push({
      id: `${phase.id}.tag.fail`,
      label: failOpt.label,
      tone: 'gate',
      glyph: 'fail',
      tooltip: failOpt.description,
    })
  }
  const refTag = refsSummaryTag(phase, phaseTitleMap(doc.phases))
  if (refTag) extraTags.push(refTag)

  // Prefer depth / attach / gate chips first; keep probe·target·opening after.
  const tags = [...extraTags, ...teaser.tags]

  return {
    id: phase.id,
    kind: 'talk',
    title: phase.title || topic?.label || 'Conversation',
    purpose: purposeForDiscussion(topic, phase),
    summary: teaser.summary,
    tags,
    minutes: phase.estimatedMinutes ?? topic?.targetMinutes,
    timing: {
      mode: 'untimed',
      estimatedMinutes: phase.estimatedMinutes ?? topic?.targetMinutes,
      limitMinutes: null,
    },
    onlyIf: whenLabel,
    branches: branchesFromOnFail(phase, doc.phases, whenLabel),
    packId: analysis.packId,
    packLabel: displayPack,
    analysisLines: analysis.lines,
    probes: probes.map((p) => ({
      id: p.id,
      goal: p.goal,
      required: p.required,
      hint: p.hint,
    })),
    targets: (topic?.targets ?? []).map((t) => ({
      key: t.key,
      label: t.label,
      required: t.required,
      description: t.description,
      datatype: t.datatype,
      enumValues: t.enumValues,
    })),
    depthLines,
    behaviourOverride: topic?.behaviourPromptOverride ?? null,
    isOpening: phase.isOpening,
    isClosing: phase.isClosing,
    talkEditor,
  }
}

function mapToolPhase(
  phase: Creator2Phase,
  tool: Creator2Tool | undefined,
  doc: Creator2BriefDocument,
  topics: Map<string, Creator2Topic>,
  opts?: { offSpine?: boolean },
): InterviewFlowStep {
  const whenLabel = describeWhen(phase.when, doc.tools, topics)
  const analysis = analysisLinesFor(tool?.analysis, doc.analysis.attachPacks ?? DEFAULT_ATTACH_PACKS)
  const formQuestions = canonicalBoardToolType(tool) === 'form_quiz' ? readFormQuestions(tool) : []
  const { timed, limitMinutes: limit } = readToolHardTimer(tool)
  const testCases =
    tool?.tests?.cases?.map((c, i) => {
      const row = c as { id?: string; name?: string }
      return { id: row.id ?? `t${i}`, name: row.name ?? row.id ?? `Case ${i + 1}` }
    }) ?? []

  const teaser = summaryForTool(phase, tool, formQuestions, testCases, opts)
  const sectionTitle = phase.title || tool?.title || 'Tool'
  const packLabel =
    phase.summary?.packLabel?.trim() || analysis.packLabel || ''
  const formEditor = buildFormEditor(phase, tool, {
    sectionTitle,
    summaryBlurb: phase.summary?.blurb?.trim() || teaser.summary,
    packLabel,
    doc,
  })
  const codingEditor = buildCodingEditor(phase, tool, {
    sectionTitle,
    summaryBlurb: phase.summary?.blurb?.trim() || teaser.summary,
    packLabel,
    doc,
  })
  const docEditor = buildDocEditor(phase, tool, {
    sectionTitle,
    summaryBlurb: phase.summary?.blurb?.trim() || teaser.summary,
    packLabel,
    doc,
  })
  const liveEditor = formEditor ?? codingEditor ?? docEditor
  const estimated =
    formEditor?.estimatedMinutes ??
    codingEditor?.estimatedMinutes ??
    docEditor?.estimatedMinutes ??
    phase.estimatedMinutes ??
    tool?.timing?.estimatedMinutes ??
    undefined

  const isTimed = liveEditor?.timed ?? timed
  const limitMin = liveEditor?.limitMinutes ?? limit
  const titles = phaseTitleMap(doc.phases)
  const cardMeta = parseTemplateMeta(doc.analysis.overrides?.templateCards)
  const analysisIds =
    liveEditor?.analysisTemplateIds ??
    lockedToolTemplateIds({
      toolType: canonicalBoardToolType(tool) ?? tool?.type,
      stored: tool?.analysis?.templateIds,
      assistChat: readToolAssist(tool).chat,
    })
  const parityTags: InterviewFlowSummaryTag[] = []
  const analysisTag = lockedAnalysisSummaryTag(phase.id, analysisIds, cardMeta)
  if (analysisTag) parityTags.push(analysisTag)
  const assistTag = assistSummaryTag(phase.id, tool)
  if (assistTag) parityTags.push(assistTag)
  const refTag = refsSummaryTag(phase, titles)
  if (refTag) parityTags.push(refTag)
  if (whenHasConditions(phase.when)) {
    parityTags.push({
      id: `${phase.id}.tag.when`,
      label: 'Only if',
      tone: 'meta',
      glyph: 'when',
    })
  }
  if (phase.required) {
    parityTags.push({
      id: `${phase.id}.tag.required`,
      label: 'Required',
      tone: 'meta',
      glyph: 'required',
      tooltip: 'Candidate must finish this section once it starts',
    })
  }
  if (isTimed && limitMin != null) {
    parityTags.push({
      id: `${phase.id}.tag.minutes`,
      label: `${limitMin}m`,
      tone: 'time',
      glyph: 'time',
      tooltip: `Hard timer ${limitMin} minute${limitMin === 1 ? '' : 's'}`,
    })
  }
  const fail = fromCreator2OnFail(phase.onFail)
  const failOpt = CREATOR2_FAIL_OPTIONS.find((o) => o.value === fail.onFail)
  if (fail.onFail !== 'none' && failOpt) {
    parityTags.push({
      id: `${phase.id}.tag.fail`,
      label: failOpt.label,
      tone: 'gate',
      glyph: 'fail',
      tooltip: failOpt.description,
    })
  }

  const toolLines = [
    tool?.editorKind ? `Editor · ${tool.editorKind}` : null,
    tool?.type ? `Type · ${tool.type}` : null,
    isTimed
      ? `Hard time limit · ${limitMin ?? estimated ?? '?'} min`
      : 'Timing · untimed (no hard wall-clock)',
    estimated != null ? `Planned duration · ${estimated} min` : null,
    tool?.minWords != null || tool?.maxWords != null
      ? `Word range · ${tool.minWords ?? 0}–${tool.maxWords ?? '∞'}`
      : null,
    opts?.offSpine ? 'Not in this interview’s sections — optional pack kept in tools{}' : null,
  ].filter(Boolean) as string[]

  const gateBranches =
    canonicalBoardToolType(tool) === 'form_quiz' && phase.toolRef && !opts?.offSpine
      ? formGateBranches(phase.toolRef, doc.phases)
      : undefined

  return {
    id: phase.id,
    kind:
      formEditor != null
        ? 'form'
        : codingEditor != null
          ? 'coding'
          : docEditor != null
            ? 'doc'
            : toolKind(tool) ?? 'unknown',
    title: liveEditor?.sectionTitle || sectionTitle,
    purpose: purposeForTool(tool),
    summary: liveEditor?.summaryBlurb || teaser.summary,
    tags: [...parityTags, ...teaser.tags],
    minutes: estimated,
    timed: isTimed,
    timing: {
      mode: isTimed ? 'timed' : 'untimed',
      estimatedMinutes: estimated,
      limitMinutes: limitMin,
    },
    onlyIf: whenLabel,
    branches: gateBranches ?? branchesFromOnFail(phase, doc.phases, whenLabel),
    packId: analysis.packId,
    packLabel: liveEditor?.packLabel || analysis.packLabel,
    analysisLines: analysis.lines,
    toolLines,
    formQuestions,
    formEditor,
    codingEditor,
    docEditor,
    testCases,
    languages: codingEditor?.languages ?? tool?.languages,
    defaultLanguage: codingEditor?.defaultLanguage ?? tool?.defaultLanguage ?? null,
    offSpine: opts?.offSpine,
  }
}

function mapRollup(doc: Creator2BriefDocument): InterviewFlowStep {
  const rollupId = doc.analysis.rollup?.templateId ?? 'rollup.attempt.v1'
  const weights = doc.analysis.rollup?.weights
  const weightSections = resolveRollupWeightSections(doc)
  const weightLabels = doc.analysis.rollup?.weightLabels
  const weightRows: InterviewFlowWrapEditorState['weights'] = weights
    ? Object.entries(weights).map(([k, v]) => ({
        key: k,
        label: rollupFolderLabel(k, weightLabels),
        value: v,
        sectionIds: weightSections[k] ?? [],
      }))
    : []
  const phaseTitle = new Map(
    (doc.phases ?? []).map((p) => [String(p.id), String(p.title ?? p.id)]),
  )
  const weightLines = weightRows.map((row) => {
    const secs = (row.sectionIds ?? [])
      .map((id) => phaseTitle.get(id) ?? id)
      .filter(Boolean)
    const secBit =
      secs.length === 0
        ? ''
        : secs.length === 1
          ? ` · ${secs[0]}`
          : ` · ${secs.length} sections`
    return `${row.label} · ${row.value}${secBit}`
  })
  const teaser = summaryForRollup('interview.rollup', weightLines.length)
  const wrapEditor: InterviewFlowWrapEditorState = {
    templateId: rollupId,
    weights: weightRows,
  }

  return {
    id: 'interview.rollup',
    kind: 'wrap',
    title: 'Decision package',
    purpose:
      'After the interview ends: gate result, topic summaries, tool marks, and open risks for the reviewer. Soft weights apply only among completed lenses; form stays a pass or fail screen.',
    summary: teaser.summary,
    tags: teaser.tags,
    packLabel: labelTemplate(rollupId),
    packId: null,
    analysisLines: [
      {
        id: rollupId,
        templateId: rollupId,
        label: labelTemplate(rollupId),
        when: grainHintForTemplate(rollupId),
      },
    ],
    toolLines: weightLines,
    wrapEditor,
  }
}

function buildTimingBudget(
  doc: Creator2BriefDocument,
  phaseTitle: Map<string, string>,
): InterviewFlowTimingBudget | undefined {
  const ts = doc.timingSummary
  const meta = doc.definition?.meta
  if (!meta) return ts
    ? {
        proposedMinutes: ts.proposedMinutes ?? ts.sumSections ?? 0,
        estimatedMinutes: ts.estimatedMinutes ?? ts.sumSections ?? 0,
        sumSections: ts.sumSections ?? 0,
        slackMinutes: ts.slackMinutes ?? 0,
        fitsProposed: ts.fitsProposed ?? true,
        sections:
          ts.sections?.map((s) => ({
            phaseId: String(s.phaseId ?? ''),
            title: phaseTitle.get(String(s.phaseId ?? '')) ?? String(s.phaseId ?? ''),
            minutes: Number(s.estimatedMinutes ?? 0),
            timed: Boolean(s.timed),
            limitMinutes: s.limitMinutes != null ? Number(s.limitMinutes) : undefined,
          })) ?? [],
      }
    : undefined
  if (!ts && meta.proposedMinutes == null) return undefined
  const sections =
    ts?.sections?.map((s) => {
      const phaseId = String(s.phaseId ?? '')
      return {
        phaseId,
        title: phaseTitle.get(phaseId) ?? phaseId,
        minutes: Number(s.estimatedMinutes ?? 0),
        timed: Boolean(s.timed),
        limitMinutes: s.limitMinutes != null ? Number(s.limitMinutes) : undefined,
      }
    }) ??
    doc.phases.map((p) => ({
      phaseId: p.id,
      title: p.title ?? p.id,
      minutes: p.estimatedMinutes ?? 0,
    }))
  const sumSections = ts?.sumSections ?? sections.reduce((a, s) => a + s.minutes, 0)
  const slack = ts?.slackMinutes ?? meta.timing?.slackMinutes ?? 0
  const proposed = ts?.proposedMinutes ?? meta.proposedMinutes ?? sumSections
  const estimated = ts?.estimatedMinutes ?? meta.estimatedMinutes ?? sumSections + slack
  return {
    proposedMinutes: proposed,
    estimatedMinutes: estimated,
    sumSections,
    slackMinutes: slack,
    fitsProposed: ts?.fitsProposed ?? estimated <= proposed + slack,
    fitPolicy: meta.timing?.fitPolicy,
    notes: meta.timing?.notes,
    sections,
  }
}

/** Map plan-shaped interview_brief JSON → Creator 2 timeline view model. */
export function mapCreator2BriefToTimeline(doc: Creator2BriefDocument): InterviewFlowTimelineBrief {
  const topics = new Map((doc.topicLibrary ?? []).map((t) => [t.id, t]))
  const steps: InterviewFlowStep[] = []
  const usedToolRefs = new Set<string>()
  const phaseTitle = new Map<string, string>()
  const pdRaw = doc.definition?.probeDefaults ?? {}
  const probeDefaults: InterviewFlowProbeDefaults = {
    maxFollowUps: pdRaw.maxFollowUps as number | undefined,
    targetMinutes: pdRaw.targetMinutes as number | undefined,
    maxProbes: pdRaw.maxProbes as number | undefined,
    minCandidateTurns: pdRaw.minCandidateTurns as number | undefined,
  }

  for (const phase of doc.phases) {
    if (phase.kind === 'discussion') {
      const step = mapDiscussionPhase(
        phase,
        topicForDiscussionPhase(phase, topics, doc.topicLibrary ?? []),
        doc,
        topics,
        probeDefaults,
      )
      steps.push(step)
      phaseTitle.set(phase.id, step.title)
    } else {
      if (phase.toolRef) usedToolRefs.add(phase.toolRef)
      const step = mapToolPhase(phase, doc.tools[phase.toolRef ?? ''], doc, topics)
      steps.push(step)
      phaseTitle.set(phase.id, step.title)
    }
  }

  for (const [toolRef, tool] of Object.entries(doc.tools)) {
    if (usedToolRefs.has(toolRef)) continue
    steps.push(
      mapToolPhase(
        {
          id: `offspine.${toolRef}`,
          kind: 'tool',
          toolRef,
          title: tool.title,
          estimatedMinutes: tool.timing?.estimatedMinutes,
          when: null,
          onFail: null,
        },
        tool,
        doc,
        topics,
        { offSpine: true },
      ),
    )
  }

  steps.push(mapRollup(doc))

  const definition = doc.definition ?? ({} as Creator2BriefDocument['definition'])
  const meta = definition.meta ?? ({} as Creator2BriefDocument['definition']['meta'])
  const persona = definition.persona
  const ad = definition.analysisDefaults as
    | { attachPackByTopicKind?: Record<string, string | null> }
    | undefined

  return {
    title: meta.title ?? '',
    roleTitle: meta.roleTitle ?? '',
    status: meta.status,
    proposedMinutes: meta.proposedMinutes ?? doc.timingSummary?.proposedMinutes ?? 0,
    estimatedMinutes:
      meta.estimatedMinutes ?? doc.timingSummary?.estimatedMinutes ?? meta.proposedMinutes ?? 0,
    roleDescription: meta.roleDescription ?? undefined,
    candidateDescription: meta.candidateDescription ?? undefined,
    // Tolerate partial Edge bodies that omit persona (never crash the builder).
    personaName: persona?.name ?? '',
    personaVoice: persona?.voice ?? '',
    behaviourPrompt: persona?.behaviourPrompt,
    category: meta.category ?? undefined,
    maxInterviews: meta.maxInterviews,
    opensAt: meta.opensAt ?? undefined,
    closesAt: meta.closesAt ?? undefined,
    coverName: meta.coverName ?? undefined,
    rolePdfName: meta.rolePdfName ?? undefined,
    systemGoals: definition.systemGoals,
    guardrails: definition.guardrails,
    probeDefaults,
    analysisDefaults: ad?.attachPackByTopicKind,
    analysisShelf: buildAnalysisShelf(doc),
    timingBudget: buildTimingBudget(doc, phaseTitle),
    steps,
  }
}

/** Template id → section titles that attach it (Talk + Form/Coding/Writing analysis). */
export function templateAttachHostsFromBrief(
  brief: InterviewFlowTimelineBrief,
): Record<string, string[]> {
  const hosts: Record<string, string[]> = {}
  const add = (id: string | undefined, title: string) => {
    const key = String(id ?? '').trim()
    if (!key) return
    const list = hosts[key] ?? (hosts[key] = [])
    if (!list.includes(title)) list.push(title)
  }
  for (const step of brief.steps) {
    const title = step.title || step.id
    for (const id of step.talkEditor?.templateIds ?? []) add(id, title)
    for (const id of step.formEditor?.analysisTemplateIds ?? []) add(id, title)
    for (const id of step.codingEditor?.analysisTemplateIds ?? []) add(id, title)
    for (const id of step.docEditor?.analysisTemplateIds ?? []) add(id, title)
  }
  return hosts
}
