import type { DocEditorPayload } from '../editorContext/types'
import { DEFAULT_PAGE_SETUP, type PageSetup } from '../docEditor/pageSetup'
import type {
  InterviewFlowDocAssessment,
  InterviewFlowDocPromptStructure,
  InterviewFlowDocRubricBand,
  InterviewFlowDocRubricDimension,
} from './flowTimelineTypes'
import { canonicalWritingAssessmentKind } from '../../../../back_end/supabase/functions/_shared/interview-assessors/writingAssessmentKind.ts'

/** Default analytic bands — short labels + rater descriptors (IELTS/TOEFL style). */
export const WRITING_RUBRIC_DEFAULT_BANDS: readonly InterviewFlowDocRubricBand[] = [
  {
    id: 'limited',
    label: '1 — Limited',
    descriptor:
      'Addresses the task only partially or vaguely. Ideas are unclear, underdeveloped, or off-topic; organization and language frequently impede meaning.',
  },
  {
    id: 'developing',
    label: '2 — Developing',
    descriptor:
      'Addresses the task with some relevant points, but support is thin or uneven. Organization is detectable yet inconsistent; language errors sometimes obscure meaning.',
  },
  {
    id: 'competent',
    label: '3 — Competent',
    descriptor:
      'Addresses the task adequately with relevant, generally well-supported ideas. Clear progression and mostly controlled language; minor lapses do not impede communication.',
  },
  {
    id: 'strong',
    label: '4 — Strong',
    descriptor:
      'Fully addresses the task with well-developed, well-organized ideas. Cohesive progression and precise, flexible language with only rare, non-impeding slips.',
  },
]

function cloneDefaultBands(): InterviewFlowDocRubricBand[] {
  return WRITING_RUBRIC_DEFAULT_BANDS.map((b) => ({ ...b }))
}

/** Common writing criteria authors can add quickly (dropdown) — with band descriptors. */
export const WRITING_RUBRIC_DIMENSION_PRESETS: readonly InterviewFlowDocRubricDimension[] = [
  {
    key: 'task_response',
    label: 'Task response',
    criterion:
      'How fully and relevantly the response addresses the prompt, develops a position, and supports it with ideas.',
    bands: cloneDefaultBands(),
  },
  {
    key: 'coherence',
    label: 'Coherence & cohesion',
    criterion:
      'Organization, paragraphing, logical flow, and use of cohesive devices so the reader can follow the argument.',
    bands: cloneDefaultBands(),
  },
  {
    key: 'lexical',
    label: 'Lexical resource',
    criterion:
      'Range and precision of vocabulary, including topic-specific wording and natural collocation.',
    bands: cloneDefaultBands(),
  },
  {
    key: 'grammar',
    label: 'Grammar & accuracy',
    criterion:
      'Range and control of sentence structures; accuracy of grammar and punctuation relative to communicative effect.',
    bands: cloneDefaultBands(),
  },
  {
    key: 'evidence',
    label: 'Evidence & reasoning',
    criterion:
      'Quality of examples, justification, and reasoning used to support claims.',
    bands: cloneDefaultBands(),
  },
  {
    key: 'tradeoffs',
    label: 'Tradeoffs & judgment',
    criterion:
      'Recognition of competing considerations, limitations, and soundness of conclusions.',
    bands: cloneDefaultBands(),
  },
]

function parseOptionalWeight(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) return raw
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number(raw.trim())
    if (Number.isFinite(n) && n >= 0) return n
  }
  return undefined
}

function parseStructureIds(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const ids = raw.map((x) => String(x ?? '').trim()).filter(Boolean)
  return ids.length ? [...new Set(ids)] : []
}

/** Migrate legacy `options: string[]` axes into band rows (empty descriptors). */
export function normalizeRubricDimension(
  raw: {
    key?: string
    label?: string
    criterion?: string
    weight?: number | string
    structureIds?: string[]
    bands?: Array<{ id?: string; label?: string; descriptor?: string }>
    options?: string[]
  },
  index = 0,
): InterviewFlowDocRubricDimension {
  const key = raw.key?.trim() || `dim.${index + 1}`
  const label = raw.label?.trim() || `Criterion ${index + 1}`
  const criterion = raw.criterion?.trim() || undefined
  const weight = parseOptionalWeight(raw.weight)
  const structureIds = parseStructureIds(raw.structureIds)
  const fromBands = (raw.bands ?? [])
    .map((b, i) => ({
      id: b.id?.trim() || `band.${i + 1}`,
      label: b.label?.trim() || `Level ${i + 1}`,
      descriptor: b.descriptor?.trim() || '',
    }))
    .filter((b) => b.label)

  const base = {
    key,
    label,
    ...(criterion ? { criterion } : {}),
    ...(weight != null ? { weight } : {}),
    ...(structureIds != null ? { structureIds } : {}),
  }

  if (fromBands.length > 0) {
    return { ...base, bands: fromBands }
  }
  const fromOptions = (raw.options ?? []).map(String).map((s) => s.trim()).filter(Boolean)
  if (fromOptions.length > 0) {
    return {
      ...base,
      bands: fromOptions.map((opt, i) => ({
        id: `opt.${i + 1}`,
        label: opt,
        descriptor: '',
      })),
    }
  }
  return {
    ...base,
    bands: cloneDefaultBands(),
  }
}

export function defaultWritingRubricDimensions(): InterviewFlowDocRubricDimension[] {
  const first = WRITING_RUBRIC_DIMENSION_PRESETS[0]!
  return [
    {
      key: first.key,
      label: first.label,
      criterion: first.criterion,
      bands: cloneDefaultBands(),
    },
  ]
}

/**
 * Format-compliance ladder. A `format` section grades whether the response follows the
 * required shape, so it cannot borrow the rubric band descriptors — those judge argument
 * quality ("develops a position"), which is not what the author asked for.
 */
export const WRITING_FORMAT_BANDS: readonly InterviewFlowDocRubricBand[] = [
  {
    id: 'off_format',
    label: '1 — Off format',
    descriptor:
      'Does not follow the required shape. Required sections are missing, unlabelled, or unrecognisable against the outline.',
  },
  {
    id: 'partial_format',
    label: '2 — Partly to format',
    descriptor:
      'Some required elements are present, but sections are missing, merged, misordered, or clearly incomplete.',
  },
  {
    id: 'mostly_format',
    label: '3 — Mostly to format',
    descriptor:
      'Follows the required shape with minor deviations — a stray heading, a light section, or a small length overrun.',
  },
  {
    id: 'meets_format',
    label: '4 — Meets format',
    descriptor:
      'Follows the required shape in full: every outlined section present and labelled, in order, within any stated length.',
  },
]

export const WRITING_FORMAT_DIMENSION_KEY = 'format_compliance'

/**
 * The single axis a `format` section is marked on. The author's `formatNotes` is the
 * criterion — it is literally what they said to look for — so it must reach the marker
 * as the axis gloss, not as a side field next to an unrelated rubric preset.
 */
export function formatComplianceDimension(
  formatNotes?: string,
): InterviewFlowDocRubricDimension {
  const notes = String(formatNotes ?? '').trim()
  return {
    key: WRITING_FORMAT_DIMENSION_KEY,
    label: 'Format compliance',
    criterion:
      notes ||
      'Whether the response follows the required structure and format for this brief.',
    bands: WRITING_FORMAT_BANDS.map((b) => ({ ...b })),
  }
}

/**
 * The one marking matrix for a doc tool — what the assessor grades AND what the results
 * table prints. Both used to derive it separately: transport normalised through the
 * timeline (which injects a default axis when the author wrote none) while the results
 * read the raw brief. They disagreed on exactly the sections that had no authored rows,
 * so a real mark rendered as zeroed catalog axes. One resolver, no drift.
 */
export function resolveDocAssessment(tool: {
  assessment?: {
    kind?: string
    dimensions?: Array<Record<string, unknown>>
    formatNotes?: string
  }
} | null | undefined): InterviewFlowDocAssessment {
  const assessment = tool?.assessment
  const kind = canonicalWritingAssessmentKind(assessment?.kind)
  const formatNotes = String(assessment?.formatNotes ?? '').trim() || undefined
  const authored = (assessment?.dimensions ?? []).map((d, i) =>
    normalizeRubricDimension(d as Parameters<typeof normalizeRubricDimension>[0], i),
  )
  if (kind === 'format') {
    // An author who picked Format never sees the criterion editor, so authored rows are
    // normally absent. Respect them if a bot or an earlier Rubric pass left some.
    return {
      kind,
      dimensions: authored.length > 0 ? authored : [formatComplianceDimension(formatNotes)],
      ...(formatNotes ? { formatNotes } : {}),
    }
  }
  return {
    kind,
    dimensions: authored.length > 0 ? authored : defaultWritingRubricDimensions(),
    ...(formatNotes ? { formatNotes } : {}),
  }
}

/** One compiled matrix row for Creator preview (not DocEditor markdown). */
export type WritingMarkingMatrixPreviewBand = {
  label: string
  descriptor: string
}

export type WritingMarkingMatrixPreviewRow = {
  key: string
  label: string
  weight: string
  covers: string
  lookingFor: string
  bands: WritingMarkingMatrixPreviewBand[]
}

/**
 * Auto-compile the marking matrix from section assessment + outline.
 * Lives in Creator UI only — never embed in DocEditor artifact markdown.
 */
export function buildWritingMarkingMatrixPreview(opts: {
  structure: readonly InterviewFlowDocPromptStructure[]
  assessment: InterviewFlowDocAssessment
}): WritingMarkingMatrixPreviewRow[] {
  if (opts.assessment.kind !== 'rubric') return []
  const structureById = new Map(opts.structure.map((s) => [s.id, s.label] as const))
  return opts.assessment.dimensions.map((d) => {
    const weight =
      typeof d.weight === 'number' && Number.isFinite(d.weight) ? String(d.weight) : '—'
    const covers =
      d.structureIds && d.structureIds.length > 0
        ? d.structureIds.map((id) => structureById.get(id) || id).join(', ')
        : 'Whole response'
    const looking = (d.criterion ?? '').trim() || '—'
    const bands =
      d.bands.length > 0
        ? d.bands.map((b) => ({
            label: b.label,
            descriptor: b.descriptor.trim(),
          }))
        : []
    return {
      key: d.key,
      label: d.label,
      weight,
      covers,
      lookingFor: looking,
      bands,
    }
  })
}

/** Sitting + Creator writing canvas — never A4/page-break showcase dumps. */
export const WRITING_PAGELESS_SETUP: PageSetup = {
  ...DEFAULT_PAGE_SETUP,
  pageSize: 'pageless',
}

const WRITING_STRIP_FENCE_LINE_RE =
  /(?:^|\n)\s*:::(?:doc-page-break|doc-gif|doc-video|doc-youtube)\b[^\n]*/gi
const WRITING_STRIP_MD_IMAGE_RE = /!\[[^\]]*\]\([^)]+\)/g
const WRITING_STRIP_LEXICAL_TYPES = new Set(['page-break', 'doc-image', 'video-embed'])
const AUTHOR_WRITING_SCAFFOLD_RE =
  /##\s*(Rubric\s*\(author only\)|Marking matrix(?:\s*\(author only\))?|Prompt|Expected structure|Outline|Requirements|Your answer)\b/i

/** Strip Creator/LLM page-break and media tokens from writing markdown. */
export function stripWritingPageBreaks(markdown: string): string {
  return markdown
    .replace(WRITING_STRIP_FENCE_LINE_RE, '\n')
    .replace(WRITING_STRIP_MD_IMAGE_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Persist writing artifacts: pageless + no page-break or media tokens (sidecar or tree). */
export function persistWritingDocument(document: DocEditorPayload): DocEditorPayload {
  return {
    ...document,
    pageSetup: WRITING_PAGELESS_SETUP,
    markdown:
      typeof document.markdown === 'string'
        ? stripWritingPageBreaks(document.markdown)
        : document.markdown,
    lexical: stripWritingPageBreakLexical(document.lexical) as DocEditorPayload['lexical'],
  }
}

/** Drop Lexical page-break and media nodes so they cannot remount on the writing canvas. */
export function stripWritingPageBreakLexical(lexical: unknown): unknown {
  if (lexical == null) return lexical
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      return node
        .map(walk)
        .filter((child) => {
          if (child == null) return false
          if (child && typeof child === 'object') {
            const type = (child as { type?: string }).type
            if (typeof type === 'string' && WRITING_STRIP_LEXICAL_TYPES.has(type)) return false
          }
          return true
        })
    }
    if (!node || typeof node !== 'object') return node
    const o = node as Record<string, unknown>
    if (typeof o.type === 'string' && WRITING_STRIP_LEXICAL_TYPES.has(o.type)) return null
    const next: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(o)) {
      next[key] = walk(value)
    }
    return next
  }
  return walk(lexical)
}

/** Candidate fill-in headings under ## Your answer (mirrors coding seed stubs). */
export function writingAnswerHeadingTemplate(
  structure: readonly InterviewFlowDocPromptStructure[],
): string {
  const rows = structure.length > 0 ? structure : [{ id: 'body', label: 'Response' }]
  return rows.map((row) => `### ${String(row.label ?? '').trim() || 'Section'}\n`).join('\n')
}

function writingYourAnswerBody(markdown: string): string {
  const parts = markdown.split(/##\s*Your answer\b/i)
  if (parts.length < 2) return ''
  return parts
    .slice(1)
    .join('')
    .replace(/^##\s*(Prompt|Outline|Requirements|Length\s*&\s*time|Rubric|Marking matrix)\b[\s\S]*/i, '')
    .trim()
}

/** If ## Your answer is empty, stamp outline headings as the sitting template. */
export function fillEmptyWritingAnswer(
  markdown: string,
  structure: readonly InterviewFlowDocPromptStructure[],
): string {
  const cleaned = stripWritingPageBreaks(markdown)
  const template = writingAnswerHeadingTemplate(structure)
  if (!cleaned.trim()) return `## Your answer\n\n${template}`
  if (!/##\s*(Prompt|Your answer)\b/i.test(cleaned)) return cleaned
  if (writingYourAnswerBody(cleaned).length > 8) return cleaned
  if (/##\s*Your answer\b/i.test(cleaned)) {
    return cleaned.replace(/(##\s*Your answer\b)[^\n]*\n*/i, `$1\n\n${template}`)
  }
  return `${cleaned.trim()}\n\n## Your answer\n\n${template}`
}

/**
 * Candidate editor seed: Prompt / Outline / Requirements stay in prep chrome.
 * Keep the ## Your answer template (or a non-scaffold seed). Never a blank canvas.
 */
export function candidateWritingSeedMarkdown(
  markdown: string,
  structure: readonly InterviewFlowDocPromptStructure[] = [],
): string {
  let md = fillEmptyWritingAnswer(markdown, structure)
  md = md.replace(LENGTH_TIME_SECTION_RE, (_match, lead: string) => (lead === '\n' ? '\n' : lead))
  md = md.replace(/\n{3,}/g, '\n\n').trim()
  if (!AUTHOR_WRITING_SCAFFOLD_RE.test(md)) return md
  const answer = writingYourAnswerBody(md)
  return answer || writingAnswerHeadingTemplate(structure).trim()
}

/** Legacy creator hint — never ship this to candidates once limits exist. */
export const WRITING_LENGTH_TIME_PLACEHOLDER =
  '_Set word range and timer on the Writing tool settings._'

export type WritingLengthTimeLimits = {
  minWords?: number | null
  maxWords?: number | null
  timed?: boolean
  limitMinutes?: number | null
}

/** Candidate-facing Length & time body from tool settings, or null when unset. */
export function formatWritingLengthTimeBody(limits: WritingLengthTimeLimits): string | null {
  const lines: string[] = []
  const min =
    typeof limits.minWords === 'number' && Number.isFinite(limits.minWords) && limits.minWords > 0
      ? Math.floor(limits.minWords)
      : null
  const max =
    typeof limits.maxWords === 'number' && Number.isFinite(limits.maxWords) && limits.maxWords > 0
      ? Math.floor(limits.maxWords)
      : null
  if (min != null && max != null) lines.push(`- **Words:** ${min}–${max}`)
  else if (min != null) lines.push(`- **Words:** at least ${min}`)
  else if (max != null) lines.push(`- **Words:** up to ${max}`)

  if (limits.timed) {
    const mins =
      typeof limits.limitMinutes === 'number' &&
      Number.isFinite(limits.limitMinutes) &&
      limits.limitMinutes > 0
        ? Math.floor(limits.limitMinutes)
        : null
    lines.push(
      mins != null
        ? `- **Hard timer:** ${mins} minute${mins === 1 ? '' : 's'}`
        : '- **Hard timer:** on',
    )
  }

  return lines.length > 0 ? lines.join('\n') : null
}

const LENGTH_TIME_SECTION_RE =
  /(^|\n)##\s*Length\s*&\s*time\s*\n[\s\S]*?(?=\n##\s+|\s*$)/i

/** Rewrite or remove ## Length & time from scaffold markdown. */
export function applyWritingLengthTimeToMarkdown(
  markdown: string,
  limits: WritingLengthTimeLimits,
): string {
  const hasPlaceholder = markdown.includes('Set word range and timer on the Writing tool settings')
  const hasSection = LENGTH_TIME_SECTION_RE.test(markdown)
  const body = formatWritingLengthTimeBody(limits)
  if (!hasPlaceholder && !hasSection && !body) return markdown

  let md = markdown.replace(
    new RegExp(`\\n?${WRITING_LENGTH_TIME_PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n?`, 'g'),
    '\n',
  )
  const block = body ? `## Length & time\n${body}\n` : ''

  if (LENGTH_TIME_SECTION_RE.test(md)) {
    md = md.replace(LENGTH_TIME_SECTION_RE, (_match, lead: string) => {
      if (!block) return lead === '\n' ? '\n' : lead
      return `${lead === '\n' ? '\n' : lead}${block}`
    })
  } else if (body) {
    if (/##\s*Your answer\b/i.test(md)) {
      md = md.replace(/(##\s*Your answer\b)/i, `${block}\n$1`)
    } else {
      md = `${md.trimEnd()}\n\n${block}`
    }
  }

  return `${md.replace(/\n{3,}/g, '\n\n').trim()}\n`
}

function stripLengthTimePlaceholderFromLexical(lexical: unknown): unknown {
  if (lexical == null) return lexical
  try {
    const raw = JSON.stringify(lexical)
    if (!raw.includes('Set word range and timer on the Writing tool settings')) return lexical
    return JSON.parse(
      raw.replace(/_?Set word range and timer on the Writing tool settings\.?_?/g, ''),
    )
  } catch {
    return lexical
  }
}

/**
 * Keep DocEditor Length & time aligned with tool timer / word range.
 * When markdown can carry the section, clear lexical so the editor reloads from markdown.
 */
export function syncWritingDocumentLengthTime(
  document: DocEditorPayload,
  limits: WritingLengthTimeLimits,
): DocEditorPayload {
  const md = typeof document.markdown === 'string' ? document.markdown : ''
  const placeholderInLexical =
    document.lexical != null &&
    JSON.stringify(document.lexical).includes('Set word range and timer on the Writing tool settings')
  const placeholderInMarkdown = md.includes('Set word range and timer on the Writing tool settings')
  const hasLengthHeading = /##\s*Length\s*&\s*time\b/i.test(md)
  const body = formatWritingLengthTimeBody(limits)

  if (md.trim()) {
    const nextMd = applyWritingLengthTimeToMarkdown(md, limits)
    const changed = nextMd !== md || placeholderInLexical
    if (!changed && !placeholderInLexical) {
      return {
        ...document,
        markdown: stripWritingPageBreaks(md),
        lexical: stripWritingPageBreakLexical(document.lexical) as DocEditorPayload['lexical'],
        pageSetup: WRITING_PAGELESS_SETUP,
      }
    }
    return {
      ...document,
      markdown: stripWritingPageBreaks(nextMd),
      lexical: null,
      pageSetup: WRITING_PAGELESS_SETUP,
    }
  }

  if (placeholderInLexical || (body != null && placeholderInLexical)) {
    return {
      ...document,
      lexical: stripLengthTimePlaceholderFromLexical(document.lexical) as DocEditorPayload['lexical'],
    }
  }

  if (placeholderInMarkdown || hasLengthHeading) {
    return {
      ...document,
      markdown: applyWritingLengthTimeToMarkdown(md || '## Your answer\n', limits),
      lexical: null,
    }
  }

  // No markdown scaffold — leave lexical alone (limits still live in tool settings).
  return document
}

/** Seed / refresh a writing artifact from prompt (mirrors coding README scaffold). */
export function composeWritingDocument(opts: {
  title: string
  brief: string
  structure: readonly InterviewFlowDocPromptStructure[]
  requirements: readonly string[]
  assessment: InterviewFlowDocAssessment
  existing?: DocEditorPayload | null
  minWords?: number | null
  maxWords?: number | null
  timed?: boolean
  limitMinutes?: number | null
}): DocEditorPayload {
  const title = opts.title.trim() || 'Writing prompt'
  const existing = opts.existing
  const limits: WritingLengthTimeLimits = {
    minWords: opts.minWords,
    maxWords: opts.maxWords,
    timed: opts.timed,
    limitMinutes: opts.limitMinutes,
  }
  const hasRichContent =
    Boolean(existing?.lexical) ||
    Boolean(existing?.markdown && existing.markdown.trim().length > 40)

  if (hasRichContent && existing) {
    const filledMd =
      typeof existing.markdown === 'string'
        ? fillEmptyWritingAnswer(existing.markdown, opts.structure)
        : existing.markdown
    return syncWritingDocumentLengthTime(
      {
        ...existing,
        title: existing.title?.trim() || title,
        markdown: filledMd,
        lexical: stripWritingPageBreakLexical(existing.lexical) as DocEditorPayload['lexical'],
        pageSetup: WRITING_PAGELESS_SETUP,
      },
      limits,
    )
  }

  // Marking matrix stays in assessment.* + Creator preview table — not in this markdown.
  void opts.assessment

  const brief = opts.brief.trim() || 'Describe the writing task for the candidate.'
  const structureLines =
    opts.structure.length > 0
      ? opts.structure
          .map((row, i) => {
            const min =
              typeof row.minParagraphs === 'number' && row.minParagraphs > 0
                ? ` (min ${row.minParagraphs} ¶)`
                : ''
            return `${i + 1}. **${row.label}**${row.hint?.trim() ? ` — ${row.hint.trim()}` : ''}${min}`
          })
          .join('\n')
      : '1. **Response** — Main answer'

  const reqLines =
    opts.requirements.length > 0
      ? opts.requirements.map((r) => `- ${r}`).join('\n')
      : '- Address every structure section'

  const lengthBody = formatWritingLengthTimeBody(limits)
  const markdown = [
    '## Prompt',
    brief,
    '',
    '## Outline',
    structureLines,
    '',
    '## Requirements',
    reqLines,
    '',
    ...(lengthBody ? ['## Length & time', lengthBody, ''] : []),
    '## Your answer',
    '',
    writingAnswerHeadingTemplate(opts.structure).trimEnd(),
    '',
  ].join('\n')

  return {
    title,
    markdown: fillEmptyWritingAnswer(markdown, opts.structure),
    lexical: null,
    pageSetup: WRITING_PAGELESS_SETUP,
  }
}

export function ensureWritingDocumentScaffold(
  document: DocEditorPayload,
  meta: {
    title: string
    brief: string
    structure: readonly InterviewFlowDocPromptStructure[]
    requirements: readonly string[]
    assessment: InterviewFlowDocAssessment
    minWords?: number | null
    maxWords?: number | null
    timed?: boolean
    limitMinutes?: number | null
  },
): DocEditorPayload {
  return composeWritingDocument({
    ...meta,
    existing: document,
  })
}
