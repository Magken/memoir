import type { CvSectionKind } from '../../lib/cvApi'
import type { VurifyViewerItem } from './types'

/** Viewer-only body band order (not part of extract schema). */
export const ITEM_FIELD_ORDER_KEY = 'field_order'

export type ItemBodySlot =
  | 'employment_type'
  | 'location'
  | 'text'
  | 'list'
  | 'footer'
  | 'link'
  | 'roles'

const DEFAULT_BODY_ORDER: readonly ItemBodySlot[] = [
  'employment_type',
  'location',
  'text',
  'list',
  'footer',
  'link',
  'roles',
] as const

const SLOT_TOC_PREFIX = 'vv-slot-'

export function viewerSlotTocId(itemPresence: string, slot: ItemBodySlot): string {
  return `${SLOT_TOC_PREFIX}${itemPresence}:${slot}`
}

export function parseViewerSlotTocId(
  tocId: string,
): { itemKey: string; slot: ItemBodySlot } | null {
  if (!tocId.startsWith(SLOT_TOC_PREFIX)) return null
  const rest = tocId.slice(SLOT_TOC_PREFIX.length)
  const sep = rest.lastIndexOf(':')
  if (sep < 0) return null
  const itemKey = rest.slice(0, sep)
  const slot = rest.slice(sep + 1) as ItemBodySlot
  if (!DEFAULT_BODY_ORDER.includes(slot)) return null
  return { itemKey, slot }
}

export function footerKeyForKind(kind: CvSectionKind): 'technologies' | 'stack' | null {
  if (kind === 'projects') return 'stack'
  if (kind === 'experience' || kind === 'volunteer') return 'technologies'
  return null
}

export function isBodySlotPresent(
  item: VurifyViewerItem,
  kind: CvSectionKind,
  slot: ItemBodySlot,
): boolean {
  switch (slot) {
    case 'employment_type':
      return (kind === 'experience' || kind === 'volunteer') && item.employment_type != null
    case 'location':
      return item.location != null
    case 'text':
      return (
        item.body != null ||
        item.note != null ||
        item.summary != null ||
        item.description != null
      )
    case 'list':
      return item.bullets != null
    case 'footer': {
      const key = footerKeyForKind(kind)
      return key != null && item[key] != null
    }
    case 'link':
      return item.url != null || item.repo_url != null
    case 'roles':
      return Array.isArray(item.roles)
    default:
      return false
  }
}

export function presentBodySlots(
  item: VurifyViewerItem,
  kind: CvSectionKind,
): ItemBodySlot[] {
  return DEFAULT_BODY_ORDER.filter((slot) => isBodySlotPresent(item, kind, slot))
}

function asOrder(value: unknown): ItemBodySlot[] {
  if (!Array.isArray(value)) return []
  const out: ItemBodySlot[] = []
  for (const row of value) {
    if (typeof row !== 'string') continue
    if ((DEFAULT_BODY_ORDER as readonly string[]).includes(row)) {
      out.push(row as ItemBodySlot)
    }
  }
  return out
}

/** Stored order ∪ present slots (missing present slots append in default order). */
export function resolveFieldOrder(
  item: VurifyViewerItem,
  kind: CvSectionKind,
): ItemBodySlot[] {
  const present = new Set(presentBodySlots(item, kind))
  const stored = asOrder(item[ITEM_FIELD_ORDER_KEY])
  const ordered: ItemBodySlot[] = []
  for (const slot of stored) {
    if (present.has(slot) && !ordered.includes(slot)) ordered.push(slot)
  }
  for (const slot of DEFAULT_BODY_ORDER) {
    if (present.has(slot) && !ordered.includes(slot)) ordered.push(slot)
  }
  return ordered
}

export function slotLabel(slot: ItemBodySlot, kind: CvSectionKind): string {
  switch (slot) {
    case 'employment_type':
      return 'Employment type'
    case 'location':
      return 'Location'
    case 'text':
      return 'Text'
    case 'list':
      return 'List'
    case 'footer':
      return kind === 'projects' ? 'Stack footer' : 'Tech footer'
    case 'link':
      return 'Link'
    case 'roles':
      return 'Roles'
    default:
      return 'Field'
  }
}

/**
 * Map a focused `data-vv-field` id to a body slot (or heading/date for insert-after).
 * Heading/date mean “insert at the start of the body bands”.
 */
export function slotFromFocusedFieldId(
  fieldId: string | null | undefined,
): ItemBodySlot | 'heading' | 'date' | null {
  if (!fieldId) return null
  const tail = fieldId.includes('.') ? fieldId.slice(fieldId.lastIndexOf('.') + 1) : fieldId
  const parent = fieldId.includes('.')
    ? fieldId.slice(0, fieldId.lastIndexOf('.'))
    : ''
  const parentTail = parent.includes('.')
    ? parent.slice(parent.lastIndexOf('.') + 1)
    : parent

  if (
    ['title', 'name', 'org', 'institution', 'degree', 'field', 'role', 'category'].includes(
      tail,
    )
  ) {
    return 'heading'
  }
  if (['start', 'end', 'date', 'date_raw', 'year'].includes(tail)) return 'date'
  if (tail === 'employment_type') return 'employment_type'
  if (tail === 'location') return 'location'
  if (['body', 'note', 'summary', 'description'].includes(tail)) return 'text'
  if (parentTail === 'bullets' || tail === 'bullets') return 'list'
  if (parentTail === 'tech' || parentTail === 'stack' || tail === 'technologies' || tail === 'stack') {
    return 'footer'
  }
  if (tail === 'url' || tail === 'repo_url' || parentTail === 'url') return 'link'
  if (parentTail === 'roles' || tail === 'roles') return 'roles'
  // Numeric list row ids: `…bullets.0`
  if (/^\d+$/.test(tail) && parentTail === 'bullets') return 'list'
  if (/^\d+$/.test(tail) && (parentTail === 'tech' || parentTail === 'stack')) return 'footer'
  return null
}

export function slotForEdgeElement(
  element: string,
  kind: CvSectionKind,
): ItemBodySlot | null {
  switch (element) {
    case 'text':
      return 'text'
    case 'list':
      return 'list'
    case 'footer':
      return footerKeyForKind(kind) ? 'footer' : null
    case 'location':
      return 'location'
    case 'link':
      return 'link'
    case 'present':
    case 'date':
    case 'title':
    case 'subheading':
      return null
    default:
      return null
  }
}

/** Insert `slot` after the focus anchor; heading/date → front of body. */
export function insertSlotAfterFocus(
  order: ItemBodySlot[],
  focus: ItemBodySlot | 'heading' | 'date' | null,
  slot: ItemBodySlot,
): ItemBodySlot[] {
  const without = order.filter((row) => row !== slot)
  if (focus == null || focus === 'heading' || focus === 'date') {
    return [slot, ...without]
  }
  const at = without.indexOf(focus)
  if (at < 0) return [...without, slot]
  return [...without.slice(0, at + 1), slot, ...without.slice(at + 1)]
}

export function reorderBodySlots(
  item: VurifyViewerItem,
  kind: CvSectionKind,
  orderedSlots: ItemBodySlot[],
): VurifyViewerItem {
  const present = new Set(presentBodySlots(item, kind))
  const next = orderedSlots.filter((slot) => present.has(slot))
  for (const slot of presentBodySlots(item, kind)) {
    if (!next.includes(slot)) next.push(slot)
  }
  return { ...item, [ITEM_FIELD_ORDER_KEY]: next }
}
