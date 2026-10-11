import type { NanoAnchorMenuEntry } from '../../lib/menus/nanoAnchorMenu'
import { asString, type VurifyViewerDoc, type VurifyViewerItem } from './types'
import { sectionAllowsManualItemReorder } from './itemDateOrder'
import {
  ITEM_FIELD_ORDER_KEY,
  parseViewerSlotTocId,
  presentBodySlots,
  resolveFieldOrder,
  slotLabel,
  type ItemBodySlot,
  viewerSlotTocId,
} from './itemFieldOrder'
import { itemPresenceKey, patchItem } from './patch'

export const VIEWER_TOC_BASICS_ID = 'vv-basics'

export function viewerSectionTocId(sectionId: string): string {
  return `vv-sec-${sectionId}`
}

const SECTION_TOC_PREFIX = 'vv-sec-'
const ITEM_TOC_PREFIX = 'vv-item-'

export function sectionIdFromViewerTocId(tocId: string): string | null {
  if (!tocId.startsWith(SECTION_TOC_PREFIX)) return null
  return tocId.slice(SECTION_TOC_PREFIX.length)
}

export function itemPresenceKeyFromViewerTocId(tocId: string): string | null {
  if (!tocId.startsWith(ITEM_TOC_PREFIX)) return null
  return tocId.slice(ITEM_TOC_PREFIX.length)
}

/**
 * Resolve which document section a TOC click belongs to
 * (section row, entry, or body slot under an entry). Basics → null.
 */
export function sectionIdForViewerTocTarget(
  doc: VurifyViewerDoc,
  tocId: string,
): string | null {
  const fromSection = sectionIdFromViewerTocId(tocId)
  if (fromSection) return fromSection

  const slot = parseViewerSlotTocId(tocId)
  const itemKey = slot?.itemKey ?? itemPresenceKeyFromViewerTocId(tocId)
  if (!itemKey) return null

  for (const section of doc.sections) {
    const hit = section.items.some(
      (item, index) => itemPresenceKey(section.id, item, index) === itemKey,
    )
    if (hit) return section.id
  }
  return null
}

/** Section TOC ids in document order — for micro-menu reorder grips. */
export function buildViewerTocSortableSectionIds(doc: VurifyViewerDoc): string[] {
  return [...doc.sections]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((section) => viewerSectionTocId(section.id))
}

/** Date-agnostic entry groups — reorder only among siblings under the same section. */
export function buildViewerTocSortableItemGroups(
  doc: VurifyViewerDoc,
): { parentId: string; ids: string[] }[] {
  return [...doc.sections]
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter((section) => sectionAllowsManualItemReorder(section.kind))
    .map((section) => ({
      parentId: viewerSectionTocId(section.id),
      ids: section.items.map((item, index) => viewerItemTocId(section.id, item, index)),
    }))
    .filter((group) => group.ids.length > 0)
}

/** Body-slot groups under each entry — for optional subsection TOC reorder. */
export function buildViewerTocSortableSlotGroups(
  doc: VurifyViewerDoc,
): { parentId: string; ids: string[] }[] {
  const groups: { parentId: string; ids: string[] }[] = []
  for (const section of [...doc.sections].sort((a, b) => a.sort_order - b.sort_order)) {
    section.items.forEach((item, index) => {
      const presence = itemPresenceKey(section.id, item, index)
      const slots = resolveFieldOrder(item, section.kind)
      if (slots.length < 2) return
      groups.push({
        parentId: viewerItemTocId(section.id, item, index),
        ids: slots.map((slot) => viewerSlotTocId(presence, slot)),
      })
    })
  }
  return groups
}

export function viewerItemTocId(sectionId: string, item: VurifyViewerItem, index: number): string {
  return `${ITEM_TOC_PREFIX}${itemPresenceKey(sectionId, item, index)}`
}

function tocLabel(raw: string, fallback: string): string {
  return raw.trim() || fallback
}

/**
 * Flat nano-anchor entries: basics + sections (L2), entries (L3).
 * When `subsectionToc`, body slots appear as L4 under each entry.
 */
export function buildViewerTocEntries(
  doc: VurifyViewerDoc,
  options: { subsectionToc?: boolean } = {},
): NanoAnchorMenuEntry[] {
  const subsectionToc = Boolean(options.subsectionToc)
  const entries: NanoAnchorMenuEntry[] = [
    {
      id: VIEWER_TOC_BASICS_ID,
      label: tocLabel(asString(doc.basics.display_name), 'Basics'),
      level: 2,
    },
  ]

  const sections = [...doc.sections].sort((a, b) => a.sort_order - b.sort_order)
  for (const section of sections) {
    entries.push({
      id: viewerSectionTocId(section.id),
      label: tocLabel(asString(section.title), 'Section'),
      level: 2,
    })
    section.items.forEach((item, index) => {
      const presence = itemPresenceKey(section.id, item, index)
      entries.push({
        id: viewerItemTocId(section.id, item, index),
        label: tocLabel(
          asString(
            item.title ?? item.name ?? item.org ?? item.institution ?? item.category ?? item.role,
          ),
          `Entry ${index + 1}`,
        ),
        level: 3,
      })
      if (!subsectionToc) return
      for (const slot of resolveFieldOrder(item, section.kind)) {
        entries.push({
          id: viewerSlotTocId(presence, slot),
          label: slotLabel(slot, section.kind),
          level: 4,
        })
      }
    })
  }

  return entries
}

/** Apply TOC slot reorder under one entry. */
export function reorderItemSlotsFromToc(
  doc: VurifyViewerDoc,
  orderedSlotTocIds: string[],
): VurifyViewerDoc | null {
  if (orderedSlotTocIds.length === 0) return null
  const parsed = orderedSlotTocIds
    .map((id) => parseViewerSlotTocId(id))
    .filter((row): row is { itemKey: string; slot: ItemBodySlot } => Boolean(row))
  if (parsed.length === 0) return null

  const itemKey = parsed[0]!.itemKey
  if (parsed.some((row) => row.itemKey !== itemKey)) return null

  for (const section of doc.sections) {
    const itemIndex = section.items.findIndex(
      (item, index) => itemPresenceKey(section.id, item, index) === itemKey,
    )
    if (itemIndex < 0) continue
    const item = section.items[itemIndex]!
    const present = new Set(presentBodySlots(item, section.kind))
    const ordered = parsed.map((row) => row.slot).filter((slot) => present.has(slot))
    return patchItem(doc, section.id, itemIndex, {
      [ITEM_FIELD_ORDER_KEY]: ordered,
    })
  }
  return null
}
