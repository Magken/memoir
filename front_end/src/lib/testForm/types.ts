/** Canonical TestForm document model (`schema: vurify/test-form`). */

export const TEST_FORM_SCHEMA = 'vurify/test-form' as const
export const TEST_FORM_VERSION = 1 as const
/** Drive `files_doc_kinds.kind_key` for this workbench. */
export const TEST_FORM_DOC_KIND = 'form' as const

export type TestFormMode = 'author' | 'take' | 'review'

export type TestFormQuestionKind =
  | 'short_text'
  | 'essay'
  | 'mcq_single'
  | 'mcq_multi'
  | 'dropdown'
  | 'fill_blank'
  | 'ordinal'
  | 'ordinal_grid'

export type TestFormMcqOption = {
  id: string
  label: string
}

export type TestFormGridRow = {
  id: string
  label: string
}

export type TestFormGridColumn = {
  id: string
  label: string
}

/** Prompt parts for fill-in-the-blank: text segments alternate with blank tokens. */
export type TestFormFillSegment =
  | { type: 'text'; text: string }
  | { type: 'blank'; blankId: string; placeholder?: string }

export type TestFormOrdinalScale = {
  min: number
  max: number
  step?: number
  minLabel?: string
  maxLabel?: string
}

export type TestFormQuestionBase = {
  id: string
  kind: TestFormQuestionKind
  prompt: string
  /** Groups questions under a section heading + hairline. */
  sectionId?: string
  required?: boolean
  points?: number
  /** Always-visible helper under the prompt (Google Forms “Description”). */
  description?: string
  /** Optional tip — shown in take when settings allow. */
  hint?: string
}

export type TestFormShortTextFormat = 'text' | 'number' | 'email' | 'phone' | 'date'

export type TestFormShortTextQuestion = TestFormQuestionBase & {
  kind: 'short_text'
  /**
   * Take-time input constraint — wired to `lib/forms/formValidation`
   * (`text` | `number` | `email` | `phone` | `date`).
   */
  inputFormat?: TestFormShortTextFormat
}

export type TestFormEssayQuestion = TestFormQuestionBase & {
  kind: 'essay'
}

export type TestFormMcqSingleQuestion = TestFormQuestionBase & {
  kind: 'mcq_single'
  options: TestFormMcqOption[]
}

export type TestFormMcqMultiQuestion = TestFormQuestionBase & {
  kind: 'mcq_multi'
  options: TestFormMcqOption[]
}

export type TestFormDropdownQuestion = TestFormQuestionBase & {
  kind: 'dropdown'
  options: TestFormMcqOption[]
}

export type TestFormFillBlankQuestion = TestFormQuestionBase & {
  kind: 'fill_blank'
  segments: TestFormFillSegment[]
}

export type TestFormOrdinalQuestion = TestFormQuestionBase & {
  kind: 'ordinal'
  scale: TestFormOrdinalScale
}

/** Multiple-choice grid / Likert matrix — one column per row. */
export type TestFormOrdinalGridQuestion = TestFormQuestionBase & {
  kind: 'ordinal_grid'
  rows: TestFormGridRow[]
  columns: TestFormGridColumn[]
}

export type TestFormQuestion =
  | TestFormShortTextQuestion
  | TestFormEssayQuestion
  | TestFormMcqSingleQuestion
  | TestFormMcqMultiQuestion
  | TestFormDropdownQuestion
  | TestFormFillBlankQuestion
  | TestFormOrdinalQuestion
  | TestFormOrdinalGridQuestion

export type ShortTextMatch = 'exact' | 'contains' | 'regex'

export type TestFormAnswerKeyEntry =
  | {
      kind: 'short_text'
      match: ShortTextMatch
      value: string
      caseSensitive?: boolean
      /** Deny-list — matching any reject marks the answer incorrect. */
      rejects?: string[]
    }
  | { kind: 'essay'; keywords?: string[]; rubricNotes?: string }
  | { kind: 'mcq_single'; optionId: string }
  | { kind: 'mcq_multi'; optionIds: string[] }
  | { kind: 'dropdown'; optionId: string }
  | {
      kind: 'fill_blank'
      /** Accepted answers per blank (any match scores). */
      blanks: Record<string, string[]>
      /** Optional deny-list per blank — matching any reject fails that blank. */
      rejects?: Record<string, string[]>
    }
  | { kind: 'ordinal'; min?: number; max?: number; exact?: number }
  | { kind: 'ordinal_grid'; expected?: Record<string, string>; rubricNotes?: string }

export type TestFormAnswerKey = Record<string, TestFormAnswerKeyEntry>

export type TestFormResponseValue =
  | { kind: 'short_text'; value: string }
  | { kind: 'essay'; value: string }
  | { kind: 'mcq_single'; optionId: string | null }
  | { kind: 'mcq_multi'; optionIds: string[] }
  | { kind: 'dropdown'; optionId: string | null }
  | { kind: 'fill_blank'; blanks: Record<string, string> }
  | { kind: 'ordinal'; value: number | null }
  | { kind: 'ordinal_grid'; values: Record<string, string | null> }

export type TestFormResponses = Record<string, TestFormResponseValue>

export type TestFormQuestionScore = {
  questionId: string
  earned: number
  max: number
  auto: boolean
  correct?: boolean
  notes?: string
  /** graded = counts toward totals; ungraded excluded (no scheme) */
  status?: 'graded' | 'ungraded'
}

export type TestFormAttempt = {
  startedAt?: string
  submittedAt?: string
  responses: TestFormResponses
  scores?: TestFormQuestionScore[]
  totalEarned?: number
  totalMax?: number
}

export type TestFormSettings = {
  shuffleQuestions?: boolean
  showHintsInTake?: boolean
}

export type TestFormSection = {
  id: string
  title: string
  description?: string
}

export type TestFormDocument = {
  schema: typeof TEST_FORM_SCHEMA
  version: typeof TEST_FORM_VERSION
  id: string
  title: string
  settings: TestFormSettings
  /** Ordered section headings — questions reference via `sectionId`. */
  sections: TestFormSection[]
  questions: TestFormQuestion[]
  /** Author / Drive only — strip before candidate take payloads. */
  answerKey?: TestFormAnswerKey
  attempt?: TestFormAttempt
}

export type TestFormEditorPayload = {
  document: TestFormDocument
  mode: TestFormMode
}

export function newTestFormId(prefix = 'tf'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function emptyAnswerKeyForQuestion(q: TestFormQuestion): TestFormAnswerKeyEntry {
  switch (q.kind) {
    case 'short_text':
      return { kind: 'short_text', match: 'exact', value: '' }
    case 'essay':
      return { kind: 'essay', keywords: [], rubricNotes: '' }
    case 'mcq_single':
      return { kind: 'mcq_single', optionId: q.options[0]?.id ?? '' }
    case 'mcq_multi':
      return { kind: 'mcq_multi', optionIds: [] }
    case 'dropdown':
      return { kind: 'dropdown', optionId: q.options[0]?.id ?? '' }
    case 'fill_blank': {
      const blanks: Record<string, string[]> = {}
      const segments = Array.isArray(q.segments) ? q.segments : []
      for (const seg of segments) {
        if (seg.type === 'blank') blanks[seg.blankId] = ['']
      }
      return { kind: 'fill_blank', blanks }
    }
    case 'ordinal':
      return {
        kind: 'ordinal',
        min: q.scale?.min ?? 1,
        max: q.scale?.max ?? 5,
      }
    case 'ordinal_grid':
      return { kind: 'ordinal_grid', expected: {}, rubricNotes: '' }
  }
}

/** Keep keyed entries that match question kind; fill missing from blanks.
 *  Do not wipe rich bot keys that omit/mismatch `kind` when fields are compatible. */
export function ensureAnswerKeys(doc: TestFormDocument): TestFormDocument {
  const answerKey: TestFormAnswerKey = { ...(doc.answerKey ?? {}) }
  let changed = !doc.answerKey
  for (const q of doc.questions) {
    const existing = answerKey[q.id] as (TestFormAnswerKeyEntry & Record<string, unknown>) | undefined
    if (!existing) {
      answerKey[q.id] = emptyAnswerKeyForQuestion(q)
      changed = true
      continue
    }
    if (existing.kind === q.kind) continue

    const tagged = adoptAnswerKeyToQuestionKind(existing, q)
    if (tagged) {
      answerKey[q.id] = tagged
      changed = true
    } else {
      answerKey[q.id] = emptyAnswerKeyForQuestion(q)
      changed = true
    }
  }
  return changed ? { ...doc, answerKey } : doc
}

/** Recover bot keys that forgot `kind` or used a near-miss tag. */
function adoptAnswerKeyToQuestionKind(
  existing: Record<string, unknown>,
  q: TestFormQuestion,
): TestFormAnswerKeyEntry | null {
  switch (q.kind) {
    case 'short_text':
      if (
        typeof existing.value === 'string' ||
        Array.isArray(existing.rejects) ||
        existing.match === 'exact' ||
        existing.match === 'contains' ||
        existing.match === 'regex'
      ) {
        return {
          kind: 'short_text',
          match:
            existing.match === 'contains' || existing.match === 'regex'
              ? existing.match
              : 'exact',
          value: String(existing.value ?? ''),
          caseSensitive: Boolean(existing.caseSensitive),
          rejects: Array.isArray(existing.rejects)
            ? (existing.rejects as string[])
            : undefined,
        }
      }
      return null
    case 'mcq_single':
    case 'dropdown':
      if (typeof existing.optionId === 'string') {
        return { kind: q.kind, optionId: existing.optionId }
      }
      return null
    case 'mcq_multi':
      if (Array.isArray(existing.optionIds)) {
        return { kind: 'mcq_multi', optionIds: existing.optionIds as string[] }
      }
      return null
    case 'essay':
      if (Array.isArray(existing.keywords) || typeof existing.rubricNotes === 'string') {
        return {
          kind: 'essay',
          keywords: Array.isArray(existing.keywords) ? (existing.keywords as string[]) : [],
          rubricNotes: String(existing.rubricNotes ?? ''),
        }
      }
      return null
    case 'fill_blank':
      if (existing.blanks && typeof existing.blanks === 'object') {
        return {
          kind: 'fill_blank',
          blanks: existing.blanks as Record<string, string[]>,
          rejects:
            existing.rejects && typeof existing.rejects === 'object'
              ? (existing.rejects as Record<string, string[]>)
              : undefined,
        }
      }
      return null
    case 'ordinal':
      return {
        kind: 'ordinal',
        min: typeof existing.min === 'number' ? existing.min : q.scale.min,
        max: typeof existing.max === 'number' ? existing.max : q.scale.max,
        exact: typeof existing.exact === 'number' ? existing.exact : undefined,
      }
    case 'ordinal_grid':
      return {
        kind: 'ordinal_grid',
        expected:
          existing.expected && typeof existing.expected === 'object'
            ? (existing.expected as Record<string, string>)
            : {},
        rubricNotes: String(existing.rubricNotes ?? ''),
      }
    default:
      return null
  }
}

export function answerKeyHasContent(entry: TestFormAnswerKeyEntry | undefined): boolean {
  if (!entry) return false
  switch (entry.kind) {
    case 'short_text':
      return Boolean(entry.value.trim() || (entry.rejects?.length ?? 0) > 0)
    case 'essay':
      return Boolean((entry.keywords?.length ?? 0) > 0 || entry.rubricNotes?.trim())
    case 'mcq_single':
    case 'dropdown':
      return Boolean(entry.optionId)
    case 'mcq_multi':
      return entry.optionIds.length > 0
    case 'fill_blank':
      return Object.values(entry.blanks).some((list) => list.some((s) => s.trim()))
    case 'ordinal':
      return true
    case 'ordinal_grid':
      return Boolean(
        Object.keys(entry.expected ?? {}).length > 0 || entry.rubricNotes?.trim(),
      )
  }
}

export function createBlankQuestion(
  kind: TestFormQuestionKind,
  sectionId?: string,
): TestFormQuestion {
  const id = newTestFormId('q')
  const section = sectionId ? { sectionId } : {}
  switch (kind) {
    case 'short_text':
      return {
        id,
        kind,
        prompt: 'Short answer question',
        description: 'One line is enough.',
        points: 1,
        required: true,
        inputFormat: 'text',
        ...section,
      }
    case 'essay':
      return {
        id,
        kind,
        prompt: 'Paragraph question',
        description: 'Write a few sentences.',
        points: 5,
        required: true,
        ...section,
      }
    case 'mcq_single': {
      const a = newTestFormId('opt')
      const b = newTestFormId('opt')
      return {
        id,
        kind,
        prompt: 'Choose one',
        points: 1,
        required: true,
        ...section,
        options: [
          { id: a, label: 'Option A' },
          { id: b, label: 'Option B' },
        ],
      }
    }
    case 'mcq_multi': {
      const a = newTestFormId('opt')
      const b = newTestFormId('opt')
      const c = newTestFormId('opt')
      return {
        id,
        kind,
        prompt: 'Select all that apply',
        points: 2,
        required: true,
        ...section,
        options: [
          { id: a, label: 'Option A' },
          { id: b, label: 'Option B' },
          { id: c, label: 'Option C' },
        ],
      }
    }
    case 'dropdown': {
      const a = newTestFormId('opt')
      const b = newTestFormId('opt')
      const c = newTestFormId('opt')
      return {
        id,
        kind,
        prompt: 'Pick from the list',
        description: 'Use the dropdown to choose one answer.',
        points: 1,
        required: true,
        ...section,
        options: [
          { id: a, label: 'Option A' },
          { id: b, label: 'Option B' },
          { id: c, label: 'Option C' },
        ],
      }
    }
    case 'fill_blank': {
      const b1 = newTestFormId('blank')
      const b2 = newTestFormId('blank')
      return {
        id,
        kind,
        prompt: 'Fill in the blanks',
        points: 2,
        required: true,
        ...section,
        segments: [
          { type: 'text', text: 'I am ' },
          { type: 'blank', blankId: b1, placeholder: '…' },
          { type: 'text', text: ' going to ' },
          { type: 'blank', blankId: b2, placeholder: '…' },
          { type: 'text', text: '.' },
        ],
      }
    }
    case 'ordinal':
      return {
        id,
        kind,
        prompt: 'Rate your agreement',
        description: 'Tap a number on the scale.',
        points: 1,
        required: true,
        ...section,
        scale: {
          min: 1,
          max: 5,
          step: 1,
          minLabel: 'Strongly disagree',
          maxLabel: 'Strongly agree',
        },
      }
    case 'ordinal_grid': {
      const r1 = newTestFormId('row')
      const r2 = newTestFormId('row')
      const r3 = newTestFormId('row')
      const c1 = newTestFormId('col')
      const c2 = newTestFormId('col')
      const c3 = newTestFormId('col')
      const c4 = newTestFormId('col')
      const c5 = newTestFormId('col')
      return {
        id,
        kind,
        prompt: 'Rate each statement',
        description: 'Choose one column per row.',
        points: 3,
        required: true,
        ...section,
        rows: [
          { id: r1, label: 'Statement A' },
          { id: r2, label: 'Statement B' },
          { id: r3, label: 'Statement C' },
        ],
        columns: [
          { id: c1, label: '1' },
          { id: c2, label: '2' },
          { id: c3, label: '3' },
          { id: c4, label: '4' },
          { id: c5, label: '5' },
        ],
      }
    }
  }
}

export function createBlankSection(title = 'New section'): TestFormSection {
  return { id: newTestFormId('sec'), title, description: '' }
}

export function createEmptyTestForm(title = 'Untitled test'): TestFormDocument {
  return {
    schema: TEST_FORM_SCHEMA,
    version: TEST_FORM_VERSION,
    id: newTestFormId('form'),
    title,
    settings: { shuffleQuestions: false, showHintsInTake: true },
    sections: [],
    questions: [],
    answerKey: {},
  }
}

export function emptyResponseForQuestion(q: TestFormQuestion): TestFormResponseValue {
  switch (q.kind) {
    case 'short_text':
      return { kind: 'short_text', value: '' }
    case 'essay':
      return { kind: 'essay', value: '' }
    case 'mcq_single':
      return { kind: 'mcq_single', optionId: null }
    case 'mcq_multi':
      return { kind: 'mcq_multi', optionIds: [] }
    case 'dropdown':
      return { kind: 'dropdown', optionId: null }
    case 'fill_blank': {
      const blanks: Record<string, string> = {}
      for (const seg of Array.isArray(q.segments) ? q.segments : []) {
        if (seg.type === 'blank') blanks[seg.blankId] = ''
      }
      return { kind: 'fill_blank', blanks }
    }
    case 'ordinal':
      return { kind: 'ordinal', value: null }
    case 'ordinal_grid': {
      const values: Record<string, string | null> = {}
      for (const row of q.rows) values[row.id] = null
      return { kind: 'ordinal_grid', values }
    }
  }
}

/** Inclusive tick values for a discrete ordinal scale. */
export function ordinalScaleTicks(scale: TestFormOrdinalScale): number[] {
  const step = scale.step && scale.step > 0 ? scale.step : 1
  const ticks: number[] = []
  const start = scale.min
  const end = scale.max
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return ticks
  for (let v = start; v <= end + 1e-9; v += step) {
    ticks.push(Math.round(v * 1000) / 1000)
    if (ticks.length > 32) break
  }
  return ticks
}
