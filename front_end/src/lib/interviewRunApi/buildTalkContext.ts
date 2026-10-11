import type { Creator2BriefDocument, Creator2Phase, Creator2Topic } from '../interviewBrief/creator2BriefTypes'
import { resolveAttachTemplateIds, resolveTemplateCardMeta } from '../interviewBrief/analysisLabels'
import {
  catalogSchedulesAfterTurn,
  isCreatorAnalysisLibraryTemplateId,
} from '../interviewBrief/analysisTemplateCatalog'
import { DEFAULT_ATTACH_PACKS } from '../interviewBrief/defaultAttachPacks'
import { pickRandomStartPrompt } from '../interviewBrief/gateStartPrompts'
import type { TalkContext, TalkProbe, TalkRubricCard, TalkTarget } from './talkTypes'
import { withClarityHostLeftover } from './signalHost'
import { canonicalizeToolType } from '../../../../back_end/supabase/functions/interview-brief-edit/sectionTypes.ts'

function numFromDefaults(
  defaults: Record<string, unknown> | undefined,
  key: string,
  fallback: number,
): number {
  const v = defaults?.[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function nullableNumFromDefaults(
  defaults: Record<string, unknown> | undefined,
  key: string,
): number | null {
  const v = defaults?.[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function sortProbes(topic: Creator2Topic): TalkProbe[] {
  const rows = [...(topic.probes ?? [])]
  rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return rows.map((p, i) => ({
    id: p.id,
    goal: (p.goal ?? '').trim(),
    required: p.required !== false,
    order: p.order ?? i,
    hint: p.hint?.trim() ? p.hint.trim() : null,
  }))
}

function mapTargets(topic: Creator2Topic): TalkTarget[] {
  return (topic.targets ?? []).map((t) => ({
    key: t.key,
    label: t.label,
    required: Boolean(t.required),
    datatype: t.datatype?.trim() || 'text',
    description: t.description,
    enumValues: t.enumValues,
  }))
}

function resolveDepth(topic: Creator2Topic, brief: Creator2BriefDocument) {
  const defaults = brief.definition.probeDefaults
  const maxFollowUps =
    typeof topic.maxFollowUps === 'number'
      ? topic.maxFollowUps
      : numFromDefaults(defaults, 'maxFollowUps', 2)
  const targetMinutes =
    typeof topic.targetMinutes === 'number'
      ? topic.targetMinutes
      : nullableNumFromDefaults(defaults, 'targetMinutes')
  const maxProbes =
    typeof topic.maxProbes === 'number'
      ? topic.maxProbes
      : nullableNumFromDefaults(defaults, 'maxProbes')
  const minCandidateTurns =
    typeof topic.minCandidateTurns === 'number'
      ? topic.minCandidateTurns
      : numFromDefaults(defaults, 'minCandidateTurns', 1)
  return { maxFollowUps, targetMinutes, maxProbes, minCandidateTurns }
}

function resolveTalkCards(
  templateIds: readonly string[],
  brief: Creator2BriefDocument,
): TalkRubricCard[] {
  const stored = brief.analysis?.overrides?.templateCards as
    | Record<string, Record<string, unknown>>
    | undefined
  return templateIds.map((id) => {
    const meta = resolveTemplateCardMeta(id, stored?.[id] ?? null)
    return {
      id,
      title: meta.title,
      outputKind: meta.outputKind,
      justificationPolicy: meta.justificationPolicy,
      ...(meta.details?.trim() ? { details: meta.details.trim() } : {}),
      ...(meta.criterion?.trim() ? { criterion: meta.criterion.trim() } : {}),
      dimensions: meta.dimensions.map((d) => ({
        key: d.key,
        label: d.label,
        options: [...d.options],
        ...(d.optionNotes?.length ? { optionNotes: d.optionNotes } : {}),
        ...(d.evidenceModel ? { evidenceModel: d.evidenceModel } : {}),
        ...(d.polarity ? { polarity: d.polarity } : {}),
      })),
      taxonomy: [...meta.taxonomy],
      enumValues: [...meta.enumValues],
    }
  })
}

function resolveOpener(
  probes: TalkProbe[],
  _briefId: string,
): TalkContext['opener'] {
  const required = probes.find((p) => p.required && p.goal)
  const first = probes.find((p) => p.goal)
  const pick = required ?? first
  if (pick) {
    return {
      probeId: pick.id,
      text: pick.goal,
      hint: pick.hint,
      source: 'authored_probe',
    }
  }
  const sample = pickRandomStartPrompt('talk')
  return {
    probeId: sample.id,
    text: sample.startPrompt,
    hint: null,
    source: 'fallback_bank',
  }
}

/**
 * Build TalkContext from a Creator-2 brief + discussion phase id.
 * Returns null when the phase is missing or not a discussion with a topic.
 */
export function buildTalkContext(input: {
  briefId: string
  brief: Creator2BriefDocument
  phaseId: string
}): TalkContext | null {
  const phase = input.brief.phases.find((p) => p.id === input.phaseId) as Creator2Phase | undefined
  if (!phase || phase.kind !== 'discussion' || !phase.topicId) return null
  const topic = input.brief.topicLibrary.find((t) => t.id === phase.topicId)
  if (!topic) return null

  const attachPacks = {
    ...DEFAULT_ATTACH_PACKS,
    ...(input.brief.analysis.attachPacks ?? {}),
  }
  const templateIds = resolveAttachTemplateIds(topic.analysis, attachPacks)
  const probes = sortProbes(topic)
  const opener = resolveOpener(probes, input.briefId)
  const persona = input.brief.definition.persona

  return {
    briefId: input.briefId,
    phaseId: phase.id,
    topicId: topic.id,
    title: (phase.title ?? topic.label).trim() || topic.label,
    estimatedMinutes:
      typeof phase.estimatedMinutes === 'number' ? phase.estimatedMinutes : null,
    isOpening: Boolean(phase.isOpening),
    isClosing: Boolean(phase.isClosing),
    required: phase.required !== false,
    when: phase.when ?? null,
    onFail: phase.onFail ?? null,
    references: phase.references ?? null,
    persona: {
      name: persona.name,
      voice: persona.voice,
      behaviourPrompt: persona.behaviourPrompt?.trim() || '',
    },
    guardrails: [...(input.brief.definition.guardrails ?? [])],
    systemGoals: [...(input.brief.definition.systemGoals ?? [])],
    topic: {
      label: topic.label,
      purpose: topic.purpose?.trim() || '',
      behaviourPromptOverride: topic.behaviourPromptOverride?.trim()
        ? topic.behaviourPromptOverride.trim()
        : null,
      probes,
      targets: mapTargets(topic),
      depth: resolveDepth(topic, input.brief),
      analysis: {
        attachPack: topic.analysis?.attachPack ?? null,
        templateIds,
        cards: resolveTalkCards(templateIds, input.brief),
      },
    },
    opener,
  }
}

function isToolOrRollupOrSignal(id: string): boolean {
  return id.startsWith('mark.') || id.startsWith('rollup.') || id.startsWith('sig.')
}

function cardSchedulesAfterTurn(
  templateId: string,
  brief?: Creator2BriefDocument | null,
): boolean {
  const cards = brief?.analysis?.overrides?.templateCards as
    | Record<string, { afterTurnEligible?: string }>
    | undefined
  return Boolean(cards?.[templateId]?.afterTurnEligible)
}

/** Per-utterance after_turn — catalog (or card) explicit afterTurnEligible only. */
export function afterTurnTemplateIds(
  templateIds: readonly string[],
  brief?: Creator2BriefDocument | null,
): string[] {
  return templateIds.filter(
    (id) => catalogSchedulesAfterTurn(id) || cardSchedulesAfterTurn(id, brief),
  )
}

/** Topic_end leftovers + after_turn rollup ids to stub at leave. */
export function talkLeaveTemplateIds(
  templateIds: readonly string[],
  brief?: Creator2BriefDocument | null,
): { leftover: string[]; rollup: string[]; stubIds: string[] } {
  const leftover = topicEndTemplateIds(templateIds, brief)
  const leftoverSet = new Set(leftover)
  const rollup = afterTurnTemplateIds(templateIds, brief).filter((id) => !leftoverSet.has(id))
  return { leftover, rollup, stubIds: [...leftover, ...rollup] }
}

/**
 * Topic_end: remaining discussion analysis (iv.* substance, synth.*, custom.*)
 * over the full transcript. Excludes after_turn ids and tool/rollup/signal ids.
 */
export function topicEndTemplateIds(
  templateIds: readonly string[],
  brief?: Creator2BriefDocument | null,
): string[] {
  const after = new Set(afterTurnTemplateIds(templateIds, brief))
  const leftover = templateIds.filter((id) => {
    if (after.has(id)) return false
    if (isToolOrRollupOrSignal(id)) return false
    if (id.startsWith('synth.') || id.startsWith('iv.') || id.startsWith('custom.')) {
      return true
    }
    return isCreatorAnalysisLibraryTemplateId(id)
  })
  if (!leftover.includes('synth.topic.v1') && !after.has('synth.topic.v1')) {
    leftover.push('synth.topic.v1')
  }
  return withClarityHostLeftover(leftover)
}

export type TalkTemplateSchedule = {
  attached: string[]
  afterTurn: string[]
  topicEnd: string[]
  dropped: string[]
}

/** Attached talk ids → after_turn / topic_end / dropped (never silently lose custom.*). */
export function scheduleTalkTemplates(
  templateIds: readonly string[],
  brief?: Creator2BriefDocument | null,
): TalkTemplateSchedule {
  const attached = [...templateIds]
  const afterTurn = afterTurnTemplateIds(attached, brief)
  const topicEnd = topicEndTemplateIds(attached, brief)
  const scheduled = new Set([...afterTurn, ...topicEnd])
  const dropped = attached.filter((id) => !scheduled.has(id))
  return { attached, afterTurn, topicEnd, dropped }
}

export type ImpliedToolTemplateOpts = {
  /** When false/omitted, skip assist-use (None peel). Form never implies assist-use. */
  assistChat?: boolean
}

/** Implied after_tool marks for a candidate tool stage (not Creator Templates cards). */
/** Twin of Edge `_shared/interview-assessors/impliedTemplates.ts` — keep lists in sync. */
export function impliedToolTemplateIds(
  toolType: string | undefined | null,
  opts?: ImpliedToolTemplateOpts,
): string[] {
  const t = canonicalizeToolType(toolType) ?? String(toolType ?? '').trim()
  const chat = opts?.assistChat === true
  if (t === 'form_quiz') {
    return ['mark.form.key.v1', 'mark.form.reasoning.v1', 'synth.tool.v1']
  }
  if (t === 'coding') {
    const ids = [
      'mark.code.tests.v1',
      'mark.code.method.v1',
      'mark.code.structure.v1',
      'mark.code.approach.v1',
      'mark.code.authorship.v1',
      'synth.tool.v1',
    ]
    if (chat) ids.splice(ids.indexOf('synth.tool.v1'), 0, 'mark.assist.use.v1')
    return ids
  }
  if (t === 'doc') {
    const ids = [
      'mark.doc.essay.v1',
      'mark.doc.approach.v1',
      'mark.doc.authorship.v1',
      'synth.tool.v1',
    ]
    if (chat) ids.splice(ids.indexOf('synth.tool.v1'), 0, 'mark.assist.use.v1')
    return ids
  }
  return []
}

/**
 * Locked Creator chips + brief `tools[ref].analysis.templateIds`.
 * Display reads stored ids, falls back to implied, and hydrates missing implied ids.
 */
export function lockedToolTemplateIds(input: {
  toolType?: string | null
  stored?: readonly string[] | null
  assistChat?: boolean
}): string[] {
  const implied = impliedToolTemplateIds(input.toolType, { assistChat: input.assistChat })
  const stored = (input.stored ?? []).map((id) => String(id).trim()).filter(Boolean)
  if (!stored.length) return implied
  const allow = new Set(implied)
  const kept = stored.filter((id) => allow.has(id))
  const missing = implied.filter((id) => !kept.includes(id))
  return [...kept, ...missing]
}
