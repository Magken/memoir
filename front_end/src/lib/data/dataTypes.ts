/**
 * Data-type context: the semantic types a column can hold, plus per-type
 * display / CSV formatting. This registry is the source of truth that the
 * filter (dataFilter.ts), sort (dataSort.ts), export (dataTableExport.ts),
 * and DataTable component all read from.
 *
 * Add a type by extending `DataType` + a `DATA_TYPES` entry, then add operator
 * branches in dataFilter.ts and a comparator branch in dataSort.ts.
 */

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/** Semantic type for display, filtering, sorting, and export. */
export type DataType =
  | 'text'
  | 'integer'
  | 'number'
  | 'currency'
  | 'percent'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'time'
  | 'enum'
  | 'tags'
  | 'json'

/**
 * Reserved chart-binding hint — defined now so charts CAN consume typed tables
 * later (continuous axes, categorical groups, time series). Unused today.
 */
export type ChartRole = 'continuous' | 'categorical' | 'datetime' | 'boolean'

/** Synthetic column key for the 1-based row index (Excel-style #). */
export const ROW_INDEX_COLUMN_KEY = '_rowIndex'

import type { SemanticTone } from '../ui/semanticTone'

/** Spreadsheet workbook grid vs compact CMS admin dashboard grid. */
export type DataTableVariant = 'spreadsheet' | 'dashboard'

/** In-cell presentation mode for dashboard variant columns. */
export type DashboardCellDisplay =
  | 'auto'
  | 'text'
  | 'status'
  | 'tags'
  | 'chips'
  | 'boolean-switch'
  | 'text-badge'
  | 'link'
  | 'dot-text'
  | 'actions'
  | 'user'
  | 'users'

export type DataColumnAlign = 'start' | 'center' | 'end'

export interface DataColumn {
  /** Stable field key used in row `values` and exports. */
  key: string
  header: string
  dataType?: DataType
  /** Min column width (any CSS length) — defaults applied by the table. */
  minWidth?: string
  align?: DataColumnAlign
  /** Dashboard variant — how to render body cells (ignored in spreadsheet mode). */
  cellDisplay?: DashboardCellDisplay
  /** enum/status → semantic tone for `status` and `text-badge` cells. */
  toneMap?: Record<string, SemanticTone>
  /** `text-badge` — row.values key for the qualifier badge (falls back to same column value). */
  badgeKey?: string
}

export interface DataRow {
  id: string
  /** Typed payload keyed by column `key` — primary source for display + export. */
  values: Record<string, unknown>
  /** Optional rich cell overrides; falls back to formatting `values` by dataType. */
  cells?: Partial<Record<string, ReactNode>>
  /** Structured payloads used only for filtering/sorting (omitted from CSV). */
  filterValues?: Partial<Record<string, unknown>>
}

/** Optional workbook tab — switches columns + rows in [DataTable](DataTable.md). */
export interface DataTableSheet {
  id: string
  label: string
  /** Optional Lucide icon for footer sheet tab. */
  icon?: LucideIcon
  columns: DataColumn[]
  rows: DataRow[]
}

export interface DataTypeDescriptor {
  id: DataType
  label: string
  /** JSON is filterable but never meaningfully sortable in the grid. */
  sortable: boolean
  /** Future chart-binding hint (see ChartRole) — not consumed yet. */
  chartRole: ChartRole | null
  /** Human-readable cell text (empty values render an em dash). */
  formatDisplay: (value: unknown) => string
  /** Stable string for CSV export (empty values render as ''). */
  coerceCsv: (value: unknown) => string
}

function toNumberOrNull(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function looseBool(value: unknown): boolean | null {
  if (value === true || value === 'true' || value === 1 || value === '1') return true
  if (value === false || value === 'false' || value === 0 || value === '0') return false
  return null
}

function toDate(value: unknown): Date | null {
  const d = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

const JSON_DISPLAY_MAX = 160

function jsonToOneLine(value: unknown): string {
  const s = typeof value === 'string' ? value : JSON.stringify(value, null, 0)
  const oneLine = s.replace(/\s+/g, ' ').trim()
  if (!oneLine) return '—'
  return oneLine.length > JSON_DISPLAY_MAX ? `${oneLine.slice(0, JSON_DISPLAY_MAX)}…` : oneLine
}

/** Normalize tag cells — arrays or comma-separated strings. */
export function normalizeTagsValue(raw: unknown): string[] {
  if (raw === null || raw === undefined) return []
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return [String(raw).trim()].filter(Boolean)
}

export const DATA_TYPES: Record<DataType, DataTypeDescriptor> = {
  text: {
    id: 'text',
    label: 'text',
    sortable: true,
    chartRole: 'categorical',
    formatDisplay: (value) => (value === null || value === undefined ? '—' : String(value)),
    coerceCsv: (value) => (value === null || value === undefined ? '' : String(value)),
  },
  integer: {
    id: 'integer',
    label: 'integer',
    sortable: true,
    chartRole: 'continuous',
    formatDisplay: (value) => {
      const n = toNumberOrNull(value)
      return n === null ? '—' : String(Math.trunc(n))
    },
    coerceCsv: (value) => {
      const n = toNumberOrNull(value)
      return n === null ? '' : String(Math.trunc(n))
    },
  },
  number: {
    id: 'number',
    label: 'number',
    sortable: true,
    chartRole: 'continuous',
    formatDisplay: (value) => {
      const n = toNumberOrNull(value)
      return n === null ? '—' : String(n)
    },
    coerceCsv: (value) => {
      const n = toNumberOrNull(value)
      return n === null ? '' : String(n)
    },
  },
  currency: {
    id: 'currency',
    label: 'currency',
    sortable: true,
    chartRole: 'continuous',
    formatDisplay: (value) => {
      const n = toNumberOrNull(value)
      if (n === null) return '—'
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n)
    },
    coerceCsv: (value) => {
      const n = toNumberOrNull(value)
      return n === null ? '' : String(n)
    },
  },
  percent: {
    id: 'percent',
    label: 'percent',
    sortable: true,
    chartRole: 'continuous',
    formatDisplay: (value) => {
      const n = toNumberOrNull(value)
      if (n === null) return '—'
      return `${n}%`
    },
    coerceCsv: (value) => {
      const n = toNumberOrNull(value)
      return n === null ? '' : String(n)
    },
  },
  boolean: {
    id: 'boolean',
    label: 'boolean',
    sortable: true,
    chartRole: 'boolean',
    formatDisplay: (value) => {
      const b = looseBool(value)
      if (b === null) return '—'
      return b ? 'Yes' : 'No'
    },
    coerceCsv: (value) => {
      const b = looseBool(value)
      if (b === null) return ''
      return b ? 'true' : 'false'
    },
  },
  date: {
    id: 'date',
    label: 'date',
    sortable: true,
    chartRole: 'datetime',
    formatDisplay: (value) => {
      if (value === null || value === undefined) return '—'
      const d = toDate(value)
      return d ? d.toLocaleDateString() : '—'
    },
    coerceCsv: (value) => {
      if (value === null || value === undefined) return ''
      const d = toDate(value)
      return d ? d.toISOString().slice(0, 10) : String(value)
    },
  },
  datetime: {
    id: 'datetime',
    label: 'datetime',
    sortable: true,
    chartRole: 'datetime',
    formatDisplay: (value) => {
      if (value === null || value === undefined) return '—'
      const d = toDate(value)
      return d ? d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'
    },
    coerceCsv: (value) => {
      if (value === null || value === undefined) return ''
      const d = toDate(value)
      return d ? d.toISOString() : String(value)
    },
  },
  time: {
    id: 'time',
    label: 'time',
    sortable: true,
    chartRole: 'datetime',
    formatDisplay: (value) => {
      if (value === null || value === undefined) return '—'
      const s = String(value).trim()
      if (!s) return '—'
      const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s)
      if (!m) return s
      const h = Number(m[1])
      const min = Number(m[2])
      if (h > 23 || min > 59) return s
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
    },
    coerceCsv: (value) => {
      if (value === null || value === undefined) return ''
      const s = String(value).trim()
      return s
    },
  },
  enum: {
    id: 'enum',
    label: 'enum',
    sortable: true,
    chartRole: 'categorical',
    formatDisplay: (value) => (value === null || value === undefined ? '—' : String(value)),
    coerceCsv: (value) => (value === null || value === undefined ? '' : String(value)),
  },
  tags: {
    id: 'tags',
    label: 'tags',
    sortable: true,
    chartRole: 'categorical',
    formatDisplay: (value) => {
      if (value === null || value === undefined) return '—'
      const tags = normalizeTagsValue(value)
      return tags.length ? tags.join(', ') : '—'
    },
    coerceCsv: (value) => {
      if (value === null || value === undefined) return ''
      return normalizeTagsValue(value).join(', ')
    },
  },
  json: {
    id: 'json',
    label: 'json',
    sortable: false,
    chartRole: null,
    formatDisplay: (value) => {
      if (value === null || value === undefined) return '—'
      try {
        return jsonToOneLine(value)
      } catch {
        return String(value)
      }
    },
    coerceCsv: (value) => {
      if (value === null || value === undefined) return ''
      try {
        return typeof value === 'string' ? value : JSON.stringify(value)
      } catch {
        return String(value)
      }
    },
  },
}

export function resolveColumnDataType(col: { dataType?: DataType }): DataType {
  return col.dataType ?? 'text'
}

export function formatValueForDisplay(value: unknown, dataType: DataType = 'text'): string {
  return DATA_TYPES[dataType].formatDisplay(value)
}

export function coerceValueForCsv(value: unknown, dataType: DataType = 'text'): string {
  return DATA_TYPES[dataType].coerceCsv(value)
}

/** JSON columns are excluded from header sort (unstable for arbitrary payloads). */
export function columnSupportsSort(dataType: DataType | undefined): boolean {
  return DATA_TYPES[dataType ?? 'text'].sortable
}

/** Excel-style column letter (0 → A, 25 → Z, 26 → AA …). */
export function excelColumnLetter(zeroBasedColumnIndex: number): string {
  let n = zeroBasedColumnIndex + 1
  let s = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}
