/**
 * Author Decision folders — ids, labels, template membership, spine scrub.
 * Catalog `decisionBucket` is a default, not a closed allowlist.
 */
import { catalogIdsForDecisionBucket, catalogTemplate } from './analysisTemplateCatalog'
import { ensureSectionTemplateWeights, ROLLUP_WEIGHT_LABELS } from './rollupWeights'
import type { Creator2BriefDocument, Creator2Phase } from './creator2BriefTypes'

export const DEFAULT_ROLLUP_FOLDER_IDS = [
  'formMark',
  'codingTests',
  'codingMethod',
  'essay',
  'interviewDelivery',
  'interviewContent',
] as const

export type DefaultRollupFolderId = (typeof DEFAULT_ROLLUP_FOLDER_IDS)[number]

const LEFTOVER_ALIASES: Record<string, string> = {
  coding: 'codingTests',
  delivery: 'interviewDelivery',
  writing: 'essay',
  doc: 'essay',
}

export type RollupMaps = {
  weights?: Record<string, number | string>
  weightSections?: Record<string, string[]>
  weightTemplates?: Record<string, string[]>
  weightLabels?: Record<string, string>
}

export type RollupLiveBoard = {
  phaseIds: readonly string[]
  attachedTemplateIds: readonly string[]
  hasForm: boolean
  hasCoding: boolean
  hasDoc: boolean
  hasTalk: boolean
}

export function isDefaultRollupFolder(key: string): boolean {
  return (DEFAULT_ROLLUP_FOLDER_IDS as readonly string[]).includes(key)
}

/** Old briefs that still assign grade templates onto Decision folders. */
export function hasAuthoredWeightTemplates(rollup: RollupMaps | null | undefined): boolean {
  const authored = rollup?.weightTemplates
  if (!authored) return false
  return Object.values(authored).some((ids) => Array.isArray(ids) && ids.length > 0)
}

/**
 * Named Decision folders (not the six catalog keys) with no folder→template
 * chips: a grain joins every folder whose `weightSections` lists its host phase.
 */
export function usesSectionFolderMembership(rollup: RollupMaps | null | undefined): boolean {
  if (hasAuthoredWeightTemplates(rollup)) return false
  const keys = Object.keys(rollup?.weights ?? {}).filter((k) => k !== 'formMark')
  if (!keys.length) return false
  return keys.some((k) => !isDefaultRollupFolder(k))
}

export function isLeftoverRollupKey(key: string): boolean {
  return key.startsWith('topic.') || key.startsWith('ph.') || key.startsWith('tool.')
}

export function canonicalizeRollupKey(rawKey: string): string {
  return LEFTOVER_ALIASES[rawKey] ?? rawKey
}

/** Folder id from the first typed name (`Coding output` → `coding-output`). */
export function slugifyRollupKey(name: string): string {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export function uniqueRollupSlug(name: string, used: Iterable<string>): string {
  const usedSet = new Set(used)
  const base = slugifyRollupKey(name)
  if (!base) return ''
  if (!usedSet.has(base)) return base
  let n = 2
  while (usedSet.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

export function rollupFolderLabel(
  key: string,
  weightLabels?: Record<string, string> | null,
): string {
  const authored = String(weightLabels?.[key] ?? '').trim()
  if (authored) return authored
  return ROLLUP_WEIGHT_LABELS[key] ?? key
}

function collectAttachedTemplateIds(doc: {
  topicLibrary?: Array<{ analysis?: { templateIds?: string[] } | null } | null>
  tools?: Record<string, { analysis?: { templateIds?: string[] } | null } | undefined>
}): string[] {
  const ids = new Set<string>()
  for (const topic of doc.topicLibrary ?? []) {
    for (const id of topic?.analysis?.templateIds ?? []) {
      if (id) ids.add(String(id))
    }
  }
  for (const tool of Object.values(doc.tools ?? {})) {
    for (const id of tool?.analysis?.templateIds ?? []) {
      if (id) ids.add(String(id))
    }
  }
  return [...ids]
}

export function liveBoardFromCreator2(doc: Creator2BriefDocument): RollupLiveBoard {
  let hasForm = false
  let hasCoding = false
  let hasDoc = false
  let hasTalk = false
  for (const p of doc.phases ?? []) {
    if (p.kind === 'discussion') {
      hasTalk = true
      continue
    }
    const tool = p.toolRef ? doc.tools?.[p.toolRef] : undefined
    const t = String(tool?.type ?? '')
    if (t === 'form_quiz' || /form/i.test(t)) hasForm = true
    if (t === 'coding' || /cod/i.test(t)) hasCoding = true
    if (t === 'doc' || /writ|essay/i.test(t)) hasDoc = true
  }
  return {
    phaseIds: (doc.phases ?? []).map((p) => String(p.id ?? '')).filter(Boolean),
    attachedTemplateIds: collectAttachedTemplateIds(doc),
    hasForm,
    hasCoding,
    hasDoc,
    hasTalk,
  }
}

export function defaultWeightTemplatesFromCatalog(
  keys: readonly string[] = DEFAULT_ROLLUP_FOLDER_IDS,
): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const key of keys) {
    const ids = catalogIdsForDecisionBucket(key)
    if (ids.length) out[key] = ids
  }
  return out
}

export function resolveWeightTemplates(rollup: RollupMaps | null | undefined): Record<string, string[]> {
  const authored = rollup?.weightTemplates
  if (authored && Object.keys(authored).length) {
    const out: Record<string, string[]> = {}
    for (const [k, ids] of Object.entries(authored)) {
      const list = Array.isArray(ids) ? ids.map(String).filter(Boolean) : []
      if (list.length) out[k] = [...new Set(list)]
    }
    return out
  }
  return defaultWeightTemplatesFromCatalog(Object.keys(rollup?.weights ?? {}))
}

/**
 * Map a grain's template onto a folder. Author assignment wins; catalog
 * `decisionBucket` is the fallback for old briefs.
 */
export function folderForTemplate(
  templateId: string,
  rollup: RollupMaps | null | undefined,
): string | null {
  const templates = resolveWeightTemplates(rollup)
  const weightOrder = Object.keys(rollup?.weights ?? {})
  const scan = weightOrder.length ? weightOrder : Object.keys(templates)
  for (const folder of scan) {
    if ((templates[folder] ?? []).includes(templateId)) return folder
  }
  for (const [folder, ids] of Object.entries(templates)) {
    if (ids.includes(templateId)) return folder
  }
  return catalogTemplate(templateId)?.decisionBucket ?? null
}

export function foldersForTemplate(
  templateId: string,
  rollup: RollupMaps | null | undefined,
): string[] {
  const one = folderForTemplate(templateId, rollup)
  return one ? [one] : []
}

export function foldersForPhase(
  phaseId: string,
  rollup: RollupMaps | null | undefined,
): string[] {
  const sections = rollup?.weightSections ?? {}
  const out: string[] = []
  for (const [folder, ids] of Object.entries(sections)) {
    if ((ids ?? []).map(String).includes(phaseId)) out.push(folder)
  }
  return out
}

export function firstFolderRow<T>(
  byWeight: Record<string, T> | null | undefined,
  folders: readonly string[],
  fallbackKeys: readonly string[] = [],
): T | null {
  const rows = byWeight ?? {}
  for (const key of folders) {
    const row = rows[key]
    if (row) return row
  }
  for (const key of fallbackKeys) {
    const row = rows[key]
    if (row) return row
  }
  return null
}

/**
 * Keep Decision folders across spine/merge scrub.
 * Default six-keys follow family presence. Custom slugs stay unless every
 * named phase and named template is gone (empty assignment stays).
 */
export function keepRollupFolder(
  rawKey: string,
  rollup: RollupMaps | null | undefined,
  live: RollupLiveBoard,
): boolean {
  const key = canonicalizeRollupKey(rawKey)
  if (isLeftoverRollupKey(key)) return false

  if (isDefaultRollupFolder(key)) {
    if (key === 'formMark') return live.hasForm
    if (key === 'codingTests' || key === 'codingMethod') return live.hasCoding
    if (key === 'essay') return live.hasDoc
    if (key === 'interviewContent' || key === 'interviewDelivery') return live.hasTalk
    return false
  }

  const livePhases = new Set(live.phaseIds)
  const liveTemplates = new Set(live.attachedTemplateIds)
  const namedSections = (rollup?.weightSections?.[key] ?? rollup?.weightSections?.[rawKey] ?? []).map(
    String,
  )
  const namedTemplates = (
    rollup?.weightTemplates?.[key] ??
    rollup?.weightTemplates?.[rawKey] ??
    []
  ).map(String)
  if (!namedSections.length && !namedTemplates.length) return true
  const liveSec = namedSections.filter((id) => livePhases.has(id))
  const liveTpl = namedTemplates.filter((id) => liveTemplates.has(id))
  return liveSec.length > 0 || liveTpl.length > 0
}

export function mappedTemplateIdsForFolder(
  doc: Creator2BriefDocument,
  key: string,
): string[] {
  const authored = doc.analysis.rollup?.weightTemplates?.[key]
  if (Array.isArray(authored) && authored.length) {
    return [...new Set(authored.map(String).filter(Boolean))]
  }
  const catalog = catalogIdsForDecisionBucket(key)
  const live = new Set(collectAttachedTemplateIds(doc))
  const onBoard = catalog.filter((id) => live.has(id))
  return onBoard.length ? onBoard : catalog
}

export type NamedDecisionFolders = {
  weights: Record<string, number>
  weightSections: Record<string, string[]>
  weightLabels: Record<string, string>
}

/**
 * Author/bot Decision folders from live spine families — not the six catalog keys.
 * Form is a hard gate, not a default soft folder.
 */
export function namedFoldersFromLiveSpine(doc: {
  phases?: Array<{ id?: string; kind?: string; toolRef?: string } | null>
  tools?: Record<string, { type?: string } | undefined>
}): NamedDecisionFolders {
  const coding: string[] = []
  const writing: string[] = []
  const conversation: string[] = []
  for (const p of doc.phases ?? []) {
    const id = String(p?.id ?? '').trim()
    if (!id) continue
    if (p?.kind === 'discussion') {
      conversation.push(id)
      continue
    }
    const t = String(doc.tools?.[String(p?.toolRef ?? '')]?.type ?? '')
    if (t === 'coding' || /cod/i.test(t)) coding.push(id)
    else if (t === 'doc' || /writ|essay/i.test(t)) writing.push(id)
  }
  const folders: Array<{ key: string; label: string; ids: string[] }> = []
  if (coding.length) folders.push({ key: 'coding-work', label: 'Coding', ids: coding })
  if (writing.length) folders.push({ key: 'write', label: 'Writing', ids: writing })
  if (conversation.length) {
    folders.push({ key: 'conversation', label: 'Conversation', ids: conversation })
  }
  const n = folders.length
  const weights: Record<string, number> = {}
  const weightSections: Record<string, string[]> = {}
  const weightLabels: Record<string, string> = {}
  let allocated = 0
  folders.forEach((f, i) => {
    const raw = n === 1 ? 1 : Math.round((1 / n) * 10000) / 10000
    const w = i === n - 1 ? Math.round((1 - allocated) * 10000) / 10000 : raw
    allocated += w
    weights[f.key] = w
    weightSections[f.key] = f.ids
    weightLabels[f.key] = f.label
  })
  return { weights, weightSections, weightLabels }
}

/** Write or clear authored template weights for one spine phase. `0` is stored. */
export function setPhaseTemplateWeights(
  doc: Creator2BriefDocument,
  phaseId: string,
  next: Record<string, number | string> | null | undefined,
): Creator2BriefDocument {
  const id = String(phaseId ?? '').trim()
  if (!id) return doc
  const prev = { ...(doc.analysis.rollup?.templateWeights ?? {}) }
  const cleaned: Record<string, number> = {}
  for (const [tid, raw] of Object.entries(next ?? {})) {
    const key = String(tid).trim()
    if (!key) continue
    const n = typeof raw === 'number' ? raw : Number.parseFloat(String(raw))
    if (!Number.isFinite(n) || n < 0) continue
    cleaned[key] = n
  }
  if (Object.keys(cleaned).length) prev[id] = cleaned
  else delete prev[id]
  return {
    ...doc,
    analysis: {
      ...doc.analysis,
      rollup: {
        ...doc.analysis.rollup,
        templateWeights: Object.keys(prev).length ? prev : undefined,
      },
    },
  }
}

export function readPhaseTemplateWeights(
  doc: Creator2BriefDocument,
  phaseId: string,
): Record<string, number> | undefined {
  const raw = doc.analysis?.rollup?.templateWeights?.[String(phaseId ?? '').trim()]
  if (!raw || typeof raw !== 'object') return undefined
  const out: Record<string, number> = {}
  for (const [tid, val] of Object.entries(raw)) {
    const key = String(tid).trim()
    if (!key) continue
    const n = typeof val === 'number' ? val : Number.parseFloat(String(val))
    if (!Number.isFinite(n) || n < 0) continue
    out[key] = n
  }
  return Object.keys(out).length ? out : undefined
}

export function setLivePhaseTemplateWeights(
  doc: Creator2BriefDocument,
  phaseId: string,
  liveIds: readonly string[],
  next?: Record<string, number> | null,
): Creator2BriefDocument {
  const live = liveIds.map(String).filter(Boolean)
  const allow = new Set(live)
  const clipped: Record<string, number> = {}
  for (const [tid, raw] of Object.entries(next ?? {})) {
    if (!allow.has(tid)) continue
    const n = typeof raw === 'number' ? raw : Number.parseFloat(String(raw))
    if (!Number.isFinite(n) || n < 0) continue
    clipped[tid] = n
  }
  if (!live.length) return setPhaseTemplateWeights(doc, phaseId, {})
  return setPhaseTemplateWeights(doc, phaseId, ensureSectionTemplateWeights(live, clipped))
}

function storedAnalysisTemplateIdsForPhase(
  doc: Creator2BriefDocument,
  phase: Creator2Phase,
): string[] {
  if (phase.kind === 'discussion') {
    const topic = (doc.topicLibrary ?? []).find((t) => t.id === phase.topicId)
    return (topic?.analysis?.templateIds ?? []).map(String).filter(Boolean)
  }
  const tool = doc.tools?.[String(phase.toolRef ?? '')]
  return (tool?.analysis?.templateIds ?? []).map(String).filter(Boolean)
}

/** Persist balanced per-section templateWeights for every live host. */
export function seedAllSectionTemplateWeights(doc: Creator2BriefDocument): Creator2BriefDocument {
  let next = doc
  for (const phase of doc.phases ?? []) {
    const id = String(phase.id ?? '').trim()
    if (!id) continue
    const liveIds = storedAnalysisTemplateIdsForPhase(next, phase)
    next = setLivePhaseTemplateWeights(next, id, liveIds, readPhaseTemplateWeights(next, id))
  }
  return next
}
