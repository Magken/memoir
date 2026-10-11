import type { CvSectionKind } from '../../lib/cvApi'
import {
  defaultSectionTitle,
  newId,
  type VurifyViewerBasics,
  type VurifyViewerDoc,
  type VurifyViewerItem,
  type VurifyViewerSection,
} from './types'

function renumber(sections: VurifyViewerSection[]): VurifyViewerSection[] {
  return sections.map((section, index) => ({ ...section, sort_order: index }))
}

export function patchBasics(
  doc: VurifyViewerDoc,
  patch: Partial<VurifyViewerBasics>,
): VurifyViewerDoc {
  return { ...doc, basics: { ...doc.basics, ...patch } }
}

export function patchSection(
  doc: VurifyViewerDoc,
  sectionId: string,
  patch: Partial<VurifyViewerSection>,
): VurifyViewerDoc {
  return {
    ...doc,
    sections: doc.sections.map((section) =>
      section.id === sectionId ? { ...section, ...patch } : section,
    ),
  }
}

export function patchItem(
  doc: VurifyViewerDoc,
  sectionId: string,
  itemIndex: number,
  patch: VurifyViewerItem,
): VurifyViewerDoc {
  return {
    ...doc,
    sections: doc.sections.map((section) => {
      if (section.id !== sectionId) return section
      const items = section.items.map((item, index) => {
        if (index !== itemIndex) return item
        const next = { ...item, ...patch }
        for (const [key, value] of Object.entries(patch)) {
          if (value == null) delete next[key]
        }
        return next
      })
      return { ...section, items }
    }),
  }
}

export function setItemKey(
  doc: VurifyViewerDoc,
  sectionId: string,
  itemIndex: number,
  key: string,
  value: unknown,
): VurifyViewerDoc {
  return patchItem(doc, sectionId, itemIndex, { [key]: value })
}

export function clearItemKey(
  doc: VurifyViewerDoc,
  sectionId: string,
  itemIndex: number,
  key: string,
): VurifyViewerDoc {
  return {
    ...doc,
    sections: doc.sections.map((section) => {
      if (section.id !== sectionId) return section
      const items = section.items.map((item, index) => {
        if (index !== itemIndex) return item
        const next = { ...item }
        delete next[key]
        return next
      })
      return { ...section, items }
    }),
  }
}

export function addItem(
  doc: VurifyViewerDoc,
  sectionId: string,
  item: VurifyViewerItem = {},
): VurifyViewerDoc {
  return {
    ...doc,
    sections: doc.sections.map((section) =>
      section.id === sectionId ? { ...section, items: [...section.items, item] } : section,
    ),
  }
}

export function removeItem(
  doc: VurifyViewerDoc,
  sectionId: string,
  itemIndex: number,
): VurifyViewerDoc {
  return {
    ...doc,
    sections: doc.sections.map((section) => {
      if (section.id !== sectionId) return section
      return {
        ...section,
        items: section.items.filter((_, index) => index !== itemIndex),
      }
    }),
  }
}

export function addSection(
  doc: VurifyViewerDoc,
  kind: CvSectionKind,
  atIndex?: number,
): VurifyViewerDoc {
  const section: VurifyViewerSection = {
    id: newId(),
    kind,
    title: defaultSectionTitle(kind),
    sort_order: doc.sections.length,
    items: [],
  }
  const sections = [...doc.sections]
  const index =
    atIndex == null ? sections.length : Math.max(0, Math.min(atIndex, sections.length))
  sections.splice(index, 0, section)
  return { ...doc, sections: renumber(sections) }
}

export function removeSection(doc: VurifyViewerDoc, sectionId: string): VurifyViewerDoc {
  return {
    ...doc,
    sections: renumber(doc.sections.filter((section) => section.id !== sectionId)),
  }
}

export function reorderSections(doc: VurifyViewerDoc, orderedIds: string[]): VurifyViewerDoc {
  const byId = new Map(doc.sections.map((section) => [section.id, section]))
  const next = orderedIds
    .map((id) => byId.get(id))
    .filter((section): section is VurifyViewerSection => Boolean(section))
  for (const section of doc.sections) {
    if (!orderedIds.includes(section.id)) next.push(section)
  }
  return { ...doc, sections: renumber(next) }
}

export function reorderItems(
  doc: VurifyViewerDoc,
  sectionId: string,
  fromIndex: number,
  toIndex: number,
): VurifyViewerDoc {
  return {
    ...doc,
    sections: doc.sections.map((section) => {
      if (section.id !== sectionId) return section
      const items = [...section.items]
      const [moved] = items.splice(fromIndex, 1)
      if (!moved) return section
      items.splice(toIndex, 0, moved)
      return { ...section, items }
    }),
  }
}

/** Reorder items in one section by presence-key order (TOC sibling DnD). */
export function reorderItemsByKeys(
  doc: VurifyViewerDoc,
  sectionId: string,
  orderedKeys: string[],
): VurifyViewerDoc {
  return {
    ...doc,
    sections: doc.sections.map((section) => {
      if (section.id !== sectionId) return section
      const byKey = new Map(
        section.items.map((item, index) => [
          itemPresenceKey(section.id, item, index),
          item,
        ]),
      )
      const next: VurifyViewerItem[] = []
      const seen = new Set<string>()
      for (const key of orderedKeys) {
        const item = byKey.get(key)
        if (!item || seen.has(key)) continue
        next.push(item)
        seen.add(key)
      }
      for (const [key, item] of byKey) {
        if (!seen.has(key)) next.push(item)
      }
      return { ...section, items: next }
    }),
  }
}

export function appendBullet(
  doc: VurifyViewerDoc,
  sectionId: string,
  itemIndex: number,
  bullet = '',
): VurifyViewerDoc {
  const section = doc.sections.find((row) => row.id === sectionId)
  const item = section?.items[itemIndex]
  const bullets = Array.isArray(item?.bullets)
    ? [...(item.bullets as string[]), bullet]
    : [bullet]
  return setItemKey(doc, sectionId, itemIndex, 'bullets', bullets)
}

export function emptyItemForKind(kind: CvSectionKind): VurifyViewerItem {
  const id = newId()
  switch (kind) {
    case 'experience':
    case 'volunteer':
      // Lists / dates stay absent until added from the edge menu.
      return { id, title: '' }
    case 'education':
      return { id, institution: '' }
    case 'skills':
      return { id, category: '' }
    case 'projects':
      return { id, name: '' }
    case 'publications':
      return { id, title: '' }
    case 'references':
      return { id, name: '' }
    case 'awards':
    case 'certifications':
      return { id, name: '' }
    default:
      return { id, title: '' }
  }
}

/** Stable list key for item presence / dnd — prefers client `id`. */
export function itemPresenceKey(
  sectionId: string,
  item: VurifyViewerItem,
  index: number,
): string {
  const id = item.id
  if (typeof id === 'string' && id.length > 0) return id
  return `${sectionId}::${index}`
}
