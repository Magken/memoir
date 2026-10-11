import type { Creator2BriefDocument } from './creator2BriefTypes'
import type { InterviewFlowWrapEditorState } from './flowTimelineTypes'
import { inferWeightSections, scrubWeightSections } from './rollupWeights'

function normalizeWeightValue(value: number | string): number | string {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  const trimmed = value.trim()
  if (!trimmed) return 0
  if (trimmed === 'gate_only') return 'gate_only'
  const n = Number.parseFloat(trimmed)
  return Number.isFinite(n) ? n : trimmed
}

function isScheduleEntry(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v)
}

/**
 * Edge merge writes `{ interview_end: { when, templateIds } }`.
 * Older briefs / wrap save used an array of `{ when, templateIds }`.
 */
export function analysisScheduleEntries(schedule: unknown): Record<string, unknown>[] {
  if (Array.isArray(schedule)) return schedule.filter(isScheduleEntry)
  if (schedule && typeof schedule === 'object') {
    return Object.values(schedule as Record<string, unknown>).filter(isScheduleEntry)
  }
  return []
}

function patchInterviewEndSchedule(
  schedule: unknown,
  templateId: string,
): Record<string, unknown>[] | Record<string, Record<string, unknown>> {
  const stamp = { when: 'interview_end', templateIds: [templateId] }
  if (schedule && typeof schedule === 'object' && !Array.isArray(schedule)) {
    return {
      ...(schedule as Record<string, Record<string, unknown>>),
      interview_end: stamp,
    }
  }
  const list = analysisScheduleEntries(schedule)
  let found = false
  const next = list.map((entry) => {
    if (entry.when !== 'interview_end') return entry
    found = true
    return { ...entry, templateIds: [templateId] }
  })
  if (!found) next.push(stamp)
  return next
}

/** Patch analysis.rollup (+ interview_end schedule ids) from the Decision package editor. */
export function patchCreator2Rollup(
  doc: Creator2BriefDocument,
  next: InterviewFlowWrapEditorState,
): Creator2BriefDocument {
  const templateId = next.templateId.trim() || 'rollup.attempt.v1'
  const weights: Record<string, number | string> = {}
  const weightSections: Record<string, string[]> = {}
  const weightLabels: Record<string, string> = {}
  const unweightedPhaseIds = new Set<string>()
  const countedPhaseIds = new Set<string>()
  for (const row of next.weights) {
    const key = row.key.trim()
    if (!key) continue
    const value = normalizeWeightValue(row.value)
    weights[key] = value
    const ids = Array.isArray(row.sectionIds)
      ? row.sectionIds.map(String).filter(Boolean)
      : []
    if (ids.length) weightSections[key] = [...new Set(ids)]
    const label = String(row.label ?? '').trim()
    if (label) weightLabels[key] = label
    const parked = value === 0
    for (const id of ids) {
      if (parked) unweightedPhaseIds.add(id)
      else countedPhaseIds.add(id)
    }
  }

  const livePhaseIds = new Set((doc.phases ?? []).map((p) => String(p.id ?? '')).filter(Boolean))
  const scrubbed = scrubWeightSections(weightSections, livePhaseIds, Object.keys(weights))

  const schedule = patchInterviewEndSchedule(doc.analysis.schedule, templateId)

  const prevRollup = { ...(doc.analysis.rollup ?? {}) }
  delete prevRollup.weightTemplates
  const sectionWeights: Record<string, number | string> = {
    ...((prevRollup.sectionWeights as Record<string, number | string> | undefined) ?? {}),
  }
  for (const id of unweightedPhaseIds) {
    if (countedPhaseIds.has(id)) continue
    sectionWeights[id] = 0
  }
  for (const id of countedPhaseIds) {
    if (sectionWeights[id] === 0) delete sectionWeights[id]
  }
  if (Object.keys(sectionWeights).length) prevRollup.sectionWeights = sectionWeights
  else delete prevRollup.sectionWeights

  return {
    ...doc,
    analysis: {
      ...doc.analysis,
      schedule,
      rollup: {
        ...prevRollup,
        templateId,
        weights,
        weightSections: scrubbed,
        weightLabels,
      },
    },
  }
}

/** Infer missing weightSections from spine when mapping a legacy brief. */
export function resolveRollupWeightSections(
  doc: Creator2BriefDocument,
): Record<string, string[]> {
  const existing = doc.analysis.rollup?.weightSections
  const livePhaseIds = new Set((doc.phases ?? []).map((p) => String(p.id ?? '')).filter(Boolean))
  const weightKeys = Object.keys(doc.analysis.rollup?.weights ?? {})
  if (existing && Object.keys(existing).length) {
    return scrubWeightSections(existing, livePhaseIds, weightKeys)
  }
  const tools: Record<string, { type?: string }> = {}
  for (const [ref, tool] of Object.entries(doc.tools ?? {})) {
    tools[ref] = { type: tool?.type }
  }
  const inferred = inferWeightSections({
    phases: (doc.phases ?? []).map((p) => ({
      id: p.id,
      kind: p.kind,
      title: p.title,
      toolRef: p.toolRef,
    })),
    tools,
  })
  return scrubWeightSections(inferred, livePhaseIds, weightKeys.length ? weightKeys : undefined)
}
