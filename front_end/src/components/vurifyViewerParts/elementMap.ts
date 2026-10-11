import type { LucideIcon } from 'lucide-react'
import {
  Calendar,
  Heading,
  Languages,
  Layers,
  Link2,
  List,
  MapPin,
  Phone,
  PlusCircle,
  Text,
  Trash2,
  Type,
} from 'lucide-react'
import type { CvLinkKind, CvSectionKind } from '../../lib/cvApi'
import {
  insertSlotAfterFocus,
  ITEM_FIELD_ORDER_KEY,
  resolveFieldOrder,
  slotFromFocusedFieldId,
  type ItemBodySlot,
} from './itemFieldOrder'

export type EdgeElementId =
  | 'title'
  | 'subheading'
  | 'date'
  | 'text'
  | 'list'
  | 'footer'
  | 'present'
  | 'link'
  | 'phone'
  | 'location'
  | 'language'
  | 'add-entry'
  | 'remove'

export type EdgeMenuTarget =
  | { scope: 'basics' }
  | { scope: 'section'; sectionId: string; kind: CvSectionKind }
  | { scope: 'item'; sectionId: string; itemIndex: number; kind: CvSectionKind }

export type EdgeMenuItem = {
  id: EdgeElementId
  label: string
  icon?: LucideIcon
  disabled?: boolean
  destructive?: boolean
}

const BASE_ITEM_MENU: EdgeMenuItem[] = [
  { id: 'title', label: 'Title / heading', icon: Heading },
  { id: 'subheading', label: 'Subheading', icon: Type },
  { id: 'date', label: 'Date', icon: Calendar },
  { id: 'text', label: 'Text', icon: Text },
  { id: 'list', label: 'List', icon: List },
  { id: 'footer', label: 'Tech footer', icon: Layers },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'present', label: 'Present', icon: Calendar },
  { id: 'link', label: 'Link / URL', icon: Link2 },
  { id: 'remove', label: 'Remove entry', icon: Trash2, destructive: true },
]

const SECTION_MENU: EdgeMenuItem[] = [
  { id: 'add-entry', label: 'Add entry', icon: PlusCircle },
  { id: 'remove', label: 'Remove section', icon: Trash2, destructive: true },
]

const BASICS_MENU: EdgeMenuItem[] = [
  { id: 'title', label: 'Name', icon: Heading },
  { id: 'subheading', label: 'Headline', icon: Type },
  { id: 'text', label: 'Summary', icon: Text },
  { id: 'list', label: 'Email', icon: List },
  { id: 'phone', label: 'Phone', icon: Phone },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'link', label: 'Link', icon: Link2 },
  { id: 'language', label: 'Language', icon: Languages },
]

function itemHas(item: Record<string, unknown>, keys: string[]): boolean {
  return keys.some((key) => {
    const value = item[key]
    if (value == null) return false
    // Empty string still counts — open slot from + menu until cleared to null.
    if (Array.isArray(value)) return value.length > 0
    return true
  })
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export function edgeMenuItemsFor(
  target: EdgeMenuTarget,
  item?: Record<string, unknown>,
  basics?: {
    display_name?: string | null
    headline?: string | null
    summary?: string | null
    /** Empty-but-open text slots (added from menu, not yet filled). */
    headlineSlot?: boolean
    summarySlot?: boolean
  },
): EdgeMenuItem[] {
  if (target.scope === 'basics') {
    return BASICS_MENU.map((row) => {
      if (row.id === 'title' && hasText(basics?.display_name)) {
        return { ...row, disabled: true }
      }
      if (row.id === 'subheading' && (hasText(basics?.headline) || basics?.headlineSlot)) {
        return { ...row, disabled: true }
      }
      if (row.id === 'text' && (hasText(basics?.summary) || basics?.summarySlot)) {
        return { ...row, disabled: true }
      }
      if (row.id === 'list') return { ...row, label: 'Add email' }
      if (row.id === 'phone') return { ...row, label: 'Add phone' }
      if (row.id === 'location') return { ...row, label: 'Add location' }
      if (row.id === 'link') return { ...row, label: 'Add link' }
      if (row.id === 'language') return { ...row, label: 'Add language' }
      return row
    })
  }
  if (target.scope === 'section') {
    const kind = target.kind
    const items = [...SECTION_MENU]
    if (kind === 'skills') {
      return items.map((row) =>
        row.id === 'add-entry' ? { ...row, label: 'Add skill group' } : row,
      )
    }
    return items
  }

  const kind = target.kind
  const rows = BASE_ITEM_MENU.map((row) => {
    if (!item) return row
    if (row.id === 'title' && itemHas(item, titleKeysFor(kind))) {
      return { ...row, disabled: true }
    }
    if (row.id === 'subheading' && itemHas(item, subheadingKeysFor(kind))) {
      return { ...row, disabled: true }
    }
    if (row.id === 'date' && itemHas(item, dateKeysFor(kind))) {
      return { ...row, disabled: true }
    }
    if (row.id === 'text' && itemHas(item, textKeysFor(kind))) {
      return { ...row, disabled: true }
    }
    if (row.id === 'present' && item.current === true) {
      return { ...row, disabled: true }
    }
    if (row.id === 'link' && itemHas(item, ['url', 'repo_url'])) {
      return { ...row, disabled: true }
    }
    if (row.id === 'location') {
      if (!['experience', 'volunteer', 'education', 'projects'].includes(kind)) {
        return { ...row, disabled: true }
      }
      if (itemHas(item, ['location'])) {
        return { ...row, disabled: true }
      }
      return { ...row, label: 'Add location' }
    }
    if (row.id === 'list' && Array.isArray(item.bullets) && item.bullets.length > 0) {
      return { ...row, label: 'Add list item' }
    }
    if (row.id === 'footer') {
      if (kind === 'projects') {
        if (itemHas(item, ['stack'])) return { ...row, label: 'Add stack item' }
        return { ...row, label: 'Stack footer' }
      }
      if (kind === 'experience' || kind === 'volunteer') {
        if (itemHas(item, ['technologies'])) return { ...row, label: 'Add tech item' }
        return { ...row, label: 'Tech footer' }
      }
      return { ...row, disabled: true }
    }
    return row
  })

  if (kind === 'skills') {
    return [
      { id: 'title', label: 'Category' },
      { id: 'add-entry', label: 'Add skill' },
      { id: 'remove', label: 'Remove group', destructive: true },
    ]
  }

  return rows
}

export function titleKeysFor(kind: CvSectionKind): string[] {
  switch (kind) {
    case 'experience':
    case 'volunteer':
      return ['title', 'org']
    case 'education':
      return ['institution']
    case 'projects':
      return ['name']
    case 'publications':
    case 'custom':
      return ['title']
    case 'awards':
    case 'certifications':
    case 'references':
      return ['name']
    default:
      return ['title', 'name']
  }
}

export function subheadingKeysFor(kind: CvSectionKind): string[] {
  switch (kind) {
    case 'experience':
    case 'volunteer':
      // Layout secondary line is org (not a separate role field).
      return ['org']
    case 'education':
      return ['degree', 'field']
    case 'skills':
      return ['category']
    case 'projects':
      return ['role']
    default:
      return ['headline', 'subtitle', 'role']
  }
}

export function dateKeysFor(kind: CvSectionKind): string[] {
  switch (kind) {
    case 'publications':
      return ['year', 'date', 'date_raw']
    case 'awards':
    case 'certifications':
      return ['date', 'date_raw', 'year']
    default:
      return ['start', 'end', 'date', 'date_raw', 'year']
  }
}

export function textKeysFor(kind: CvSectionKind): string[] {
  switch (kind) {
    case 'custom':
      return ['body', 'note', 'summary']
    default:
      return ['body', 'note', 'summary', 'description']
  }
}

export type ApplyElementOptions = {
  /** Focused viewer field id — new body slots insert below this anchor. */
  focusedFieldId?: string | null
}

export function applyElementToItem(
  kind: CvSectionKind,
  item: Record<string, unknown>,
  element: EdgeElementId,
  options: ApplyElementOptions = {},
): Record<string, unknown> {
  const next = { ...item }
  let openedBodySlot: ItemBodySlot | null = null
  const hadList = Array.isArray(next.bullets)
  const hadFooter =
    (kind === 'projects' && next.stack != null) ||
    ((kind === 'experience' || kind === 'volunteer') && next.technologies != null)

  switch (element) {
    case 'title': {
      const key = titleKeysFor(kind)[0] ?? 'title'
      if (next[key] == null) next[key] = ''
      break
    }
    case 'subheading': {
      for (const key of subheadingKeysFor(kind)) {
        if (next[key] == null) next[key] = ''
      }
      break
    }
    case 'date': {
      if (kind === 'publications' || kind === 'awards' || kind === 'certifications') {
        if (next.date == null && next.year == null && next.date_raw == null) next.date = ''
      } else {
        if (next.start == null) next.start = ''
        if (next.end == null) next.end = ''
      }
      break
    }
    case 'text': {
      const key = textKeysFor(kind)[0] ?? 'body'
      if (next[key] == null) {
        next[key] = ''
        openedBodySlot = 'text'
      }
      break
    }
    case 'list': {
      const bullets = Array.isArray(next.bullets) ? [...(next.bullets as string[])] : []
      bullets.push('')
      next.bullets = bullets
      if (!hadList) openedBodySlot = 'list'
      break
    }
    case 'footer': {
      if (kind === 'projects') {
        const stack = Array.isArray(next.stack) ? [...(next.stack as string[])] : []
        stack.push('')
        next.stack = stack
        if (!hadFooter) openedBodySlot = 'footer'
      } else if (kind === 'experience' || kind === 'volunteer') {
        const technologies = Array.isArray(next.technologies)
          ? [...(next.technologies as string[])]
          : []
        technologies.push('')
        next.technologies = technologies
        if (!hadFooter) openedBodySlot = 'footer'
      }
      break
    }
    case 'present':
      next.current = next.current === true ? false : true
      if (next.current) next.end = null
      break
    case 'link':
      if (next.url == null) {
        next.url = ''
        openedBodySlot = 'link'
      }
      break
    case 'location':
      if (next.location == null) {
        next.location = ''
        openedBodySlot = 'location'
      }
      break
    case 'phone':
    case 'language':
      break
    default:
      break
  }

  if (openedBodySlot) {
    const focus = slotFromFocusedFieldId(options.focusedFieldId)
    const order = resolveFieldOrder(next, kind)
    next[ITEM_FIELD_ORDER_KEY] = insertSlotAfterFocus(order, focus, openedBodySlot)
  }

  return next
}

export const DEFAULT_LINK_KIND: CvLinkKind = 'website'
