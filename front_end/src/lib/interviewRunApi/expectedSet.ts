/**
 * Expected set — the scoring denominator, derived from the brief.
 *
 * Authored numeric Decision folders must be answered. Absence inside an
 * expected folder is a zero, not an exclusion. Default six-key families that
 * have no live phase stay excluded (not asked). Custom folders stay in the
 * denominator even when empty so authors cannot drop a zero by leaving chips blank.
 */
import {
  folderForTemplate,
  isDefaultRollupFolder,
  type RollupMaps,
} from '../interviewBrief/rollupFolders'
import { scheduleToolFinalTemplateIds, scheduleToolProcessTemplateIds } from './markSchedule'
import { isGradeRole, resolveTemplateRole } from './templateRoles'

export type ExpectedBriefLike = {
  phases?: Array<{
    id?: string
    kind?: string
    topicId?: string
    toolRef?: string
  }>
  topicLibrary?: Array<{
    id?: string
    analysis?: { templateIds?: string[] } | null
  }>
  tools?: Record<
    string,
    {
      type?: string
      editorKind?: string
      analysis?: { templateIds?: string[] } | null
    } | undefined
  >
  analysis?: {
    rollup?: {
      weights?: Record<string, number | string>
      weightSections?: Record<string, string[]>
      weightTemplates?: Record<string, string[]>
    } | null
  }
}

export type ExpectedBucket = {
  bucket: string
  /** Phases the brief authored for this bucket, skipped ones included. */
  phaseIds: string[]
}

function rollupOf(brief: ExpectedBriefLike): RollupMaps {
  return brief.analysis?.rollup ?? {}
}

function toolTypeOf(brief: ExpectedBriefLike, toolRef: string): string {
  const tool = brief.tools?.[toolRef]
  const t = String(tool?.type ?? tool?.editorKind ?? '')
  if (t === 'form' || t === 'form_quiz') return 'form_quiz'
  return t
}

function isTalkPhase(phase: { kind?: string; topicId?: string; toolRef?: string }): boolean {
  if (phase.toolRef) return false
  return Boolean(phase.topicId) || String(phase.kind ?? '') === 'talk' || String(phase.kind ?? '') === 'discussion'
}

function isNumericWeight(value: number | string | undefined): boolean {
  if (value == null || value === 'gate_only') return false
  if (typeof value === 'number') return Number.isFinite(value)
  const n = Number.parseFloat(String(value))
  return Number.isFinite(n)
}

function phasesForDefaultFolder(brief: ExpectedBriefLike, key: string): string[] {
  const out: string[] = []
  for (const phase of brief.phases ?? []) {
    const phaseId = String(phase.id ?? '')
    if (!phaseId) continue
    if (isTalkPhase(phase)) {
      if (key === 'interviewDelivery' || key === 'interviewContent') out.push(phaseId)
      continue
    }
    const toolRef = String(phase.toolRef ?? '')
    if (!toolRef) continue
    const toolType = toolTypeOf(brief, toolRef)
    const ids = [
      ...scheduleToolFinalTemplateIds({ toolType }),
      ...scheduleToolProcessTemplateIds({ toolType }),
    ]
    for (const templateId of ids) {
      const folder =
        templateId === 'mark.assist.use.v1'
          ? toolType === 'doc' || toolType === 'writing' || toolType === 'essay'
            ? 'essay'
            : 'codingMethod'
          : resolveTemplateRole(templateId).decisionBucket
      if (folder === key) {
        out.push(phaseId)
        break
      }
    }
  }
  return out
}

function phasesHostingTemplates(brief: ExpectedBriefLike, templateIds: readonly string[]): string[] {
  const want = new Set(templateIds)
  if (!want.size) return []
  const topicToPhase = new Map<string, string>()
  const toolToPhase = new Map<string, string>()
  for (const phase of brief.phases ?? []) {
    const phaseId = String(phase.id ?? '')
    if (!phaseId) continue
    if (phase.topicId) topicToPhase.set(String(phase.topicId), phaseId)
    if (phase.toolRef) toolToPhase.set(String(phase.toolRef), phaseId)
  }
  const out: string[] = []
  const push = (id: string) => {
    if (id && !out.includes(id)) out.push(id)
  }
  for (const topic of brief.topicLibrary ?? []) {
    const ids = topic.analysis?.templateIds ?? []
    if (ids.some((id) => want.has(String(id)))) {
      const phaseId = topicToPhase.get(String(topic.id ?? ''))
      if (phaseId) push(phaseId)
    }
  }
  for (const [ref, tool] of Object.entries(brief.tools ?? {})) {
    const ids = tool?.analysis?.templateIds ?? []
    if (ids.some((id) => want.has(String(id)))) {
      const phaseId = toolToPhase.get(ref)
      if (phaseId) push(phaseId)
    }
  }
  return out
}

function catalogFolderForScheduledTool(brief: ExpectedBriefLike, toolRef: string): string[] {
  const toolType = toolTypeOf(brief, toolRef)
  const out: string[] = []
  const ids = [
    ...scheduleToolFinalTemplateIds({ toolType }),
    ...scheduleToolProcessTemplateIds({ toolType }),
  ]
  const rollup = rollupOf(brief)
  for (const templateId of ids) {
    if (templateId === 'mark.assist.use.v1') {
      const fallback =
        toolType === 'doc' || toolType === 'writing' || toolType === 'essay'
          ? 'essay'
          : 'codingMethod'
      const folder = folderForTemplate(templateId, rollup) ?? fallback
      if (folder && !out.includes(folder)) out.push(folder)
      continue
    }
    const meta = resolveTemplateRole(templateId)
    if (!isGradeRole(meta.role)) continue
    const folder = folderForTemplate(templateId, rollup) ?? meta.decisionBucket
    if (folder && folder !== 'formMark' && !out.includes(folder)) out.push(folder)
  }
  return out
}

/**
 * Which soft buckets this brief obliges the candidate to answer, and via which phases.
 *
 * Skipped and forfeited phases stay in the list on purpose: they are exactly the
 * absence that must score zero rather than vanish from the denominator.
 */
export function expectedSoftBuckets(brief: ExpectedBriefLike): Map<string, ExpectedBucket> {
  const out = new Map<string, ExpectedBucket>()
  const add = (bucket: string, phaseId: string) => {
    const row = out.get(bucket) ?? { bucket, phaseIds: [] }
    if (phaseId && !row.phaseIds.includes(phaseId)) row.phaseIds.push(phaseId)
    out.set(bucket, row)
  }

  const weights = brief.analysis?.rollup?.weights ?? {}
  const sections = brief.analysis?.rollup?.weightSections ?? {}
  const templates = brief.analysis?.rollup?.weightTemplates ?? {}
  const known = new Set((brief.phases ?? []).map((p) => String(p.id ?? '')).filter(Boolean))
  const authoredKeys = Object.keys(weights)

  if (authoredKeys.length) {
    for (const [key, value] of Object.entries(weights)) {
      if (!isNumericWeight(value)) continue
      let phaseIds = (sections[key] ?? []).map(String).filter((id) => known.has(id))
      if (!phaseIds.length && templates[key]?.length) {
        phaseIds = phasesHostingTemplates(brief, templates[key]!).filter((id) => known.has(id))
      }
      if (!phaseIds.length) {
        phaseIds = phasesForDefaultFolder(brief, key)
      }
      if (phaseIds.length) {
        for (const id of phaseIds) add(key, id)
        continue
      }
      if (!isDefaultRollupFolder(key)) {
        out.set(key, { bucket: key, phaseIds: [] })
      }
    }
    return out
  }

  for (const phase of brief.phases ?? []) {
    const phaseId = String(phase.id ?? '')
    if (!phaseId) continue
    if (isTalkPhase(phase)) {
      add('interviewDelivery', phaseId)
      add('interviewContent', phaseId)
      continue
    }
    const toolRef = String(phase.toolRef ?? '')
    if (!toolRef) continue
    for (const bucket of catalogFolderForScheduledTool(brief, toolRef)) add(bucket, phaseId)
  }

  for (const [bucket, listed] of Object.entries(sections)) {
    if (!listed?.length) continue
    const row = out.get(bucket)
    if (!row) continue
    const kept = listed.map(String).filter((id) => known.has(id))
    if (!kept.length) {
      out.delete(bucket)
      continue
    }
    row.phaseIds = kept
  }

  return out
}

/** Convenience for call sites that only need membership. */
export function isExpectedBucket(brief: ExpectedBriefLike, bucket: string): boolean {
  return expectedSoftBuckets(brief).has(bucket)
}
