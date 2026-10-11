/**
 * Dashboard table cell display — resolves column hints and formats structured summaries.
 */

import { Copy, Pencil, Trash2, type LucideIcon } from 'lucide-react'
import type { SemanticTone } from '../ui/semanticTone'
import type { DashboardCellDisplay, DataColumn, DataType } from './dataTypes'
import { formatValueForDisplay, normalizeTagsValue, resolveColumnDataType } from './dataTypes'
import { resolveStructuredCellKind } from './dataTableCellFormatters'

export type DashboardActionPreset = {
  id: string
  label: string
  icon: LucideIcon
}

export const DASHBOARD_ACTION_PRESETS: readonly DashboardActionPreset[] = [
  { id: 'edit', label: 'Edit', icon: Pencil },
  { id: 'duplicate', label: 'Duplicate', icon: Copy },
  { id: 'delete', label: 'Delete', icon: Trash2 },
] as const

const DASHBOARD_ACTION_ICON: Record<string, LucideIcon> = Object.fromEntries(
  DASHBOARD_ACTION_PRESETS.map((preset) => [preset.id, preset.icon]),
)

export function resolveDashboardCellDisplay(
  column: DataColumn,
  dataType: DataType,
): Exclude<DashboardCellDisplay, 'auto'> {
  const hint = column.cellDisplay ?? 'auto'
  if (hint !== 'auto') return hint
  switch (dataType) {
    case 'enum':
      return 'status'
    case 'tags':
      return 'tags'
    case 'boolean':
      return 'boolean-switch'
    default:
      return 'text'
  }
}

export function resolveStatusTone(
  value: unknown,
  toneMap?: Record<string, SemanticTone>,
): SemanticTone {
  const key = value === null || value === undefined ? '' : String(value).toLowerCase()
  if (toneMap?.[key]) return toneMap[key]
  if (key === 'published' || key === 'live' || key === 'active' || key === 'success') return 'success'
  if (key === 'draft' || key === 'pending' || key === 'scheduled') return 'warning'
  if (key === 'archived' || key === 'cancelled' || key === 'error' || key === 'failed') return 'error'
  return 'info'
}

export function dashboardTagValues(value: unknown): string[] {
  return normalizeTagsValue(value)
}

export type DashboardUserShape = 'round' | 'square'

export type DashboardUser = {
  name: string
  imageSrc?: string
  imageAlt?: string
  /** `round` avatar · `square` logo. Default `round`. */
  shape?: DashboardUserShape
}

function readDashboardUserImage(record: Record<string, unknown>): string | undefined {
  const raw = record.imageSrc ?? record.src ?? record.avatar ?? record.image
  if (raw === null || raw === undefined || raw === '') return undefined
  return String(raw)
}

/** Parse a single user chip — string name, or `{ name, imageSrc?, shape? }`. */
export function parseDashboardUser(value: unknown): DashboardUser | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    const name = value.trim()
    return name ? { name, shape: 'round' } : null
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    const nameRaw = record.name ?? record.label ?? record.displayName
    if (nameRaw === null || nameRaw === undefined || nameRaw === '') return null
    const imageAltRaw = record.imageAlt ?? record.alt
    return {
      name: String(nameRaw),
      imageSrc: readDashboardUserImage(record),
      imageAlt: imageAltRaw != null && imageAltRaw !== '' ? String(imageAltRaw) : undefined,
      shape: record.shape === 'square' ? 'square' : 'round',
    }
  }
  return null
}

/** Parse one or many user chips — arrays, comma strings, or a single user object. */
export function parseDashboardUsers(value: unknown): DashboardUser[] {
  if (value === null || value === undefined) return []
  if (Array.isArray(value)) {
    return value.map((item) => parseDashboardUser(item)).filter((user): user is DashboardUser => user !== null)
  }
  if (typeof value === 'string' && value.includes(',')) {
    return value
      .split(',')
      .map((part) => parseDashboardUser(part.trim()))
      .filter((user): user is DashboardUser => user !== null)
  }
  const one = parseDashboardUser(value)
  return one ? [one] : []
}

export function parseDashboardActionIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean)
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((part) => part.trim()).filter(Boolean)
  }
  return ['edit']
}

export function dashboardActionLabel(actionId: string): string {
  return DASHBOARD_ACTION_PRESETS.find((preset) => preset.id === actionId)?.label ?? actionId
}

export function dashboardActionIcon(actionId: string): LucideIcon {
  return DASHBOARD_ACTION_ICON[actionId] ?? Pencil
}

/** Compact structured summary for dashboard cells (list/dict/json). */
export function structuredDashboardSummary(value: unknown, dataType: DataType): string {
  const kind = resolveStructuredCellKind(value, dataType)
  if (!kind) return formatValueForDisplay(value, dataType)
  const normalized =
    kind === 'list'
      ? normalizeTagsValue(value)
      : typeof value === 'object' && value !== null && !Array.isArray(value)
        ? Object.keys(value as Record<string, unknown>)
        : null
  if (kind === 'list' && Array.isArray(normalized)) {
    return normalized.length === 1 ? '1 item' : `${normalized.length} items`
  }
  if (kind === 'dict' && Array.isArray(normalized)) {
    return normalized.length === 1 ? '1 field' : `${normalized.length} fields`
  }
  if (kind === 'json') return 'JSON'
  return formatValueForDisplay(value, dataType)
}

export function dashboardPrimaryText(value: unknown, dataType: DataType): string {
  return formatValueForDisplay(value, dataType)
}

export function resolveDashboardBadgeText(
  rowValues: Record<string, unknown>,
  column: DataColumn,
): string {
  const badgeKey = column.badgeKey
  const raw = badgeKey != null ? rowValues[badgeKey] : rowValues[column.key]
  if (raw === null || raw === undefined || raw === '') return ''
  return String(raw)
}

export type DashboardLinkParts = {
  href: string
  label: string
  external: boolean
}

/** Parse a path or URL for dashboard link cells. */
export function parseDashboardLink(value: unknown): DashboardLinkParts | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    const href = record.href ?? record.url ?? record.to
    if (href == null || href === '') return null
    const label = record.label ?? record.text ?? String(href)
    const hrefStr = String(href)
    return {
      href: hrefStr,
      label: String(label),
      external: /^https?:\/\//i.test(hrefStr),
    }
  }
  const label = String(value).trim()
  if (!label) return null
  const external = /^https?:\/\//i.test(label)
  return { href: label, label, external }
}

export function resolveColumnDisplayType(column: DataColumn): DataType {
  return resolveColumnDataType(column)
}
