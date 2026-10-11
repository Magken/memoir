/**
 * Client-side CV normalize — mirrors Edge cv-extract/normalize.ts
 * (dates, skills shape, section order, reverse-chron items).
 */
import type { CvExtractV2, CvSectionKind } from './index'

export const SECTION_KIND_ORDER: Record<CvSectionKind, number> = {
  experience: 0,
  education: 1,
  projects: 2,
  skills: 3,
  certifications: 4,
  awards: 5,
  publications: 6,
  volunteer: 7,
  references: 8,
  custom: 9,
}

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
}

const DATE_KEYS = ['start', 'end', 'date', 'date_raw', 'year'] as const

const TITLE_KEYS = [
  'title',
  'name',
  'org',
  'institution',
  'degree',
  'field',
  'role',
  'category',
  'venue',
  'issuer',
  'relationship',
] as const

const TITLE_SMALL = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'vs',
  'via',
])

const TITLE_ACRONYMS = new Set([
  'ai',
  'api',
  'aws',
  'ci',
  'cd',
  'css',
  'cv',
  'gcp',
  'gpu',
  'html',
  'http',
  'https',
  'ios',
  'js',
  'llm',
  'ml',
  'pdf',
  'phd',
  'ph.d',
  'ph.d.',
  'rag',
  'rest',
  'sql',
  'ui',
  'ux',
  'usa',
  'uk',
  'vpn',
])

const DATE_KINDS = new Set<CvSectionKind>([
  'experience',
  'volunteer',
  'education',
  'projects',
  'publications',
  'awards',
  'certifications',
])

function lettersOnly(text: string): string {
  return text.replace(/[^A-Za-z]/g, '')
}

export function cvTitleNeedsCaseFix(text: string): boolean {
  const letters = lettersOnly(text)
  if (letters.length < 2) return false
  const upper = (letters.match(/[A-Z]/g) ?? []).length
  const lower = (letters.match(/[a-z]/g) ?? []).length
  if (upper >= 2 && lower === 0) return true
  if (lower >= 2 && upper === 0) return true
  return false
}

function titleCaseToken(token: string, index: number): string {
  const bare = token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9.]+$/g, '')
  if (!bare) return token
  const lower = bare.toLowerCase()
  let cased = bare
  if (TITLE_ACRONYMS.has(lower) || TITLE_ACRONYMS.has(lower.replace(/\.$/, ''))) {
    if (lower.startsWith('ph.d')) cased = bare.endsWith('.') ? 'Ph.D.' : 'Ph.D'
    else if (lower === 'ios') cased = 'iOS'
    else cased = bare.toUpperCase()
  } else if (index > 0 && TITLE_SMALL.has(lower)) {
    cased = lower
  } else {
    cased = bare.charAt(0).toUpperCase() + bare.slice(1).toLowerCase()
  }
  return token.replace(bare, cased)
}

/** Title Case for CV headings / job titles / orgs (fixes ALL CAPS + all-lowercase). */
export function formatCvTitleCase(raw: unknown): unknown {
  if (raw == null) return raw
  if (typeof raw !== 'string') return raw
  const text = raw.trim()
  if (!text) return null
  if (!cvTitleNeedsCaseFix(text)) return text

  const parts = text.split(/(\s+)/)
  let wordIndex = 0
  return parts
    .map((part) => {
      if (/^\s+$/.test(part)) return part
      const next = titleCaseToken(part, wordIndex)
      wordIndex += 1
      return next
    })
    .join('')
}

/** Store / display dates as `Jun 2020` or `2020`. */
export function formatCvDateStored(raw: unknown): unknown {
  if (raw == null) return raw
  if (typeof raw !== 'string') return raw
  const text = raw.trim()
  if (!text) return null

  const yearOnly = /^(\d{4})$/.exec(text)
  if (yearOnly) return yearOnly[1]

  const isoDay = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (isoDay) {
    const month = Number(isoDay[2]) - 1
    if (month >= 0 && month <= 11) return `${MONTH_ABBR[month]} ${isoDay[1]}`
  }

  const isoMonth = /^(\d{4})-(\d{2})$/.exec(text)
  if (isoMonth) {
    const month = Number(isoMonth[2]) - 1
    if (month >= 0 && month <= 11) return `${MONTH_ABBR[month]} ${isoMonth[1]}`
  }

  const monYear = /^([A-Za-z]+)\s+(\d{4})$/.exec(text)
  if (monYear) {
    const idx = MONTH_INDEX[monYear[1]!.toLowerCase()]
    if (idx != null) return `${MONTH_ABBR[idx]} ${monYear[2]}`
  }

  return text
}

function parseRecency(raw: unknown): number | null {
  const formatted = formatCvDateStored(raw)
  if (formatted == null || typeof formatted !== 'string') return null
  const text = formatted.trim()
  const yearOnly = /^(\d{4})$/.exec(text)
  if (yearOnly) return Date.UTC(Number(yearOnly[1]), 11, 31)
  const monYear = /^([A-Za-z]+)\s+(\d{4})$/.exec(text)
  if (monYear) {
    const idx = MONTH_INDEX[monYear[1]!.toLowerCase()]
    if (idx != null) return Date.UTC(Number(monYear[2]), idx, 1)
  }
  return null
}

function itemRecency(item: Record<string, unknown>): number {
  if (item.current === true) return Number.POSITIVE_INFINITY
  return (
    parseRecency(item.end) ??
    parseRecency(item.date) ??
    parseRecency(item.year) ??
    parseRecency(item.date_raw) ??
    parseRecency(item.start) ??
    Number.NEGATIVE_INFINITY
  )
}

function normalizeItemDates(item: Record<string, unknown>): Record<string, unknown> {
  const next = { ...item }
  for (const key of DATE_KEYS) {
    if (key in next) next[key] = formatCvDateStored(next[key])
  }
  for (const key of TITLE_KEYS) {
    if (key in next) next[key] = formatCvTitleCase(next[key])
  }
  if (Array.isArray(next.roles)) {
    next.roles = (next.roles as Record<string, unknown>[]).map((role) => {
      const r = { ...role }
      for (const key of ['start', 'end'] as const) {
        if (key in r) r[key] = formatCvDateStored(r[key])
      }
      if ('title' in r) r.title = formatCvTitleCase(r.title)
      return r
    })
  }
  return next
}

type SkillEntry = { name?: string; level?: string | null }

function skillHasLevel(entry: unknown): boolean {
  if (!entry || typeof entry !== 'object') return false
  const level = (entry as SkillEntry).level
  return typeof level === 'string' && level.trim().length > 0
}

function sectionHasSkillLevels(items: Record<string, unknown>[]): boolean {
  return items.some((item) => {
    const rows = item.items
    return Array.isArray(rows) && rows.some(skillHasLevel)
  })
}

function structuredToTaxonomyBullets(item: Record<string, unknown>): string | null {
  const category = typeof item.category === 'string' ? item.category.trim() : ''
  const rows = Array.isArray(item.items) ? (item.items as SkillEntry[]) : []
  const names = rows
    .map((row) => (typeof row?.name === 'string' ? row.name.trim() : ''))
    .filter(Boolean)
  if (!names.length) return null
  const label = category || 'Skills'
  return `**${label}:** ${names.join(', ')}`
}

export function normalizeSkillsItems(
  items: Record<string, unknown>[],
): Record<string, unknown>[] {
  if (!items.length) return items
  const useLevels = sectionHasSkillLevels(items)

  if (useLevels) {
    return items
      .map((item) => {
        const rows = Array.isArray(item.items) ? (item.items as SkillEntry[]) : null
        if (!rows?.length) return null
        const next: Record<string, unknown> = {
          ...item,
          items: rows.map((row) => ({
            name: row.name ?? '',
            ...(skillHasLevel(row) ? { level: String(row.level).trim() } : {}),
          })),
        }
        delete next.bullets
        return next
      })
      .filter((row): row is Record<string, unknown> => row != null)
  }

  const bullets: string[] = []
  for (const item of items) {
    if (Array.isArray(item.bullets)) {
      for (const line of item.bullets) {
        const text = String(line ?? '').trim()
        if (text) bullets.push(text)
      }
    }
    const converted = structuredToTaxonomyBullets(item)
    if (converted) bullets.push(converted)
  }

  if (!bullets.length) {
    return items.slice(0, 1).map((item) => {
      const next = { ...item }
      delete next.bullets
      return next
    })
  }

  return [
    {
      id: items[0]?.id,
      bullets: [...new Set(bullets)],
    },
  ]
}

function sortItemsByRecency(
  items: Record<string, unknown>[],
): Record<string, unknown>[] {
  return items
    .map((item, index) => ({ item, index, score: itemRecency(item) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.index - b.index
    })
    .map((row) => row.item)
}

export function applyCanonicalSectionOrder(
  sections: CvExtractV2['sections'],
): CvExtractV2['sections'] {
  return [...sections]
    .sort((a, b) => {
      const ao = SECTION_KIND_ORDER[a.kind] ?? 50
      const bo = SECTION_KIND_ORDER[b.kind] ?? 50
      if (ao !== bo) return ao - bo
      return a.sort_order - b.sort_order
    })
    .map((section, index) => ({ ...section, sort_order: index }))
}

/** Normalize extract/viewer docs for consistent review + dashboard display. */
export function normalizeCvViewerDoc(doc: CvExtractV2): CvExtractV2 {
  const basics = { ...doc.basics }
  if (basics.display_name != null) {
    basics.display_name = String(
      formatCvTitleCase(basics.display_name) ?? basics.display_name,
    )
  }
  if (basics.headline != null) {
    basics.headline = String(formatCvTitleCase(basics.headline) ?? basics.headline)
  }
  if (typeof basics.summary === 'string' && !basics.summary.trim()) {
    basics.summary = ''
  }

  const sections = doc.sections.map((section) => {
    let items = section.items.map((item) =>
      stripEmptyItemSeeds(normalizeItemDates(item as Record<string, unknown>)),
    )
    if (section.kind === 'skills') {
      items = normalizeSkillsItems(items)
    } else if (DATE_KINDS.has(section.kind)) {
      items = sortItemsByRecency(items)
    }
    const title =
      typeof section.title === 'string'
        ? String(formatCvTitleCase(section.title) ?? section.title)
        : section.title
    return { ...section, title, items }
  })

  return {
    ...doc,
    basics,
    sections: applyCanonicalSectionOrder(sections),
    coverage: {
      ...doc.coverage,
      found_kinds: [...new Set(sections.map((s) => s.kind))],
    },
  }
}

/**
 * Mid-stream preview only — strip empty seeds, do NOT date-sort / skills-reshape /
 * canonical-reorder (those remount index-keyed rows and jitter the live UI).
 */
export function softNormalizeCvStreamDoc(doc: CvExtractV2): CvExtractV2 {
  return {
    ...doc,
    schema_version: 2,
    sections: doc.sections.map((section, index) => ({
      ...section,
      sort_order: typeof section.sort_order === 'number' ? section.sort_order : index,
      items: section.items.map((item) =>
        stripEmptyItemSeeds(item as Record<string, unknown>),
      ),
    })),
    coverage: {
      ...doc.coverage,
      found_kinds: [...new Set(doc.sections.map((s) => s.kind))],
    },
  }
}

const LIST_KEYS = ['bullets', 'technologies', 'stack', 'honors', 'authors'] as const
const DATE_EMPTY_KEYS = ['start', 'end', 'date', 'date_raw', 'year'] as const

/** Blank-only arrays / empty date strings → omit (hidden until user adds). */
function stripEmptyItemSeeds(item: Record<string, unknown>): Record<string, unknown> {
  const next = { ...item }
  for (const key of LIST_KEYS) {
    const val = next[key]
    if (!Array.isArray(val)) continue
    const meaningful = val.some((row) => String(row ?? '').trim().length > 0)
    if (!meaningful) delete next[key]
  }
  if (Array.isArray(next.items)) {
    const rows = next.items as Array<{ name?: string; level?: string | null }>
    const meaningful = rows.some(
      (row) =>
        (typeof row?.name === 'string' && row.name.trim()) ||
        (typeof row?.level === 'string' && row.level.trim()),
    )
    if (!meaningful) delete next.items
  }
  for (const key of DATE_EMPTY_KEYS) {
    if (key in next && (next[key] === '' || next[key] == null)) {
      delete next[key]
    }
  }
  return next
}
