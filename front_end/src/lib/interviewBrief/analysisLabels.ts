/** Human labels for packs + template ids — Creator 2 timeline (not registry bodies). */

import { catalogTemplate } from './analysisTemplateCatalog'
import {
  defaultShapeForTemplate,
  resolveTemplateShape,
  serializeTemplateShape,
  type InterviewFlowTemplateShape,
} from './analysisTemplateShape'
import { criterionLineForTemplate } from '../../../../back_end/supabase/functions/interview-brief-edit/templateRoster.ts'

export type {
  InterviewFlowTemplateDimension,
  InterviewFlowTemplateJustification,
  InterviewFlowTemplateOutputKind,
  InterviewFlowTemplateShape,
  InterviewFlowEvidenceModel,
  InterviewFlowPolarity,
} from './analysisTemplateShape'

export {
  OUTPUT_KIND_LABELS,
  JUSTIFICATION_LABELS,
  EVIDENCE_MODEL_LABELS,
  POLARITY_LABELS,
  TEMPLATE_CREATE_STARTERS,
  describeTemplateShape,
  formatOptionsInput,
  parseOptionsInput,
  sanitizeAxisPolarity,
  shapeFromStarter,
  slugKey,
  starterById,
} from './analysisTemplateShape'

export type {
  TemplateCreateStarter,
  TemplateCreateStarterId,
} from './analysisTemplateShape'

export const ANALYSIS_PACK_LABELS: Record<string, string> = {
  'pack.shallow': 'No turn scoring',
  'pack.talk': 'Clarity + substance + topic summary',
  'pack.star': 'Clarity + STAR story + topic summary',
  'pack.conflict': 'Clarity + ownership + topic summary',
  'pack.design': 'Clarity + tradeoffs + topic summary',
  'pack.coding': 'Hidden tests + approach + structure notes',
  'pack.form_gate': 'Form answer key (gate)',
}

/** Fallback labels when catalog entry is missing. Prefer catalogTemplate().label. */
export const TEMPLATE_LABELS: Record<string, string> = {
  'iv.delivery.v1': 'How they speak (clarity, composure)',
  'iv.content.v1': 'Substance vs the topic',
  'iv.star.v1': 'STAR completeness',
  'iv.ownership.v1': 'Ownership vs blame-shift',
  'iv.tradeoff.v1': 'Design / tradeoff reasoning',
  'iv.question.v1': 'Quality of their questions',
  'synth.topic.v1': 'Short topic summary for the reviewer',
  'synth.tool.v1': 'Short tool summary for the reviewer',
  'mark.form.key.v1': 'Mark against the answer key',
  'mark.form.reasoning.v1': 'Free-text form notes',
  'mark.code.tests.v1': 'Run hidden tests',
  'mark.code.method.v1': 'Approach, clarity, complexity',
  'mark.code.structure.v1': 'Organization, naming, modularity',
  'mark.code.approach.v1': 'How they worked (exploration, iteration)',
  'mark.doc.essay.v1': 'Written essay rubric',
  'mark.doc.approach.v1': 'How they wrote (exploration, iteration)',
  'mark.doc.authorship.v1': 'Human agency vs dump/paste',
  'mark.code.authorship.v1': 'Human agency vs dump/paste (coding)',
  'mark.assist.use.v1': 'How they used Assist / Copilot',
  'mark.doc.brief.v1': 'Short written mark',
  'rollup.attempt.v1': 'Decision package for the attempt',
  'sig.security.v1': 'Security overview',
  'sig.clarity.v1': 'Clarity overview',
}

export const TEMPLATE_GRAIN_HINT: Record<string, string> = {
  'iv.': 'each answer',
  'synth.': 'end of section',
  'mark.': 'after the tool',
  'rollup.': 'end of interview',
  'sig.': 'session signals',
}

/** Longer card body copy — prefer catalogTemplate().summary. */
export const TEMPLATE_DETAILS: Record<string, string> = {
  'iv.delivery.v1': 'Scores clarity, composure, and structure while the candidate talks.',
  'iv.content.v1': 'Judges substance against the topic purpose and probe goals.',
  'iv.star.v1': 'Checks Situation, Task, Action, and Result completeness on behavioural answers.',
  'iv.ownership.v1': 'Looks for agency versus blame-shift. Best on conflict topics.',
  'iv.tradeoff.v1': 'Weighs options, constraints, and the choice they defend.',
  'iv.question.v1': 'Rates the questions the candidate asks at the close, including clarifying and curiosity asks.',
  'synth.topic.v1': 'Writes a short reviewer paragraph when the topic ends.',
  'synth.tool.v1': 'Writes a short reviewer paragraph after a tool stage.',
  'mark.form.key.v1': 'Marks the form against the answer key.',
  'mark.form.reasoning.v1': 'Notes on free-text or unkeyed form items. Does not count in the Decision mix.',
  'mark.code.tests.v1': 'Runs hidden tests against the submission.',
  'mark.code.method.v1': 'Scores approach, clarity, and complexity of the solution.',
  'mark.code.structure.v1': 'Scores organization, naming, and modularity.',
  'mark.code.approach.v1': 'How they worked in the editor (exploration and iteration), not hidden tests.',
  'mark.doc.essay.v1': 'Essay rubric for the written assessment.',
  'mark.doc.approach.v1': 'How they wrote (exploration and iteration), not hidden tests.',
  'mark.doc.authorship.v1': 'Whether the writing looks like their own work versus a dump or paste.',
  'mark.code.authorship.v1': 'Whether the code looks like their own work versus a dump or paste.',
  'mark.assist.use.v1': 'How they used Assist or Copilot. Counts once in the Decision mix.',
  'mark.doc.brief.v1': 'A lighter written mark for short responses.',
  'rollup.attempt.v1': 'End-of-interview overview: one finding per section with a score chip and jump link.',
  'sig.security.v1': 'Session integrity (paste, leave, reconnect). Not a Decision source. Not VPN.',
  'sig.clarity.v1': 'Work-state overview from Talk and tools. Not how they speak, not a diagnosis, not a Decision source.',
}

export type InterviewFlowTemplateCardMeta = {
  title: string
  subtitle: string
  details: string
  /** Scalar: what the number measures. Unused on other representations. */
  criterion?: string
} & InterviewFlowTemplateShape

export function defaultTemplateCardMeta(templateId: string): InterviewFlowTemplateCardMeta {
  const grain = grainHintForTemplate(templateId)
  const entry = catalogTemplate(templateId)
  return {
    title: labelTemplate(templateId),
    subtitle: `Runs on ${grain}`,
    details: entry?.summary ?? TEMPLATE_DETAILS[templateId] ?? `Template ${templateId}`,
    ...defaultShapeForTemplate(templateId),
  }
}

/** True when the stored card title is the catalog id (addFromCatalog used to persist `title: id`). */
export function storedTemplateTitleIsRawId(
  templateId: string,
  title: string | null | undefined,
): boolean {
  const t = String(title ?? '').trim()
  return !t || t === templateId
}

export function resolveTemplateCardMeta(
  templateId: string,
  overrides?: Partial<InterviewFlowTemplateCardMeta> | null,
): InterviewFlowTemplateCardMeta {
  const base = defaultTemplateCardMeta(templateId)
  if (!overrides) return base
  const shape = resolveTemplateShape(templateId, overrides)
  const storedTitle = overrides.title?.trim() ?? ''
  const criterion = overrides.criterion?.trim() || base.criterion?.trim() || ''
  return {
    title: storedTemplateTitleIsRawId(templateId, storedTitle) ? base.title : storedTitle,
    subtitle: overrides.subtitle?.trim() || base.subtitle,
    details: overrides.details?.trim() || base.details,
    ...shape,
    ...(criterion ? { criterion } : {}),
  }
}

/** Normalize a card for brief persistence (copy + full shape). */
export function serializeTemplateCardMeta(
  templateId: string,
  meta: InterviewFlowTemplateCardMeta,
): InterviewFlowTemplateCardMeta {
  const resolved = resolveTemplateCardMeta(templateId, meta)
  const criterion = resolved.criterion?.trim() || ''
  return {
    title: resolved.title.trim() || defaultTemplateCardMeta(templateId).title,
    subtitle: resolved.subtitle.trim() || defaultTemplateCardMeta(templateId).subtitle,
    details: resolved.details.trim() || defaultTemplateCardMeta(templateId).details,
    ...(criterion ? { criterion } : {}),
    ...serializeTemplateShape(resolved, templateId),
  }
}

export function labelPack(packId: string | null | undefined): string | null {
  if (!packId) return null
  return ANALYSIS_PACK_LABELS[packId] ?? packId
}

export function labelTemplate(
  templateId: string,
  meta?: Partial<InterviewFlowTemplateCardMeta> | null,
): string {
  const override = meta?.title?.trim()
  if (override && !storedTemplateTitleIsRawId(templateId, override)) return override
  return catalogTemplate(templateId)?.label ?? TEMPLATE_LABELS[templateId] ?? templateId
}

export function grainHintForTemplate(templateId: string): string {
  for (const [prefix, hint] of Object.entries(TEMPLATE_GRAIN_HINT)) {
    if (templateId.startsWith(prefix)) return hint
  }
  return 'as scheduled'
}

/** Short hover summary for Creator attach chips / menus. */
export function summarizeTemplate(
  templateId: string,
  meta?: Partial<InterviewFlowTemplateCardMeta> | null,
): string {
  const details =
    meta?.details?.trim() ||
    catalogTemplate(templateId)?.summary ||
    TEMPLATE_DETAILS[templateId]
  const grain = grainHintForTemplate(templateId)
  const roleLine = criterionLineForTemplate(templateId)
  if (details) return `${details} ${roleLine} Runs on ${grain}.`
  return `Template ${templateId}. ${roleLine} Runs on ${grain}.`
}

export function resolveAttachTemplateIds(
  attach: { attachPack?: string | null; templateIds?: string[] } | undefined,
  attachPacks: Record<string, string[]> | undefined,
): string[] {
  const explicit = attach?.templateIds?.filter(Boolean) ?? []
  if (explicit.length > 0) return explicit
  const pack = attach?.attachPack
  if (!pack || !attachPacks) return []
  return attachPacks[pack] ?? []
}
