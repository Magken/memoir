import type { CvSectionKind } from '../../lib/cvApi'
import type { VurifyViewerDoc, VurifyViewerItem } from './types'
import { itemPresenceKey, patchItem } from './patch'

/** Kinds ordered by date hierarchy (reverse-chronological). */
export const DATE_HIERARCHY_KINDS: ReadonlySet<CvSectionKind> = new Set([
  'experience',
  'volunteer',
  'education',
  'projects',
  'publications',
  'awards',
  'certifications',
])

const DATE_PATCH_KEYS = new Set([
  'start',
  'end',
  'current',
  'date',
  'date_raw',
  'year',
])

const MONTHS: Record<string, number> = {
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

export function sectionUsesDateHierarchy(kind: CvSectionKind): boolean {
  return DATE_HIERARCHY_KINDS.has(kind)
}

/** Manual TOC reorder allowed only for date-agnostic kinds (skills, references, custom). */
export function sectionAllowsManualItemReorder(kind: CvSectionKind): boolean {
  return !sectionUsesDateHierarchy(kind)
}

export function patchTouchesDateFields(patch: Record<string, unknown>): boolean {
  return Object.keys(patch).some((key) => DATE_PATCH_KEYS.has(key))
}

/** Parse loose CV date strings → UTC ms. Higher = more recent. */
export function parseCvDateToken(raw: unknown): number | null {
  if (raw == null) return null
  const text = String(raw).trim()
  if (!text) return null

  const yearOnly = /^(\d{4})$/.exec(text)
  if (yearOnly) return Date.UTC(Number(yearOnly[1]), 11, 31)

  const isoDay = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (isoDay) {
    const month = Number(isoDay[2]) - 1
    if (month >= 0 && month <= 11) {
      return Date.UTC(Number(isoDay[1]), month, Number(isoDay[3]))
    }
  }

  const isoMonth = /^(\d{4})-(\d{2})$/.exec(text)
  if (isoMonth) {
    const month = Number(isoMonth[2]) - 1
    if (month >= 0 && month <= 11) return Date.UTC(Number(isoMonth[1]), month, 1)
  }

  const monthYear = /^([A-Za-z]+)\s+(\d{4})$/.exec(text)
  if (monthYear) {
    const month = MONTHS[monthYear[1]!.toLowerCase()]
    if (month != null) return Date.UTC(Number(monthYear[2]), month, 1)
  }

  const iso = Date.parse(text)
  if (!Number.isNaN(iso)) return iso

  const embeddedYear = /(\d{4})/.exec(text)
  if (embeddedYear) return Date.UTC(Number(embeddedYear[1]), 6, 1)

  return null
}

/**
 * Start/end order: when both parse, end must not be before start.
 * Incomplete / unparseable sides are allowed (still typing).
 */
export function isCvDateRangeOrdered(start: unknown, end: unknown): boolean {
  const startMs = parseCvDateToken(start)
  const endMs = parseCvDateToken(end)
  if (startMs == null || endMs == null) return true
  return endMs >= startMs
}

/** Recency score for reverse-chronological sort. `current` wins. */
export function itemRecencyScore(item: VurifyViewerItem): number {
  if (item.current === true) return Number.POSITIVE_INFINITY

  const endish =
    parseCvDateToken(item.end) ??
    parseCvDateToken(item.date) ??
    parseCvDateToken(item.year) ??
    parseCvDateToken(item.date_raw)
  if (endish != null) return endish

  const start = parseCvDateToken(item.start)
  if (start != null) return start

  return Number.NEGATIVE_INFINITY
}

export function sortItemsByRecency(
  items: readonly VurifyViewerItem[],
): VurifyViewerItem[] {
  return items
    .map((item, index) => ({ item, index, score: itemRecencyScore(item) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.index - b.index
    })
    .map((row) => row.item)
}

export function reorderSectionItemsByRecency(
  doc: VurifyViewerDoc,
  sectionId: string,
): VurifyViewerDoc {
  return {
    ...doc,
    sections: doc.sections.map((section) => {
      if (section.id !== sectionId) return section
      if (!sectionUsesDateHierarchy(section.kind)) return section
      return { ...section, items: sortItemsByRecency(section.items) }
    }),
  }
}

export type ItemPatchSortResult = {
  doc: VurifyViewerDoc
  /** True when item order changed after the patch. */
  reordered: boolean
  /** Presence / TOC key for the edited item (stable id preferred). */
  itemKey: string | null
  sectionId: string
}

/**
 * Patch an item; when the patch touches dates on a date-hierarchy section,
 * re-sort that section reverse-chronologically.
 */
export function patchItemMaybeResortByDate(
  doc: VurifyViewerDoc,
  sectionId: string,
  itemIndex: number,
  patch: VurifyViewerItem,
): ItemPatchSortResult {
  const section = doc.sections.find((row) => row.id === sectionId)
  if (!section) {
    return { doc, reordered: false, itemKey: null, sectionId }
  }

  const beforeKey = itemPresenceKey(sectionId, section.items[itemIndex] ?? {}, itemIndex)
  let next = patchItem(doc, sectionId, itemIndex, patch)

  const shouldResort =
    sectionUsesDateHierarchy(section.kind) && patchTouchesDateFields(patch)

  if (!shouldResort) {
    return { doc: next, reordered: false, itemKey: beforeKey, sectionId }
  }

  const patchedSection = next.sections.find((row) => row.id === sectionId)
  const beforeIds = (patchedSection?.items ?? []).map((item, index) =>
    itemPresenceKey(sectionId, item, index),
  )
  next = reorderSectionItemsByRecency(next, sectionId)
  const afterSection = next.sections.find((row) => row.id === sectionId)
  const afterIds = (afterSection?.items ?? []).map((item, index) =>
    itemPresenceKey(sectionId, item, index),
  )
  const reordered = beforeIds.join('\0') !== afterIds.join('\0')

  return { doc: next, reordered, itemKey: beforeKey, sectionId }
}
