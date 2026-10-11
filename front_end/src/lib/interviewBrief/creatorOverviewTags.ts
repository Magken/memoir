/**
 * Creator Overview facts — presence tags, Vurex peel chips, and board-turn PDF extract.
 * Human-readable only: no `rolePdf` / `meta` / Path A jargon in labels.
 */
import { formatInterviewManagerDateShort } from './managerFixtures'
import { interviewRoleCategoryLabel } from './roleCategories'

/** Creator-2 timeline Contents id — always-on day housing, not an edit-stage (never share result `__result_overview__`). */
export const CREATOR_OVERVIEW_SECTION_ID = '__creator_overview__'

const PDF_EXTRACT_CAP = 12_000
const PDF_EXTRACT_LABEL = 'Role description PDF extract:'
const FILENAME_MAX = 28

export type CreatorOverviewFacts = {
  category?: string | null
  proposedMinutes?: number | null
  opensAt?: string | null
  closesAt?: string | null
  coverName?: string | null
  rolePdfName?: string | null
  roleDescription?: string | null
  candidateDescription?: string | null
  maxInterviews?: number | null
}

export type CreatorOverviewTag = {
  label: string
}

function trimmed(value: string | null | undefined): string {
  return String(value ?? '').trim()
}

function parsePositiveInt(value: number | string | null | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value)
  if (typeof value === 'string' && value.trim()) {
    const n = Number.parseInt(value, 10)
    if (Number.isFinite(n) && n > 0) return n
  }
  return undefined
}

/** Truncate a filename for tags — keep the stem recognizable (e.g. `handoff.pdf`). */
export function truncateOverviewFilename(name: string, max = FILENAME_MAX): string {
  const raw = trimmed(name)
  if (!raw) return ''
  if (raw.length <= max) return raw
  const dot = raw.lastIndexOf('.')
  const ext = dot > 0 ? raw.slice(dot) : ''
  const stem = ext ? raw.slice(0, dot) : raw
  const room = Math.max(4, max - ext.length - 1)
  return `${stem.slice(0, room)}…${ext}`
}

function categoryTag(category: string | null | undefined): string | null {
  const raw = trimmed(category)
  if (!raw) return null
  const key = raw.toLowerCase()
  if (key === 'other') return null
  const label = interviewRoleCategoryLabel(raw)
  if (!label || label.toLowerCase() === 'other') return null
  return label
}

function dateTag(iso: string | null | undefined): string | null {
  const raw = trimmed(iso)
  if (!raw) return null
  return formatInterviewManagerDateShort(raw)
}

/** Collapsed day / closed-major tags — facts that are actually present. */
export function creatorOverviewSectionTags(facts: CreatorOverviewFacts): CreatorOverviewTag[] {
  const tags: CreatorOverviewTag[] = []
  const category = categoryTag(facts.category)
  if (category) tags.push({ label: category })

  const minutes = parsePositiveInt(facts.proposedMinutes)
  if (minutes) tags.push({ label: `${minutes}m` })

  const opens = dateTag(facts.opensAt)
  if (opens) tags.push({ label: opens })
  const closes = dateTag(facts.closesAt)
  if (closes) tags.push({ label: closes })

  if (trimmed(facts.coverName)) tags.push({ label: 'Thumbnail' })
  if (trimmed(facts.roleDescription)) tags.push({ label: 'Description' })

  const pdfName = truncateOverviewFilename(trimmed(facts.rolePdfName))
  if (pdfName) tags.push({ label: pdfName })

  if (trimmed(facts.candidateDescription)) tags.push({ label: 'Intro' })

  const seats = parsePositiveInt(facts.maxInterviews)
  if (seats) tags.push({ label: `${seats} seats` })

  return tags
}

/** Closed-major subset: candidate intro. */
export function creatorOverviewCandidateTags(facts: CreatorOverviewFacts): CreatorOverviewTag[] {
  return trimmed(facts.candidateDescription) ? [{ label: 'Intro' }] : []
}

/** Closed-major subset: brief (category, description, PDF name). */
export function creatorOverviewBriefTags(facts: CreatorOverviewFacts): CreatorOverviewTag[] {
  const tags: CreatorOverviewTag[] = []
  const category = categoryTag(facts.category)
  if (category) tags.push({ label: category })
  if (trimmed(facts.roleDescription)) tags.push({ label: 'Description' })
  const pdfName = truncateOverviewFilename(trimmed(facts.rolePdfName))
  if (pdfName) tags.push({ label: pdfName })
  return tags
}

/** Closed-major subset: window. */
export function creatorOverviewWindowTags(facts: CreatorOverviewFacts): CreatorOverviewTag[] {
  const tags: CreatorOverviewTag[] = []
  const minutes = parsePositiveInt(facts.proposedMinutes)
  if (minutes) tags.push({ label: `${minutes}m` })
  const opens = dateTag(facts.opensAt)
  if (opens) tags.push({ label: opens })
  const closes = dateTag(facts.closesAt)
  if (closes) tags.push({ label: closes })
  const seats = parsePositiveInt(facts.maxInterviews)
  if (seats) tags.push({ label: `${seats} seats` })
  return tags
}

export type CreatorOverviewPeelTag = {
  kind: 'notes' | 'pdf'
  label: string
}

const PEEL_FILENAME_MAX = 16

/**
 * Vurex peel chips — only when description or PDF is present.
 * Both empty → no fake “available” chips. Short labels; icons live in the composer.
 */
export function creatorOverviewPeelTags(facts: Pick<
  CreatorOverviewFacts,
  'roleDescription' | 'rolePdfName'
>): CreatorOverviewPeelTag[] {
  const tags: CreatorOverviewPeelTag[] = []
  if (trimmed(facts.roleDescription)) tags.push({ kind: 'notes', label: 'Notes' })
  const pdfName = truncateOverviewFilename(trimmed(facts.rolePdfName), PEEL_FILENAME_MAX)
  if (pdfName) tags.push({ kind: 'pdf', label: pdfName })
  return tags
}

/**
 * Append a PDF extract to a board-plan userMessage (same label as Generate).
 * Empty / missing extract leaves the message unchanged. Does not dump the JD.
 */
export function appendBoardOverviewContext(
  userMessage: string,
  opts: { rolePdfText?: string | null },
): string {
  const extract = trimmed(opts.rolePdfText)
  if (!extract) return userMessage
  return `${userMessage}\n\n${PDF_EXTRACT_LABEL}\n${extract.slice(0, PDF_EXTRACT_CAP)}`
}

export function creatorOverviewFactsFromBrief(brief: {
  category?: string | null
  proposedMinutes?: number | null
  opensAt?: string | null
  closesAt?: string | null
  coverName?: string | null
  rolePdfName?: string | null
  roleDescription?: string | null
  candidateDescription?: string | null
  maxInterviews?: number | null
}): CreatorOverviewFacts {
  return {
    category: brief.category,
    proposedMinutes: brief.proposedMinutes,
    opensAt: brief.opensAt,
    closesAt: brief.closesAt,
    coverName: brief.coverName,
    rolePdfName: brief.rolePdfName,
    roleDescription: brief.roleDescription,
    candidateDescription: brief.candidateDescription,
    maxInterviews: brief.maxInterviews,
  }
}
