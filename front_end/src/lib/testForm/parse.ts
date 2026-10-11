import { stripAnswerKey } from './scoring'
import {
  TEST_FORM_SCHEMA,
  TEST_FORM_VERSION,
  createEmptyTestForm,
  ensureAnswerKeys,
  type TestFormDocument,
  type TestFormEditorPayload,
  type TestFormMode,
  type TestFormQuestion,
  type TestFormQuestionKind,
  type TestFormSection,
} from './types'

const KNOWN_KINDS = new Set<TestFormQuestionKind>([
  'short_text',
  'essay',
  'mcq_single',
  'mcq_multi',
  'dropdown',
  'fill_blank',
  'ordinal',
  'ordinal_grid',
])

/**
 * Bot / leftover kind tags → live `TestFormQuestionKind`. Twin of
 * `formQuestionTriage.ts` `FORM_KIND_ALIASES` — keep both lists in lockstep
 * (gated in `parse.unit.mjs`).
 */
export const KIND_ALIASES: Record<string, TestFormQuestionKind> = {
  single: 'mcq_single',
  single_choice: 'mcq_single',
  mcq: 'mcq_single',
  radio: 'mcq_single',
  true_false: 'mcq_single',
  truefalse: 'mcq_single',
  yes_no: 'mcq_single',
  boolean: 'mcq_single',
  multi: 'mcq_multi',
  multi_choice: 'mcq_multi',
  checkbox: 'mcq_multi',
  checkboxes: 'mcq_multi',
  text: 'short_text',
  short: 'short_text',
  string: 'short_text',
  number: 'short_text',
  long: 'essay',
  long_text: 'essay',
  short_essay: 'essay',
  paragraph: 'essay',
  textarea: 'essay',
  select: 'dropdown',
}

const TRUE_FALSE_ALIASES = new Set(['true_false', 'truefalse', 'yes_no', 'boolean'])

export function canonicalFormQuestionKind(raw: unknown): TestFormQuestionKind {
  if (typeof raw !== 'string') return 'short_text'
  const t = raw.trim()
  if (KNOWN_KINDS.has(t as TestFormQuestionKind)) return t as TestFormQuestionKind
  return KIND_ALIASES[t.toLowerCase()] ?? 'short_text'
}

export function isTestFormDocument(value: unknown): value is TestFormDocument {
  if (!value || typeof value !== 'object') return false
  const doc = value as Record<string, unknown>
  return (
    doc.schema === TEST_FORM_SCHEMA &&
    doc.version === TEST_FORM_VERSION &&
    typeof doc.id === 'string' &&
    typeof doc.title === 'string' &&
    Array.isArray(doc.questions)
  )
}

function shortId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`
}

function mapLegacyKind(raw: unknown): TestFormQuestionKind {
  return canonicalFormQuestionKind(raw)
}

function normalizeOptions(raw: unknown): Array<{ id: string; label: string }> {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [
      { id: 'opt_a', label: 'Option A' },
      { id: 'opt_b', label: 'Option B' },
    ]
  }
  return raw.map((o, i) => {
    if (typeof o === 'string') return { id: `opt_${i}`, label: o }
    const row = (o && typeof o === 'object' ? o : {}) as Record<string, unknown>
    return {
      id: String(row.id ?? `opt_${i}`),
      label: String(row.label ?? row.id ?? `Option ${i + 1}`),
    }
  })
}

function normalizeQuestion(
  q: Record<string, unknown>,
  fallbackSectionId: string,
): TestFormQuestion {
  const rawKind = String(q.kind ?? q.type ?? '')
  const kind = mapLegacyKind(rawKind)
  const base = {
    id: String(q.id ?? shortId('q')),
    kind,
    prompt: String(q.prompt ?? q.label ?? q.title ?? 'Question'),
    sectionId: String(q.sectionId ?? fallbackSectionId),
    required: q.required !== false,
    points: typeof q.points === 'number' ? q.points : undefined,
    description: typeof q.description === 'string' ? q.description : undefined,
    hint: typeof q.hint === 'string' ? q.hint : undefined,
  }

  if (kind === 'mcq_single' || kind === 'mcq_multi' || kind === 'dropdown') {
    const options =
      TRUE_FALSE_ALIASES.has(rawKind.toLowerCase()) &&
      (!Array.isArray(q.options) || q.options.length === 0)
        ? [
            { id: 'yes', label: 'Yes' },
            { id: 'no', label: 'No' },
          ]
        : normalizeOptions(q.options)
    return { ...base, kind, options } as TestFormQuestion
  }
  if (kind === 'fill_blank') {
    let segments = Array.isArray(q.segments)
      ? (q.segments as Extract<TestFormQuestion, { kind: 'fill_blank' }>['segments'])
      : null
    // Bot / Edge dialect often ships `blanks: [{id}]` without FE `segments`.
    if ((!segments || !segments.length) && Array.isArray(q.blanks) && q.blanks.length) {
      const built: Extract<TestFormQuestion, { kind: 'fill_blank' }>['segments'] = []
      let rest = base.prompt
      for (const raw of q.blanks as Array<Record<string, unknown>>) {
        const id = String(raw.id ?? raw.blankId ?? 'b1')
        const token = `{{${id}}}`
        const idx = rest.indexOf(token)
        const placeholder =
          typeof raw.label === 'string'
            ? raw.label
            : typeof raw.placeholder === 'string'
              ? raw.placeholder
              : undefined
        if (idx >= 0) {
          if (idx > 0) built.push({ type: 'text', text: rest.slice(0, idx) })
          built.push({
            type: 'blank',
            blankId: id,
            ...(placeholder ? { placeholder } : {}),
          })
          rest = rest.slice(idx + token.length)
        } else {
          built.push({
            type: 'blank',
            blankId: id,
            ...(placeholder ? { placeholder } : {}),
          })
        }
      }
      if (rest) built.push({ type: 'text', text: rest })
      if (!built.some((s) => s.type === 'text')) {
        built.unshift({ type: 'text', text: base.prompt })
      }
      segments = built
    }
    if (!segments || !segments.length) {
      segments = [
        { type: 'text' as const, text: base.prompt },
        { type: 'blank' as const, blankId: 'b1' },
      ]
    }
    return { ...base, kind: 'fill_blank', segments }
  }
  if (kind === 'ordinal') {
    const scaleObj =
      q.scale && typeof q.scale === 'object'
        ? (q.scale as Record<string, unknown>)
        : null
    const scale = {
      min:
        typeof scaleObj?.min === 'number'
          ? scaleObj.min
          : typeof q.min === 'number'
            ? q.min
            : 1,
      max:
        typeof scaleObj?.max === 'number'
          ? scaleObj.max
          : typeof q.max === 'number'
            ? q.max
            : 5,
    }
    return { ...base, kind: 'ordinal', scale }
  }
  if (kind === 'ordinal_grid') {
    return {
      ...base,
      kind: 'ordinal_grid',
      rows: Array.isArray(q.rows)
        ? (q.rows as Extract<TestFormQuestion, { kind: 'ordinal_grid' }>['rows'])
        : [],
      columns: Array.isArray(q.columns)
        ? (q.columns as Extract<TestFormQuestion, { kind: 'ordinal_grid' }>['columns'])
        : [],
    }
  }
  if (kind === 'essay') {
    return { ...base, kind: 'essay' }
  }
  const inputFormat =
    typeof q.inputFormat === 'string' &&
    ['text', 'number', 'email', 'phone', 'date'].includes(q.inputFormat)
      ? (q.inputFormat as NonNullable<
          Extract<TestFormQuestion, { kind: 'short_text' }>['inputFormat']
        >)
      : rawKind.toLowerCase() === 'number'
        ? 'number'
        : undefined
  return { ...base, kind: 'short_text', inputFormat }
}

/**
 * Recover legacy bot / import dialects into `vurify/test-form`.
 * Handles nested `sections[].questions`, `type:"single"|"multi"`, and missing schema shells.
 * Returns null when input has no recoverable form shape.
 */
export function coerceLegacyTestFormDocument(input: unknown): TestFormDocument | null {
  if (!input || typeof input !== 'object') return null
  let root = input as Record<string, unknown>
  if (root.document && typeof root.document === 'object') {
    root = root.document as Record<string, unknown>
  } else if (root.formSchema && typeof root.formSchema === 'object') {
    root = root.formSchema as Record<string, unknown>
  } else if (root.inline && typeof root.inline === 'object') {
    root = root.inline as Record<string, unknown>
  }

  const sectionsIn = Array.isArray(root.sections)
    ? (root.sections as Array<Record<string, unknown>>)
    : []
  const flatIn = Array.isArray(root.questions)
    ? [...(root.questions as Array<Record<string, unknown>>)]
    : []
  const hasNested = sectionsIn.some((s) => Array.isArray(s.questions))
  const looksLikeForm =
    root.schema === TEST_FORM_SCHEMA || flatIn.length > 0 || hasNested
  if (!looksLikeForm) return null

  const sectionsOut: TestFormSection[] = []
  const flatQs: Array<Record<string, unknown>> = [...flatIn]

  for (const sec of sectionsIn) {
    const sid = String(sec.id ?? shortId('sec'))
    const nested = Array.isArray(sec.questions)
      ? (sec.questions as Array<Record<string, unknown>>)
      : []
    for (const q of nested) {
      flatQs.push({ ...q, sectionId: q.sectionId ?? sid })
    }
    sectionsOut.push({
      id: sid,
      title: String(sec.title ?? 'Section'),
      description: typeof sec.description === 'string' ? sec.description : undefined,
    })
  }

  if (!sectionsOut.length) {
    const sid = 'sec.main'
    sectionsOut.push({
      id: sid,
      title: String(root.title ?? 'Questions'),
    })
    for (const q of flatQs) {
      if (!q.sectionId) q.sectionId = sid
    }
  }

  const fallbackSectionId = sectionsOut[0]?.id ?? 'sec.main'
  const questions = flatQs.map((q) => normalizeQuestion(q, fallbackSectionId))

  const answerKey =
    root.answerKey && typeof root.answerKey === 'object'
      ? (root.answerKey as TestFormDocument['answerKey'])
      : {}

  return ensureAnswerKeys({
    schema: TEST_FORM_SCHEMA,
    version: TEST_FORM_VERSION,
    id: typeof root.id === 'string' && root.id ? root.id : shortId('form'),
    title: typeof root.title === 'string' && root.title ? root.title : 'Untitled form',
    settings:
      root.settings && typeof root.settings === 'object'
        ? {
            shuffleQuestions: Boolean(
              (root.settings as Record<string, unknown>).shuffleQuestions,
            ),
            showHintsInTake:
              (root.settings as Record<string, unknown>).showHintsInTake !== false,
          }
        : { shuffleQuestions: false, showHintsInTake: true },
    sections: sectionsOut,
    questions,
    answerKey,
  })
}

export function normalizeTestFormDocument(input: unknown): {
  document: TestFormDocument
  warnings?: string[]
} {
  if (isTestFormDocument(input)) {
    const doc = input
    const sections = Array.isArray(doc.sections) ? doc.sections : []
    const fallbackSectionId = sections[0]?.id ?? 'sec.main'
    return {
      document: ensureAnswerKeys({
        ...doc,
        sections,
        // Always re-normalize questions — schema-tagged bot docs may still omit
        // fill_blank.segments / ordinal.scale (FE crash otherwise).
        questions: (Array.isArray(doc.questions) ? doc.questions : []).map((q) =>
          normalizeQuestion(q as unknown as Record<string, unknown>, fallbackSectionId),
        ),
      }),
    }
  }
  if (input && typeof input === 'object') {
    const record = input as Record<string, unknown>
    if (record.document && isTestFormDocument(record.document)) {
      return normalizeTestFormDocument(record.document)
    }
  }
  const coerced = coerceLegacyTestFormDocument(input)
  if (coerced) {
    return {
      document: coerced,
      warnings: ['Coerced legacy test form dialect into vurify/test-form.'],
    }
  }
  // Never swap in Screening sample — that misrepresents Creator-2 / import failures.
  return {
    document: createEmptyTestForm('Untitled form'),
    warnings: ['Could not parse test form document — loaded empty form.'],
  }
}

export function normalizeTestFormPayload(input: unknown): {
  payload: TestFormEditorPayload
  warnings?: string[]
} {
  if (typeof input === 'string') {
    try {
      return normalizeTestFormPayload(JSON.parse(input) as unknown)
    } catch {
      return {
        payload: { document: createEmptyTestForm('Untitled form'), mode: 'author' },
        warnings: ['Could not convert input to test form — loaded empty form.'],
      }
    }
  }
  if (input && typeof input === 'object') {
    const record = input as Record<string, unknown>
    if (record.document !== undefined) {
      const mode =
        record.mode === 'take' || record.mode === 'review' || record.mode === 'author'
          ? (record.mode as TestFormMode)
          : 'author'
      const { document, warnings } = normalizeTestFormDocument(record.document)
      return { payload: { document, mode }, warnings }
    }
  }
  const { document, warnings } = normalizeTestFormDocument(input)
  return { payload: { document, mode: 'author' }, warnings }
}

export function questionKindLabel(kind: TestFormQuestionKind): string {
  switch (kind) {
    case 'short_text':
      return 'Short answer'
    case 'essay':
      return 'Paragraph'
    case 'mcq_single':
      return 'Multiple choice'
    case 'mcq_multi':
      return 'Checkboxes'
    case 'dropdown':
      return 'Dropdown'
    case 'fill_blank':
      return 'Fill in the blank'
    case 'ordinal':
      return 'Linear scale'
    case 'ordinal_grid':
      return 'Multiple-choice grid'
  }
}

export { stripAnswerKey }
