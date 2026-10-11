import catalogJson from './analysisTemplateCatalog.json'

export type AnalysisHostKind = 'discussion' | 'tool'

export type AnalysisSectionTypeId = keyof typeof catalogJson.sectionTypes

export type AnalysisTemplateCatalogEntry = {
  label: string
  summary: string
  sectionTypes: string[]
  conflictsWith: string[]
  /** Return / representation kind — drives Creator editors. */
  outputKind?:
    | 'dimensions'
    | 'taxonomy'
    | 'scalar'
    | 'enum'
    | 'passFail'
    | 'paragraph'
  /**
   * Fair interpretation role (Decision soft) — see interviewRunApi/templateRoles.
   * grade.* → soft buckets; collect.* / narrative.* → artifacts only.
   */
  interpretationRole?:
    | 'grade.dimensions'
    | 'grade.passFail'
    | 'grade.scalar'
    | 'grade.enum'
    | 'collect.taxonomy'
    | 'collect.enum'
    | 'collect.scalar'
    | 'narrative.paragraph'
    | 'narrative.rollup'
  /**
   * Intra-bucket vote (default 1). Process / assist-use marks use 0.5.
   * See planned/assessment-marking.md.
   */
  sourceWeight?: number
  /** Soft Decision bucket when interpretationRole is grade.* (formMark = gate only). */
  decisionBucket?: string
  /**
   * Which candidate turns may run this template on after_turn.
   * - `answer` (default): substantive answers only — skipped on clarify so delivery
   *   rubrics do not punish clarifying questions.
   * - `clarify`: clarification / curiosity / “give me an example” turns (e.g. question quality).
   * - `any`: both answer and clarify turns.
   */
  afterTurnEligible?: 'answer' | 'clarify' | 'any'
  justificationPolicy?: 'always_required' | 'optional' | 'none'
  dimensions?: Array<{
    key: string
    label: string
    options: string[]
    defaultOption?: string
    optionNotes?: string[]
    evidenceModel?: 'accumulative' | 'manner' | 'coverage'
    polarity?: 'positive' | 'negative'
  }>
  taxonomy?: string[]
  maxPerTurn?: number
  enumValues?: string[]
}

export type AnalysisSectionTypeEntry = {
  label: string
  host: AnalysisHostKind
}

export const ANALYSIS_TEMPLATE_CATALOG = catalogJson as {
  sectionTypes: Record<string, AnalysisSectionTypeEntry>
  templates: Record<string, AnalysisTemplateCatalogEntry>
}

export function catalogTemplate(templateId: string): AnalysisTemplateCatalogEntry | null {
  return ANALYSIS_TEMPLATE_CATALOG.templates[templateId] ?? null
}

export function catalogSourceWeight(templateId: string): number {
  const n = catalogTemplate(templateId)?.sourceWeight
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 1
}

/** Catalog template ids that feed a Decision soft bucket (legend). */
export function catalogIdsForDecisionBucket(bucket: string): string[] {
  return Object.entries(ANALYSIS_TEMPLATE_CATALOG.templates)
    .filter(([, entry]) => entry.decisionBucket === bucket)
    .map(([id]) => id)
}

export function catalogSectionType(sectionType: string): AnalysisSectionTypeEntry | null {
  return ANALYSIS_TEMPLATE_CATALOG.sectionTypes[sectionType] ?? null
}

export type AfterTurnEligible = 'answer' | 'clarify' | 'any'

/** Catalog afterTurnEligible — defaults to answer (do not score clarify with delivery rubrics). */
export function templateAfterTurnEligible(templateId: string): AfterTurnEligible {
  const entry = catalogTemplate(templateId)
  return entry?.afterTurnEligible ?? 'answer'
}

/**
 * True when the catalog **explicitly** schedules this id on after_turn
 * (`afterTurnEligible` present). Defaults must not pull content/STAR/custom
 * onto per-utterance scoring.
 */
export function catalogSchedulesAfterTurn(templateId: string): boolean {
  const entry = catalogTemplate(templateId)
  return Boolean(entry?.afterTurnEligible)
}

/** True when this template may run after_turn for the given turn kind. */
export function templateAllowsAfterTurn(
  templateId: string,
  turn: 'answer' | 'clarify',
): boolean {
  const el = templateAfterTurnEligible(templateId)
  if (el === 'any') return true
  return el === turn
}

/** True when every sectionType host is discussion (or entry has no sectionTypes). */
export function templateHostsDiscussion(templateId: string): boolean {
  const entry = catalogTemplate(templateId)
  if (!entry?.sectionTypes.length) return false
  return entry.sectionTypes.every((st) => catalogSectionType(st)?.host === 'discussion')
}

/**
 * Creator **Templates** library eligibility — discussion **analysis** only.
 * Assessment (marking schemes, code runners/checks) lives in editor variants, not here.
 * `custom.*` starters are analysis shapes authored in this section.
 */
export function isCreatorAnalysisLibraryTemplateId(templateId: string): boolean {
  const id = templateId.trim()
  if (!id) return false
  if (id.startsWith('custom.')) return true
  return templateHostsDiscussion(id)
}

/** Discussion template ids from the catalog (host = discussion). */
export function discussionTemplateIdsFromCatalog(): string[] {
  return Object.entries(ANALYSIS_TEMPLATE_CATALOG.templates)
    .filter(([id]) => templateHostsDiscussion(id))
    .map(([id]) => id)
}

/** Rollup / Decision package template ids from the catalog. */
export function rollupTemplateIdsFromCatalog(): string[] {
  return Object.keys(ANALYSIS_TEMPLATE_CATALOG.templates).filter((id) =>
    id.startsWith('rollup.'),
  )
}

/** Templates that conflict with any already attached id (catalog is source of truth). */
export function conflictingTemplateIds(attached: readonly string[]): Set<string> {
  const blocked = new Set<string>()
  const catalog = ANALYSIS_TEMPLATE_CATALOG.templates
  for (const id of attached) {
    const entry = catalog[id]
    if (!entry) continue
    for (const other of entry.conflictsWith) blocked.add(other)
  }
  // Symmetric: if A lists B, B also blocks A even if JSON only declares one side.
  for (const [id, entry] of Object.entries(catalog)) {
    if (attached.includes(id)) continue
    if (entry.conflictsWith.some((c) => attached.includes(c))) blocked.add(id)
  }
  return blocked
}

export function templatesConflict(a: string, b: string): boolean {
  if (a === b) return false
  const left = catalogTemplate(a)?.conflictsWith ?? []
  const right = catalogTemplate(b)?.conflictsWith ?? []
  return left.includes(b) || right.includes(a)
}

/**
 * Resolve discussion section-type affinity for Creator talk chrome.
 * Middle talks accept deep + conflict + design until an explicit flavour field exists.
 */
export function resolveTalkSectionTypes(flags: {
  isOpening?: boolean
  isClosing?: boolean
}): string[] {
  if (flags.isOpening) return ['discussion.opening']
  if (flags.isClosing) return ['discussion.closing']
  return ['discussion.deep', 'discussion.conflict', 'discussion.design']
}

export type AttachableTemplateOpts = {
  /** Host filter via sectionTypes → sectionType.host */
  host: AnalysisHostKind
  /** Current attached ids on this section */
  attached: readonly string[]
  /** Allowed section-type ids (template must match at least one when non-empty) */
  sectionTypes: readonly string[]
  /**
   * Templates shelf libraryIds — edit workflow: include custom.* (and other shelf ids)
   * so bot-created cards appear in the Talk attach picker.
   */
  libraryIds?: readonly string[]
}

/** Add-menu candidates: host + section affinity, not attached, not conflicting. */
export function attachableTemplateIds(opts: AttachableTemplateOpts): string[] {
  const blocked = conflictingTemplateIds(opts.attached)
  const sectionSet = new Set(opts.sectionTypes)
  const catalog = Object.entries(ANALYSIS_TEMPLATE_CATALOG.templates)
    .filter(([id, entry]) => {
      if (opts.attached.includes(id)) return false
      if (blocked.has(id)) return false
      if (!entry.sectionTypes.length) return false
      const hosts = entry.sectionTypes
        .map((st) => catalogSectionType(st)?.host)
        .filter(Boolean)
      if (!hosts.includes(opts.host)) return false
      if (sectionSet.size && !entry.sectionTypes.some((st) => sectionSet.has(st))) {
        return false
      }
      return true
    })
    .map(([id]) => id)

  const shelf = opts.libraryIds ?? []
  const shelfExtras: string[] = []
  for (const id of shelf) {
    if (!id || opts.attached.includes(id)) continue
    if (blocked.has(id)) continue
    if (catalog.includes(id)) continue
    // Custom shelf cards are attachable on discussion (and other hosts that already filter by libraryIds in UI).
    if (id.startsWith('custom.')) {
      shelfExtras.push(id)
      continue
    }
  }

  const merged = [...catalog, ...shelfExtras]
  if (shelf.length === 0) return merged
  // When shelf is non-empty, only ids already on the library (human + bot: Templates first).
  return merged.filter((id) => shelf.includes(id))
}

/** Legacy / bot-authored overlap — still surface if attached list already conflicts. */
export function attachOverlapWarnings(templateIds: readonly string[]): string[] {
  const warnings: string[] = []
  const seen = new Set<string>()
  for (let i = 0; i < templateIds.length; i++) {
    for (let j = i + 1; j < templateIds.length; j++) {
      const a = templateIds[i]!
      const b = templateIds[j]!
      if (!templatesConflict(a, b)) continue
      const key = [a, b].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      const left = catalogTemplate(a)?.label ?? a
      const right = catalogTemplate(b)?.label ?? b
      warnings.push(`Cannot combine “${left}” with “${right}” — remove one.`)
    }
  }
  return warnings
}
