/**
 * Single-column table sort: one active column at a time (asc → desc → off).
 * Comparators follow the column data type — extend `compareRawForSort` when
 * adding a new sortable type.
 */

import type { DataType } from './dataTypes'
import { normalizeTagsValue } from './dataTypes'
import type { ColumnLikeForFilter, RowLikeForFilter } from './dataFilter'
import { dataTypeForColumn, getFilterPayload, parseTimeOfDayMinutes } from './dataFilter'

export type TableSortDirection = 'asc' | 'desc'

/** At most one sorted column; direction null means unsorted. */
export interface TableSortState {
  columnKey: string | null
  direction: TableSortDirection | null
}

export const EMPTY_SORT_STATE: TableSortState = {
  columnKey: null,
  direction: null,
}

/** Click cycle: other column → asc; same asc → desc; same desc → off. */
export function toggleSortState(prev: TableSortState, columnKey: string): TableSortState {
  if (prev.columnKey !== columnKey) return { columnKey, direction: 'asc' }
  if (prev.direction === 'asc') return { columnKey, direction: 'desc' }
  return EMPTY_SORT_STATE
}

function numLoose(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function parseBoolLoose(v: unknown): boolean | null {
  if (v === true || v === 'true' || v === 1 || v === '1') return true
  if (v === false || v === 'false' || v === 0 || v === '0') return false
  return null
}

function timeMs(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.getTime()
  const s = String(v).trim()
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}

function timeOfDayMinutes(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  return parseTimeOfDayMinutes(String(raw))
}

function tagsSortKey(raw: unknown): string {
  return normalizeTagsValue(raw)
    .map((tag) => tag.toLowerCase())
    .sort()
    .join('\u0001')
}

function isSortEmpty(raw: unknown, dataType: DataType): boolean {
  if (raw === null || raw === undefined) return true
  if (typeof raw === 'string' && raw.trim() === '') return true
  if (dataType === 'integer' || dataType === 'number' || dataType === 'currency' || dataType === 'percent') {
    return numLoose(raw) === null
  }
  if (dataType === 'boolean') return parseBoolLoose(raw) === null
  if (dataType === 'date' || dataType === 'datetime') return timeMs(raw) === null
  if (dataType === 'time') return timeOfDayMinutes(raw) === null
  if (dataType === 'tags') return normalizeTagsValue(raw).length === 0
  return false
}

/**
 * Comparator for two raw cell payloads. Negative when `a` sorts before `b`
 * in ascending order; empty values always sort last.
 */
export function compareRawForSort(a: unknown, b: unknown, dataType: DataType): number {
  const ea = isSortEmpty(a, dataType)
  const eb = isSortEmpty(b, dataType)
  if (ea && eb) return 0
  if (ea) return 1
  if (eb) return -1

  switch (dataType) {
    case 'text':
    case 'enum':
      return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true })
    case 'integer':
    case 'number':
    case 'currency':
    case 'percent': {
      const na = numLoose(a)
      const nb = numLoose(b)
      if (na === null || nb === null) return 0
      return na - nb
    }
    case 'boolean': {
      const ba = parseBoolLoose(a)
      const bb = parseBoolLoose(b)
      const va = ba === true ? 1 : ba === false ? 0 : -1
      const vb = bb === true ? 1 : bb === false ? 0 : -1
      return va - vb
    }
    case 'date':
    case 'datetime': {
      const ta = timeMs(a)
      const tb = timeMs(b)
      if (ta === null || tb === null) return 0
      return ta - tb
    }
    case 'time': {
      const ta = timeOfDayMinutes(a)
      const tb = timeOfDayMinutes(b)
      if (ta === null || tb === null) return 0
      return ta - tb
    }
    case 'tags':
      return tagsSortKey(a).localeCompare(tagsSortKey(b), undefined, { sensitivity: 'base', numeric: true })
    case 'json':
      /** Sorting is disabled for JSON columns; comparator unused. */
      return 0
    default:
      return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true })
  }
}

export function sortRowsSingleColumn<T extends RowLikeForFilter>(
  rows: T[],
  column: ColumnLikeForFilter,
  direction: TableSortDirection,
): T[] {
  const dataType = dataTypeForColumn(column)
  const key = column.key
  const mul = direction === 'asc' ? 1 : -1
  const copy = [...rows]
  copy.sort((ra, rb) => mul * compareRawForSort(getFilterPayload(ra, key), getFilterPayload(rb, key), dataType))
  return copy
}
