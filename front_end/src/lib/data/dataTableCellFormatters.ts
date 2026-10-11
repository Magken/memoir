/**
 * DataTable cell formatters — structured preview/expand display (lists, dicts, JSON).
 * Extend with new formatter entries as more cell kinds are added.
 */

import type { DataType } from './dataTypes'
import { formatValueForDisplay, normalizeTagsValue } from './dataTypes'

export type StructuredCellKind = 'list' | 'dict' | 'json'

/** Collapsed preview limits (IntelliVey-style thresholds). */
export const STRUCTURED_PREVIEW_MAX_LINES = 4
export const STRUCTURED_PREVIEW_MAX_CHARS = 500

/** Expanded body limits before the cell uses a mini scroll rail. */
export const STRUCTURED_EXPAND_SCROLL_MIN_LINES = 14

export type DataTableCellFormatterContext = {
  value: unknown
  dataType: DataType
}

export type DataTableCellFormatter = {
  id: string
  /** When this formatter applies to the raw cell value. */
  matches: (ctx: DataTableCellFormatterContext) => boolean
  /** Pretty-print for in-cell `<pre>` (full text). */
  formatPretty: (value: unknown) => string
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)
}

function parseJsonLikeString(value: string): unknown | null {
  const trimmed = value.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

export function normalizeStructuredValue(value: unknown, dataType: DataType): unknown {
  if (value === null || value === undefined) return value
  if (dataType === 'tags') return normalizeTagsValue(value)
  if (typeof value === 'string') {
    const parsed = parseJsonLikeString(value)
    return parsed ?? value
  }
  return value
}

export function resolveStructuredCellKind(
  value: unknown,
  dataType: DataType,
): StructuredCellKind | null {
  const normalized = normalizeStructuredValue(value, dataType)
  if (normalized === null || normalized === undefined) return null
  if (Array.isArray(normalized)) return 'list'
  if (isPlainObject(normalized)) return 'dict'
  if (dataType === 'json' && typeof normalized === 'string') {
    const parsed = parseJsonLikeString(normalized)
    if (Array.isArray(parsed)) return 'list'
    if (isPlainObject(parsed)) return 'dict'
    return 'json'
  }
  return null
}

export function toPrettyStructuredText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') {
    const parsed = parseJsonLikeString(value)
    if (parsed !== null) return JSON.stringify(parsed, null, 2)
    return value.trim()
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const structuredListFormatter: DataTableCellFormatter = {
  id: 'structured-list',
  matches: ({ value, dataType }) => resolveStructuredCellKind(value, dataType) === 'list',
  formatPretty: (value) => toPrettyStructuredText(normalizeStructuredValue(value, 'tags')),
}

const structuredDictFormatter: DataTableCellFormatter = {
  id: 'structured-dict',
  matches: ({ value, dataType }) => resolveStructuredCellKind(value, dataType) === 'dict',
  formatPretty: (value) => toPrettyStructuredText(value),
}

const structuredJsonFormatter: DataTableCellFormatter = {
  id: 'structured-json',
  matches: ({ value, dataType }) => resolveStructuredCellKind(value, dataType) === 'json',
  formatPretty: (value) => toPrettyStructuredText(value),
}

/** First matching formatter wins — add new entries at the end. */
export const DATA_TABLE_CELL_FORMATTERS: readonly DataTableCellFormatter[] = [
  structuredListFormatter,
  structuredDictFormatter,
  structuredJsonFormatter,
]

export function pickDataTableCellFormatter(
  ctx: DataTableCellFormatterContext,
): DataTableCellFormatter | null {
  return DATA_TABLE_CELL_FORMATTERS.find((formatter) => formatter.matches(ctx)) ?? null
}

export function structuredCellNeedsToggle(pretty: string): boolean {
  const text = pretty.trim()
  if (!text) return false
  const lines = text.split('\n')
  return lines.length > STRUCTURED_PREVIEW_MAX_LINES || text.length > STRUCTURED_PREVIEW_MAX_CHARS
}

export function structuredCellPreviewText(pretty: string, truncate = false): string {
  const text = pretty.trim()
  if (!text) return '—'
  if (truncate) return text.replace(/\s*\n\s*/g, ' ')
  return text
}

/** Scalar cells that should single-line ellipsis when the column is narrow. */
export function scalarCellShouldTruncate(dataType: DataType): boolean {
  switch (dataType) {
    case 'integer':
    case 'number':
    case 'currency':
    case 'percent':
    case 'boolean':
    case 'date':
    case 'datetime':
    case 'time':
      return false
    default:
      return true
  }
}

export function structuredCellNeedsScroll(pretty: string): boolean {
  return pretty.split('\n').length > STRUCTURED_EXPAND_SCROLL_MIN_LINES
}

export function scalarCellPreview(value: unknown, dataType: DataType): string {
  return formatValueForDisplay(value, dataType)
}
