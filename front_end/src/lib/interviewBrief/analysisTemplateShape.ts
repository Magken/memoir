/**
 * Creator-2 analysis template **shape** — return/storage/editable config.
 * Catalog JSON is the source of truth for built-in templates; brief overrides
 * may edit axes/lists per interview. Storage keys stay internal (not authored).
 */

import { catalogTemplate } from './analysisTemplateCatalog'

export type InterviewFlowTemplateOutputKind =
  | 'dimensions'
  | 'taxonomy'
  | 'scalar'
  | 'enum'
  | 'passFail'
  | 'paragraph'

export type InterviewFlowTemplateJustification =
  | 'always_required'
  | 'optional'
  | 'none'

export type InterviewFlowEvidenceModel = 'accumulative' | 'manner' | 'coverage'
export type InterviewFlowPolarity = 'positive' | 'negative'

export type InterviewFlowTemplateDimension = {
  key: string
  label: string
  options: string[]
  defaultOption?: string
  /** Per-rung descriptor, index-aligned with `options`. */
  optionNotes?: string[]
  evidenceModel?: InterviewFlowEvidenceModel
  polarity?: InterviewFlowPolarity
}

export const EVIDENCE_MODEL_LABELS: Record<InterviewFlowEvidenceModel, string> = {
  accumulative: 'Instances',
  manner: 'Consistency',
  coverage: 'Coverage',
}

export const POLARITY_LABELS: Record<InterviewFlowPolarity, string> = {
  positive: 'Positive',
  negative: 'Negative',
}

export type InterviewFlowTemplateShape = {
  outputKind: InterviewFlowTemplateOutputKind
  /** Internal grain key — derived from template id; not shown in Creator. */
  storageKey: string
  justificationPolicy: InterviewFlowTemplateJustification
  /** Multi-axis rubric — label → editable option list. */
  dimensions: InterviewFlowTemplateDimension[]
  /** Label list for taxonomy returns. */
  taxonomy: string[]
  maxPerTurn: number
  /** Discrete primary `result` values when outputKind === enum. */
  enumValues: string[]
}

/** Short labels for chips / collapsed rows (not developer jargon). */
export const OUTPUT_KIND_LABELS: Record<InterviewFlowTemplateOutputKind, string> = {
  dimensions: 'Rubric',
  taxonomy: 'Label list',
  scalar: 'Score',
  enum: 'Choice',
  passFail: 'Pass / fail',
  paragraph: 'Summary',
}

export const JUSTIFICATION_LABELS: Record<InterviewFlowTemplateJustification, string> = {
  always_required: 'Required',
  optional: 'Optional',
  none: 'None',
}

/** Starter blueprints when creating a brief-local template. */
export type TemplateCreateStarterId =
  | 'rubric'
  | 'labels'
  | 'choice'
  | 'gate'
  | 'summary'

export type TemplateCreateStarter = {
  id: TemplateCreateStarterId
  label: string
  hint: string
  title: string
  details: string
  shape: Omit<InterviewFlowTemplateShape, 'storageKey'>
}

const WEAK_MIXED_STRONG = ['weak', 'mixed', 'strong'] as const

const EVIDENCE_MODELS = new Set<string>(['accumulative', 'manner', 'coverage'])
const POLARITIES = new Set<string>(['positive', 'negative'])

export function sanitizeAxisPolarity(
  model: InterviewFlowEvidenceModel | undefined,
  polarity: InterviewFlowPolarity | undefined,
): InterviewFlowPolarity | undefined {
  if (!polarity) return undefined
  if (polarity === 'negative' && model !== 'accumulative') return 'positive'
  return polarity
}

function parseEvidenceModel(raw: unknown): InterviewFlowEvidenceModel | undefined {
  if (typeof raw !== 'string') return undefined
  const s = raw.trim().toLowerCase()
  return EVIDENCE_MODELS.has(s) ? (s as InterviewFlowEvidenceModel) : undefined
}

function parsePolarity(raw: unknown): InterviewFlowPolarity | undefined {
  if (typeof raw !== 'string') return undefined
  const s = raw.trim().toLowerCase()
  return POLARITIES.has(s) ? (s as InterviewFlowPolarity) : undefined
}

function alignOptionNotes(options: string[], notes: unknown): string[] | undefined {
  if (!Array.isArray(notes)) return undefined
  const aligned = options.map((_, i) => {
    const n = notes[i]
    return typeof n === 'string' ? n : n == null ? '' : String(n)
  })
  return aligned.some((n) => n.trim()) ? aligned : undefined
}

function dim(
  key: string,
  label: string,
  options: readonly string[],
  defaultOption?: string,
  extra?: Pick<InterviewFlowTemplateDimension, 'evidenceModel' | 'polarity' | 'optionNotes'>,
): InterviewFlowTemplateDimension {
  return {
    key,
    label,
    options: [...options],
    ...(defaultOption ? { defaultOption } : {}),
    ...(extra?.evidenceModel ? { evidenceModel: extra.evidenceModel } : {}),
    ...(extra?.polarity ? { polarity: extra.polarity } : {}),
    ...(extra?.optionNotes ? { optionNotes: extra.optionNotes } : {}),
  }
}

export const TEMPLATE_CREATE_STARTERS: readonly TemplateCreateStarter[] = [
  {
    id: 'rubric',
    label: 'Rubric',
    hint: 'Several scored axes with option lists',
    title: 'New rubric',
    details: 'Score the answer on each axis below.',
    shape: {
      outputKind: 'dimensions',
      justificationPolicy: 'always_required',
      dimensions: [
        dim('axis1', 'Axis 1', WEAK_MIXED_STRONG, 'mixed'),
        dim('axis2', 'Axis 2', WEAK_MIXED_STRONG, 'mixed'),
      ],
      taxonomy: [],
      maxPerTurn: 3,
      enumValues: [],
    },
  },
  {
    id: 'labels',
    label: 'Label list',
    hint: 'Pick from a list of labels (emotions, goals, …)',
    title: 'New label list',
    details: 'Tag turns with labels from this list.',
    shape: {
      outputKind: 'taxonomy',
      justificationPolicy: 'optional',
      dimensions: [],
      taxonomy: ['curious', 'confident', 'uncertain'],
      maxPerTurn: 3,
      enumValues: [],
    },
  },
  {
    id: 'choice',
    label: 'Choice',
    hint: 'One primary result from a fixed set',
    title: 'New choice result',
    details: 'Pick a single outcome for this template.',
    shape: {
      outputKind: 'enum',
      justificationPolicy: 'always_required',
      dimensions: [],
      taxonomy: [],
      maxPerTurn: 3,
      enumValues: ['low', 'med', 'high'],
    },
  },
  {
    id: 'gate',
    label: 'Pass / fail',
    hint: 'Gate or eligibility check',
    title: 'New pass / fail',
    details: 'Mark whether the candidate passed this check.',
    shape: {
      outputKind: 'passFail',
      justificationPolicy: 'optional',
      dimensions: [],
      taxonomy: [],
      maxPerTurn: 3,
      enumValues: [],
    },
  },
  {
    id: 'summary',
    label: 'Summary',
    hint: 'Short reviewer paragraph',
    title: 'New summary',
    details: 'Write a short reviewer-facing paragraph.',
    shape: {
      outputKind: 'paragraph',
      justificationPolicy: 'none',
      dimensions: [],
      taxonomy: [],
      maxPerTurn: 3,
      enumValues: [],
    },
  },
]

const OUTPUT_KINDS = new Set<string>([
  'dimensions',
  'taxonomy',
  'scalar',
  'enum',
  'passFail',
  'paragraph',
])

const JUSTIFICATIONS = new Set<string>(['always_required', 'optional', 'none'])

export function slugKey(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return base || 'axis'
}

export function defaultStorageKeyForTemplate(templateId: string): string {
  return templateId.replace(/\.v\d+$/, '') || templateId
}

function parseStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim())
    .filter(Boolean)
}

function parseDimension(raw: unknown): InterviewFlowTemplateDimension | null {
  if (typeof raw === 'string') {
    const label = raw.trim()
    if (!label) return null
    return {
      key: slugKey(label),
      label,
      options: [...WEAK_MIXED_STRONG],
      defaultOption: 'mixed',
    }
  }
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  // Bot near-miss: name / title / criterion instead of label; bands instead of options.
  const key = typeof row.key === 'string' ? row.key.trim() : typeof row.id === 'string' ? row.id.trim() : ''
  const label =
    typeof row.label === 'string'
      ? row.label.trim()
      : typeof row.name === 'string'
        ? row.name.trim()
        : typeof row.title === 'string'
          ? row.title.trim()
          : typeof row.criterion === 'string'
            ? row.criterion.trim()
            : ''
  if (!key && !label) return null
  let options = parseStringList(row.options)
  let bandNotes: string[] | undefined
  if (!options.length && Array.isArray(row.bands)) {
    const bands = row.bands
    options = bands
      .map((b) => {
        if (typeof b === 'string') return b.trim()
        if (b && typeof b === 'object') {
          const band = b as Record<string, unknown>
          return String(band.label ?? band.id ?? '').trim()
        }
        return ''
      })
      .filter(Boolean)
    bandNotes = bands.map((b) => {
      if (b && typeof b === 'object') {
        const band = b as Record<string, unknown>
        return typeof band.descriptor === 'string' ? band.descriptor : ''
      }
      return ''
    })
  }
  const optionsFinal = options.length ? options : [...WEAK_MIXED_STRONG]
  const optionNotes = alignOptionNotes(optionsFinal, row.optionNotes ?? bandNotes)
  const defaultOption =
    typeof row.defaultOption === 'string' ? row.defaultOption.trim() : ''
  const evidenceModel = parseEvidenceModel(row.evidenceModel)
  const polarity = sanitizeAxisPolarity(evidenceModel, parsePolarity(row.polarity))
  return {
    key: key || slugKey(label || 'axis'),
    label: label || key || 'Axis',
    options: optionsFinal,
    ...(defaultOption ? { defaultOption } : {}),
    ...(optionNotes ? { optionNotes } : {}),
    ...(evidenceModel ? { evidenceModel } : {}),
    ...(polarity ? { polarity } : {}),
  }
}

function parseDimensions(raw: unknown): InterviewFlowTemplateDimension[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(parseDimension)
    .filter((d): d is InterviewFlowTemplateDimension => Boolean(d))
}

function shapeFromCatalogEntry(
  templateId: string,
): InterviewFlowTemplateShape | null {
  const entry = catalogTemplate(templateId)
  if (!entry) return null
  const outputKind =
    entry.outputKind && OUTPUT_KINDS.has(entry.outputKind)
      ? entry.outputKind
      : null
  if (!outputKind) return null
  const justificationPolicy =
    entry.justificationPolicy && JUSTIFICATIONS.has(entry.justificationPolicy)
      ? entry.justificationPolicy
      : outputKind === 'passFail'
        ? 'optional'
        : outputKind === 'paragraph'
          ? 'none'
          : 'always_required'
  const dimensions = parseDimensions(entry.dimensions)
  return {
    outputKind,
    storageKey: defaultStorageKeyForTemplate(templateId),
    justificationPolicy,
    dimensions: outputKind === 'dimensions' ? dimensions : [],
    taxonomy: outputKind === 'taxonomy' ? parseStringList(entry.taxonomy) : [],
    maxPerTurn:
      typeof entry.maxPerTurn === 'number' && Number.isFinite(entry.maxPerTurn)
        ? Math.max(1, Math.min(12, Math.round(entry.maxPerTurn)))
        : 3,
    enumValues: outputKind === 'enum' ? parseStringList(entry.enumValues) : [],
  }
}

export function defaultOutputKindForTemplate(
  templateId: string,
): InterviewFlowTemplateOutputKind {
  const fromCatalog = shapeFromCatalogEntry(templateId)
  if (fromCatalog) return fromCatalog.outputKind
  if (templateId.startsWith('synth.') || templateId.startsWith('rollup.')) {
    return 'paragraph'
  }
  if (templateId.startsWith('custom.')) return 'dimensions'
  if (templateId.startsWith('iv.') || templateId.startsWith('mark.')) {
    return 'dimensions'
  }
  return 'scalar'
}

export function defaultShapeForTemplate(templateId: string): InterviewFlowTemplateShape {
  const fromCatalog = shapeFromCatalogEntry(templateId)
  if (fromCatalog) {
    if (
      fromCatalog.outputKind === 'dimensions' &&
      fromCatalog.dimensions.length === 0
    ) {
      return {
        ...fromCatalog,
        dimensions: [dim('axis1', 'Axis 1', WEAK_MIXED_STRONG, 'mixed')],
      }
    }
    return fromCatalog
  }
  const outputKind = defaultOutputKindForTemplate(templateId)
  return {
    outputKind,
    storageKey: defaultStorageKeyForTemplate(templateId),
    justificationPolicy:
      outputKind === 'passFail'
        ? 'optional'
        : outputKind === 'paragraph'
          ? 'none'
          : 'always_required',
    dimensions:
      outputKind === 'dimensions'
        ? [dim('axis1', 'Axis 1', WEAK_MIXED_STRONG, 'mixed')]
        : [],
    taxonomy: outputKind === 'taxonomy' ? ['curious', 'confident', 'uncertain'] : [],
    maxPerTurn: 3,
    enumValues: outputKind === 'enum' ? ['low', 'med', 'high'] : [],
  }
}

export function starterById(id: TemplateCreateStarterId): TemplateCreateStarter {
  return (
    TEMPLATE_CREATE_STARTERS.find((s) => s.id === id) ?? TEMPLATE_CREATE_STARTERS[0]!
  )
}

export function shapeFromStarter(
  starterId: TemplateCreateStarterId,
  templateId: string,
): InterviewFlowTemplateShape {
  const starter = starterById(starterId)
  return {
    ...starter.shape,
    storageKey: defaultStorageKeyForTemplate(templateId),
    dimensions: starter.shape.dimensions.map((d) => ({ ...d, options: [...d.options] })),
    taxonomy: [...starter.shape.taxonomy],
    enumValues: [...starter.shape.enumValues],
  }
}

/** Merge catalog defaults with brief overrides (partial ok). */
export function resolveTemplateShape(
  templateId: string,
  overrides?: Partial<InterviewFlowTemplateShape> | null,
): InterviewFlowTemplateShape {
  const base = defaultShapeForTemplate(templateId)
  if (!overrides) return base

  const outputKind =
    overrides.outputKind && OUTPUT_KINDS.has(overrides.outputKind)
      ? overrides.outputKind
      : base.outputKind

  const justificationPolicy =
    overrides.justificationPolicy && JUSTIFICATIONS.has(overrides.justificationPolicy)
      ? overrides.justificationPolicy
      : base.justificationPolicy

  let dimensions = base.dimensions
  if (overrides.dimensions !== undefined) {
    const parsed = parseDimensions(overrides.dimensions)
    // Empty brief override should not wipe catalog axes.
    dimensions = parsed.length > 0 ? parsed : base.dimensions
  }

  let taxonomy = base.taxonomy
  if (overrides.taxonomy !== undefined) {
    const parsed = parseStringList(overrides.taxonomy)
    taxonomy = parsed.length > 0 || base.taxonomy.length === 0 ? parsed : base.taxonomy
  }

  let enumValues = base.enumValues
  if (overrides.enumValues !== undefined) {
    const parsed = parseStringList(overrides.enumValues)
    enumValues =
      parsed.length > 0 || base.enumValues.length === 0 ? parsed : base.enumValues
  }

  return {
    outputKind,
    storageKey: defaultStorageKeyForTemplate(templateId),
    justificationPolicy,
    dimensions: outputKind === 'dimensions' ? dimensions : [],
    taxonomy: outputKind === 'taxonomy' ? taxonomy : [],
    maxPerTurn:
      typeof overrides.maxPerTurn === 'number' && Number.isFinite(overrides.maxPerTurn)
        ? Math.max(1, Math.min(12, Math.round(overrides.maxPerTurn)))
        : base.maxPerTurn,
    enumValues: outputKind === 'enum' ? enumValues : [],
  }
}

/** Parse shape fields from a stored templateCards row (may be title-only). */
export function parseTemplateShapeFields(
  templateId: string,
  row: Record<string, unknown>,
): InterviewFlowTemplateShape {
  const partial: Partial<InterviewFlowTemplateShape> = {}
  const outputRaw = row.outputKind ?? row.kind ?? row.representation
  if (typeof outputRaw === 'string') {
    const key = outputRaw.trim().toLowerCase().replace(/[\s-]+/g, '_')
    const map: Record<string, InterviewFlowTemplateOutputKind> = {
      dimensions: 'dimensions',
      rubric: 'dimensions',
      scorecard: 'dimensions',
      taxonomy: 'taxonomy',
      labels: 'taxonomy',
      tags: 'taxonomy',
      enum: 'enum',
      choice: 'enum',
      passfail: 'passFail',
      pass_fail: 'passFail',
      gate: 'passFail',
      paragraph: 'paragraph',
      summary: 'paragraph',
      scalar: 'scalar',
      score: 'scalar',
    }
    const coerced = map[key] ?? (OUTPUT_KINDS.has(outputRaw) ? (outputRaw as InterviewFlowTemplateOutputKind) : null)
    if (coerced) partial.outputKind = coerced
  }
  const justRaw = row.justificationPolicy ?? row.justification
  if (typeof justRaw === 'string') {
    const s = justRaw.trim().toLowerCase().replace(/[\s-]+/g, '_')
    const just =
      ['always_required', 'always', 'required', 'must'].includes(s)
        ? 'always_required'
        : ['optional', 'opt'].includes(s)
          ? 'optional'
          : ['none', 'never', 'no'].includes(s)
            ? 'none'
            : JUSTIFICATIONS.has(justRaw)
              ? (justRaw as InterviewFlowTemplateJustification)
              : null
    if (just) partial.justificationPolicy = just
  }
  if (Array.isArray(row.dimensions)) {
    partial.dimensions = parseDimensions(row.dimensions)
  }
  if (Array.isArray(row.taxonomy)) partial.taxonomy = parseStringList(row.taxonomy)
  if (typeof row.maxPerTurn === 'number') partial.maxPerTurn = row.maxPerTurn
  if (Array.isArray(row.enumValues)) partial.enumValues = parseStringList(row.enumValues)
  return resolveTemplateShape(templateId, partial)
}

/** Persist shape for brief overrides (always full, stable). */
export function serializeTemplateShape(
  shape: InterviewFlowTemplateShape,
  templateId: string,
): InterviewFlowTemplateShape {
  return {
    outputKind: shape.outputKind,
    storageKey: defaultStorageKeyForTemplate(templateId),
    justificationPolicy: shape.justificationPolicy,
    dimensions: shape.dimensions.map((d) => {
      const options = d.options.map((o) => o.trim()).filter(Boolean)
      const evidenceModel = d.evidenceModel
      const polarity = sanitizeAxisPolarity(evidenceModel, d.polarity)
      const optionNotes = alignOptionNotes(options, d.optionNotes)
      return {
        key: d.key.trim() || slugKey(d.label),
        label: d.label.trim() || d.key,
        options,
        ...(d.defaultOption?.trim()
          ? { defaultOption: d.defaultOption.trim() }
          : {}),
        ...(optionNotes ? { optionNotes } : {}),
        ...(evidenceModel ? { evidenceModel } : {}),
        ...(polarity ? { polarity } : {}),
      }
    }),
    taxonomy: shape.taxonomy.map((t) => t.trim()).filter(Boolean),
    maxPerTurn: shape.maxPerTurn,
    enumValues: shape.enumValues.map((e) => e.trim()).filter(Boolean),
  }
}

export function describeTemplateShape(shape: InterviewFlowTemplateShape): string {
  switch (shape.outputKind) {
    case 'dimensions':
      return shape.dimensions.length
        ? `Rubric · ${shape.dimensions.length} axis${shape.dimensions.length === 1 ? '' : 'es'}`
        : 'Rubric'
    case 'taxonomy':
      return `Labels · ${shape.taxonomy.length || 0}`
    case 'enum':
      return shape.enumValues.length
        ? `Choice · ${shape.enumValues.join(', ')}`
        : 'Choice'
    case 'passFail':
      return 'Pass / fail'
    case 'paragraph':
      return 'Summary'
    case 'scalar':
      return 'Score'
    default:
      return OUTPUT_KIND_LABELS[shape.outputKind]
  }
}

export function parseOptionsInput(raw: string): string[] {
  return raw
    .split(/[,|\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function formatOptionsInput(options: string[]): string {
  return options.join(', ')
}
