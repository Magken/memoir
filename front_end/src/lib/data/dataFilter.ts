/**
 * Per-column filter schema: data type → operators → typed param fields, plus
 * rule evaluation and row filtering. Rules within one column are AND-ed;
 * disabled rules are skipped; empty params are no-ops.
 *
 * Extend by adding operators to `OPERATORS_BY_TYPE` and matching branches in
 * `evaluateFilterRule`.
 */

import type { DataType } from './dataTypes'
import { normalizeTagsValue } from './dataTypes'

/** Row shape needed for filtering (matches DataRow). */
export interface RowLikeForFilter {
  values: Record<string, unknown>
  filterValues?: Partial<Record<string, unknown>>
}

/** Column shape needed for filter semantics (matches DataColumn). */
export interface ColumnLikeForFilter {
  key: string
  dataType?: DataType
}

/** HTML input hint for a param field — drives the filter UI control. */
export type DataFilterParamInput = 'text' | 'number' | 'date' | 'datetime-local' | 'time'

export interface DataFilterParamField {
  key: string
  label: string
  input: DataFilterParamInput
}

export interface DataFilterOperatorDefinition {
  id: string
  label: string
  params: DataFilterParamField[]
}

export interface DataFilterRule {
  ruleId: string
  operatorId: string
  params: Record<string, string>
  /** When false the rule is ignored (draft edits can stay off). Default true. */
  enabled?: boolean
}

export type DataFiltersState = Record<string, DataFilterRule[]>

export function dataTypeForColumn(col: ColumnLikeForFilter): DataType {
  return col.dataType ?? 'text'
}

/** Filter payload prefers `filterValues` (structured) then falls back to `values`. */
export function getFilterPayload(row: RowLikeForFilter, columnKey: string): unknown {
  const fv = row.filterValues
  if (fv && columnKey in fv) return fv[columnKey]
  return row.values[columnKey]
}

/* ---- shared helpers ----------------------------------------------------- */

function isEmptyValue(v: unknown): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  if (typeof v === 'object') return coerceFilterText(v).trim() === ''
  return false
}

function normalizeText(s: string): string {
  return s.trim().toLowerCase()
}

/** Plain text for text/enum filter matching — structured cells (user chips, links) → searchable label. */
export function coerceFilterText(raw: unknown): string {
  if (raw === null || raw === undefined) return ''
  if (typeof raw === 'string') return raw
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw)
  if (Array.isArray(raw)) {
    return raw
      .map((item) => coerceFilterText(item))
      .filter((part) => part.length > 0)
      .join(', ')
  }
  if (typeof raw === 'object') {
    const record = raw as Record<string, unknown>
    const parts: string[] = []
    const pushPart = (value: unknown) => {
      if (value === null || value === undefined) return
      const text = String(value).trim()
      if (!text || parts.some((part) => part.toLowerCase() === text.toLowerCase())) return
      parts.push(text)
    }
    pushPart(record.name ?? record.label ?? record.displayName ?? record.title ?? record.text)
    pushPart(record.href ?? record.url ?? record.to)
    if (parts.length > 0) return parts.join(' ')
    return stableStringifyForJsonFilter(raw)
  }
  return String(raw)
}

function parseBoolLoose(v: unknown): boolean | null {
  if (v === true || v === 'true' || v === 1 || v === '1') return true
  if (v === false || v === 'false' || v === 0 || v === '0') return false
  return null
}

function numLoose(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function timeMs(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.getTime()
  const s = String(v).trim()
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}

/**
 * Parses `<input type="datetime-local">` (no timezone) as **local** wall time.
 * Also accepts full ISO strings with `Z` / offset.
 */
export function parseDatetimeLocalInputMs(s: string): number | null {
  const t = s.trim()
  if (!t) return null
  if (t.includes('Z') || /[+-]\d{2}:\d{2}$/.test(t)) {
    const d = new Date(t)
    return Number.isNaN(d.getTime()) ? null : d.getTime()
  }
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (m) {
    const y = Number(m[1])
    const mo = Number(m[2]) - 1
    const day = Number(m[3])
    const h = Number(m[4])
    const min = Number(m[5])
    const sec = m[6] !== undefined ? Number(m[6]) : 0
    const d = new Date(y, mo, day, h, min, sec, 0)
    return Number.isNaN(d.getTime()) ? null : d.getTime()
  }
  const d = new Date(t)
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}

/** Minutes since midnight for `HH:MM` / `HH:MM:SS` / `<input type="time">` values. */
export function parseTimeOfDayMinutes(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  const sec = m[3] !== undefined ? Number(m[3]) : 0
  if (!Number.isFinite(h) || !Number.isFinite(min) || !Number.isFinite(sec)) return null
  if (h > 23 || min > 59 || sec > 59) return null
  return h * 60 + min + sec / 60
}

function timeOfDayMinutesFromCell(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  return parseTimeOfDayMinutes(String(raw))
}

function parseCsvList(raw: string): string[] {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function enumOperators(): DataFilterOperatorDefinition[] {
  return [
    { id: 'equals', label: 'Equals', params: [{ key: 'q', label: 'Value', input: 'text' }] },
    { id: 'not_equals', label: 'Does not equal', params: [{ key: 'q', label: 'Value', input: 'text' }] },
    {
      id: 'is_one_of',
      label: 'Is one of (comma-separated)',
      params: [{ key: 'q', label: 'Values', input: 'text' }],
    },
    { id: 'is_empty', label: 'Is empty', params: [] },
    { id: 'is_not_empty', label: 'Is not empty', params: [] },
  ]
}

function tagsOperators(): DataFilterOperatorDefinition[] {
  return [
    { id: 'has_tag', label: 'Has tag', params: [{ key: 'q', label: 'Tag', input: 'text' }] },
    { id: 'not_has_tag', label: 'Does not have tag', params: [{ key: 'q', label: 'Tag', input: 'text' }] },
    {
      id: 'has_any',
      label: 'Has any of (comma-separated)',
      params: [{ key: 'q', label: 'Tags', input: 'text' }],
    },
    {
      id: 'has_all',
      label: 'Has all of (comma-separated)',
      params: [{ key: 'q', label: 'Tags', input: 'text' }],
    },
    { id: 'is_empty', label: 'Is empty', params: [] },
    { id: 'is_not_empty', label: 'Is not empty', params: [] },
  ]
}

function timeOperators(): DataFilterOperatorDefinition[] {
  return [
    { id: 'before', label: 'Before', params: [{ key: 't', label: 'Time', input: 'time' }] },
    { id: 'after', label: 'After', params: [{ key: 't', label: 'Time', input: 'time' }] },
    {
      id: 'between',
      label: 'Between times',
      params: [
        { key: 'start', label: 'Start', input: 'time' },
        { key: 'end', label: 'End', input: 'time' },
      ],
    },
    { id: 'is_empty', label: 'Is empty', params: [] },
    { id: 'is_not_empty', label: 'Is not empty', params: [] },
  ]
}

/* ---- JSON helpers ------------------------------------------------------- */

/** Deterministic JSON text for filters (object keys sorted). */
export function stableStringifyForJsonFilter(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return ''
  if (typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map(stableStringifyForJsonFilter).join(',')}]`
  }
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringifyForJsonFilter(obj[k])}`).join(',')}}`
}

/** Parse JSON strings; leave non-JSON strings as-is for filtering. */
export function normalizeJsonCellValue(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  const t = raw.trim()
  if (!t) return null
  try {
    return JSON.parse(t) as unknown
  } catch {
    return raw
  }
}

function jsonIsEmpty(normalized: unknown): boolean {
  if (normalized === null || normalized === undefined) return true
  if (typeof normalized === 'string') return normalized.trim() === ''
  if (Array.isArray(normalized)) return normalized.length === 0
  if (typeof normalized === 'object') return Object.keys(normalized as object).length === 0
  return false
}

function jsonSearchText(normalized: unknown): string {
  return normalizeText(stableStringifyForJsonFilter(normalized))
}

function jsonListIndexContains(normalized: unknown, indexOneBased: number, valueNeedle: string): boolean {
  if (!Array.isArray(normalized)) return false
  if (!Number.isFinite(indexOneBased) || indexOneBased < 1) return false
  const i = Math.floor(indexOneBased) - 1
  if (i < 0 || i >= normalized.length) return false
  const el = normalized[i]
  const hay =
    el !== null && el !== undefined && typeof el === 'object'
      ? jsonSearchText(el)
      : normalizeText(String(el ?? ''))
  const needle = normalizeText(valueNeedle ?? '')
  if (!needle) return true
  return hay.includes(needle)
}

function jsonHasDeepKeyValue(node: unknown, keyNeedle: string, valueNeedle: string): boolean {
  if (node === null || node === undefined) return false
  if (Array.isArray(node)) {
    return node.some((item) => jsonHasDeepKeyValue(item, keyNeedle, valueNeedle))
  }
  if (typeof node !== 'object') return false
  const obj = node as Record<string, unknown>
  for (const [k, v] of Object.entries(obj)) {
    if (normalizeText(k).includes(keyNeedle)) {
      if (!valueNeedle) return true
      const valText = normalizeText(stableStringifyForJsonFilter(v))
      if (valText.includes(valueNeedle)) return true
    }
    if (jsonHasDeepKeyValue(v, keyNeedle, valueNeedle)) return true
  }
  return false
}

/* ---- operator catalog --------------------------------------------------- */

const OPERATORS_BY_TYPE: Record<DataType, DataFilterOperatorDefinition[]> = {
  text: [
    { id: 'contains', label: 'Contains', params: [{ key: 'q', label: 'Text', input: 'text' }] },
    { id: 'not_contains', label: 'Does not contain', params: [{ key: 'q', label: 'Text', input: 'text' }] },
    { id: 'equals', label: 'Equals', params: [{ key: 'q', label: 'Text', input: 'text' }] },
    { id: 'not_equals', label: 'Does not equal', params: [{ key: 'q', label: 'Text', input: 'text' }] },
    { id: 'starts_with', label: 'Starts with', params: [{ key: 'q', label: 'Text', input: 'text' }] },
    { id: 'ends_with', label: 'Ends with', params: [{ key: 'q', label: 'Text', input: 'text' }] },
    { id: 'is_empty', label: 'Is empty', params: [] },
    { id: 'is_not_empty', label: 'Is not empty', params: [] },
  ],
  integer: numberOperators(),
  number: numberOperators(),
  currency: numberOperators(),
  percent: numberOperators(),
  boolean: [
    { id: 'is_true', label: 'Is yes / true', params: [] },
    { id: 'is_false', label: 'Is no / false', params: [] },
  ],
  date: [
    { id: 'on_or_before', label: 'On or before', params: [{ key: 'd', label: 'Date', input: 'date' }] },
    { id: 'on_or_after', label: 'On or after', params: [{ key: 'd', label: 'Date', input: 'date' }] },
    {
      id: 'between',
      label: 'Between dates',
      params: [
        { key: 'start', label: 'Start', input: 'date' },
        { key: 'end', label: 'End', input: 'date' },
      ],
    },
    { id: 'is_empty', label: 'Is empty', params: [] },
    { id: 'is_not_empty', label: 'Is not empty', params: [] },
  ],
  datetime: [
    { id: 'before', label: 'Before', params: [{ key: 'd', label: 'Date & time (local)', input: 'datetime-local' }] },
    { id: 'after', label: 'After', params: [{ key: 'd', label: 'Date & time (local)', input: 'datetime-local' }] },
    {
      id: 'between',
      label: 'Between (date & time)',
      params: [
        { key: 'start', label: 'Start (local)', input: 'datetime-local' },
        { key: 'end', label: 'End (local)', input: 'datetime-local' },
      ],
    },
    { id: 'is_empty', label: 'Is empty', params: [] },
    { id: 'is_not_empty', label: 'Is not empty', params: [] },
  ],
  time: timeOperators(),
  enum: enumOperators(),
  tags: tagsOperators(),
  json: [
    { id: 'contains', label: 'JSON text contains', params: [{ key: 'q', label: 'Substring', input: 'text' }] },
    { id: 'not_contains', label: 'JSON text does not contain', params: [{ key: 'q', label: 'Substring', input: 'text' }] },
    {
      id: 'has_key_value_deep',
      label: 'Has key/value pair (deep)',
      params: [
        { key: 'key', label: 'Key contains', input: 'text' },
        { key: 'value', label: 'Value contains (optional)', input: 'text' },
      ],
    },
    {
      id: 'list_index_contains',
      label: 'List index contains (1-based)',
      params: [
        { key: 'index', label: 'Index (1 = first item)', input: 'number' },
        { key: 'value', label: 'Value contains', input: 'text' },
      ],
    },
    { id: 'equals', label: 'Equals (parsed JSON or raw text)', params: [{ key: 'q', label: 'Value', input: 'text' }] },
    { id: 'not_equals', label: 'Does not equal', params: [{ key: 'q', label: 'Value', input: 'text' }] },
    { id: 'is_empty', label: 'Is empty', params: [] },
    { id: 'is_not_empty', label: 'Is not empty', params: [] },
  ],
}

function numberOperators(): DataFilterOperatorDefinition[] {
  return [
    { id: 'eq', label: 'Equals', params: [{ key: 'n', label: 'Number', input: 'number' }] },
    { id: 'neq', label: 'Does not equal', params: [{ key: 'n', label: 'Number', input: 'number' }] },
    { id: 'gt', label: 'Greater than', params: [{ key: 'n', label: 'Number', input: 'number' }] },
    { id: 'gte', label: 'Greater or equal', params: [{ key: 'n', label: 'Number', input: 'number' }] },
    { id: 'lt', label: 'Less than', params: [{ key: 'n', label: 'Number', input: 'number' }] },
    { id: 'lte', label: 'Less or equal', params: [{ key: 'n', label: 'Number', input: 'number' }] },
    {
      id: 'between',
      label: 'Between',
      params: [
        { key: 'min', label: 'Min', input: 'number' },
        { key: 'max', label: 'Max', input: 'number' },
      ],
    },
    { id: 'is_empty', label: 'Is empty', params: [] },
    { id: 'is_not_empty', label: 'Is not empty', params: [] },
  ]
}

export function listOperatorsForType(t: DataType): DataFilterOperatorDefinition[] {
  return OPERATORS_BY_TYPE[t] ?? OPERATORS_BY_TYPE.text
}

export function defaultParamsForOperator(op: DataFilterOperatorDefinition): Record<string, string> {
  const out: Record<string, string> = {}
  for (const p of op.params) out[p.key] = ''
  return out
}

/* ---- evaluation --------------------------------------------------------- */

export function evaluateFilterRule(dataType: DataType, rule: DataFilterRule, raw: unknown): boolean {
  const { operatorId, params } = rule

  switch (dataType) {
    case 'text': {
      const s = coerceFilterText(raw)
      switch (operatorId) {
        case 'contains':
          return normalizeText(s).includes(normalizeText(params.q ?? ''))
        case 'not_contains':
          return !normalizeText(s).includes(normalizeText(params.q ?? ''))
        case 'equals':
          return normalizeText(s) === normalizeText(params.q ?? '')
        case 'not_equals':
          return normalizeText(s) !== normalizeText(params.q ?? '')
        case 'starts_with':
          return normalizeText(s).startsWith(normalizeText(params.q ?? ''))
        case 'ends_with':
          return normalizeText(s).endsWith(normalizeText(params.q ?? ''))
        case 'is_empty':
          return isEmptyValue(raw)
        case 'is_not_empty':
          return !isEmptyValue(raw)
        default:
          return true
      }
    }
    case 'integer':
    case 'number':
    case 'currency':
    case 'percent': {
      const n = numLoose(raw)
      switch (operatorId) {
        case 'eq':
          return n !== null && n === Number(params.n)
        case 'neq':
          return n !== null && n !== Number(params.n)
        case 'gt':
          return n !== null && n > Number(params.n)
        case 'gte':
          return n !== null && n >= Number(params.n)
        case 'lt':
          return n !== null && n < Number(params.n)
        case 'lte':
          return n !== null && n <= Number(params.n)
        case 'between': {
          const lo = Number(params.min)
          const hi = Number(params.max)
          if (n === null || !Number.isFinite(lo) || !Number.isFinite(hi)) return false
          return n >= Math.min(lo, hi) && n <= Math.max(lo, hi)
        }
        case 'is_empty':
          return n === null && (raw === null || raw === undefined || raw === '')
        case 'is_not_empty':
          return n !== null
        default:
          return true
      }
    }
    case 'boolean': {
      const b = parseBoolLoose(raw)
      if (operatorId === 'is_true') return b === true
      if (operatorId === 'is_false') return b === false
      return true
    }
    case 'date': {
      const t = timeMs(raw)
      switch (operatorId) {
        case 'on_or_before': {
          const lim = params.d ? new Date(params.d + 'T23:59:59.999').getTime() : null
          if (t === null || lim === null) return false
          return t <= lim
        }
        case 'on_or_after': {
          const lim = params.d ? new Date(params.d + 'T00:00:00').getTime() : null
          if (t === null || lim === null) return false
          return t >= lim
        }
        case 'between': {
          const a = params.start ? new Date(params.start + 'T00:00:00').getTime() : null
          const b = params.end ? new Date(params.end + 'T23:59:59.999').getTime() : null
          if (t === null || a === null || b === null) return false
          return t >= Math.min(a, b) && t <= Math.max(a, b)
        }
        case 'is_empty':
          return t === null
        case 'is_not_empty':
          return t !== null
        default:
          return true
      }
    }
    case 'datetime': {
      const t = timeMs(raw)
      switch (operatorId) {
        case 'before': {
          const lim = parseDatetimeLocalInputMs(params.d ?? '')
          if (t === null || lim === null) return false
          return t < lim
        }
        case 'after': {
          const lim = parseDatetimeLocalInputMs(params.d ?? '')
          if (t === null || lim === null) return false
          return t > lim
        }
        case 'between': {
          const a = parseDatetimeLocalInputMs(params.start ?? '')
          const b = parseDatetimeLocalInputMs(params.end ?? '')
          if (t === null || a === null || b === null) return false
          return t >= Math.min(a, b) && t <= Math.max(a, b)
        }
        case 'is_empty':
          return t === null
        case 'is_not_empty':
          return t !== null
        default:
          return true
      }
    }
    case 'time': {
      const mins = timeOfDayMinutesFromCell(raw)
      switch (operatorId) {
        case 'before': {
          const lim = parseTimeOfDayMinutes(params.t ?? '')
          if (mins === null || lim === null) return false
          return mins < lim
        }
        case 'after': {
          const lim = parseTimeOfDayMinutes(params.t ?? '')
          if (mins === null || lim === null) return false
          return mins > lim
        }
        case 'between': {
          const a = parseTimeOfDayMinutes(params.start ?? '')
          const b = parseTimeOfDayMinutes(params.end ?? '')
          if (mins === null || a === null || b === null) return false
          return mins >= Math.min(a, b) && mins <= Math.max(a, b)
        }
        case 'is_empty':
          return mins === null
        case 'is_not_empty':
          return mins !== null
        default:
          return true
      }
    }
    case 'enum': {
      const s = coerceFilterText(raw)
      switch (operatorId) {
        case 'equals':
          return normalizeText(s) === normalizeText(params.q ?? '')
        case 'not_equals':
          return normalizeText(s) !== normalizeText(params.q ?? '')
        case 'is_one_of': {
          const options = parseCsvList(params.q ?? '').map(normalizeText)
          if (!options.length) return true
          return options.includes(normalizeText(s))
        }
        case 'is_empty':
          return isEmptyValue(raw)
        case 'is_not_empty':
          return !isEmptyValue(raw)
        default:
          return true
      }
    }
    case 'tags': {
      const tags = normalizeTagsValue(raw).map(normalizeText)
      switch (operatorId) {
        case 'has_tag': {
          const needle = normalizeText(params.q ?? '')
          if (!needle) return true
          return tags.includes(needle)
        }
        case 'not_has_tag': {
          const needle = normalizeText(params.q ?? '')
          if (!needle) return true
          return !tags.includes(needle)
        }
        case 'has_any': {
          const needles = parseCsvList(params.q ?? '').map(normalizeText)
          if (!needles.length) return true
          return needles.some((needle) => tags.includes(needle))
        }
        case 'has_all': {
          const needles = parseCsvList(params.q ?? '').map(normalizeText)
          if (!needles.length) return true
          return needles.every((needle) => tags.includes(needle))
        }
        case 'is_empty':
          return tags.length === 0
        case 'is_not_empty':
          return tags.length > 0
        default:
          return true
      }
    }
    case 'json': {
      const normalized = normalizeJsonCellValue(raw)
      const hay = jsonSearchText(normalized)
      switch (operatorId) {
        case 'contains':
          return hay.includes(normalizeText(params.q ?? ''))
        case 'not_contains':
          return !hay.includes(normalizeText(params.q ?? ''))
        case 'has_key_value_deep': {
          const keyNeedle = normalizeText(params.key ?? '')
          if (!keyNeedle) return true
          const valueNeedle = normalizeText(params.value ?? '')
          return jsonHasDeepKeyValue(normalized, keyNeedle, valueNeedle)
        }
        case 'list_index_contains': {
          const indexOneBased = parseInt(String(params.index ?? '').trim(), 10)
          if (!Number.isFinite(indexOneBased) || indexOneBased < 1) return false
          return jsonListIndexContains(normalized, indexOneBased, params.value ?? '')
        }
        case 'equals': {
          const q = (params.q ?? '').trim()
          if (!q) return jsonIsEmpty(normalized)
          try {
            const parsed = JSON.parse(q) as unknown
            return stableStringifyForJsonFilter(normalized) === stableStringifyForJsonFilter(parsed)
          } catch {
            return hay === normalizeText(q)
          }
        }
        case 'not_equals': {
          const q = (params.q ?? '').trim()
          if (!q) return !jsonIsEmpty(normalized)
          try {
            const parsed = JSON.parse(q) as unknown
            return stableStringifyForJsonFilter(normalized) !== stableStringifyForJsonFilter(parsed)
          } catch {
            return hay !== normalizeText(q)
          }
        }
        case 'is_empty':
          return jsonIsEmpty(normalized)
        case 'is_not_empty':
          return !jsonIsEmpty(normalized)
        default:
          return true
      }
    }
    default:
      return true
  }
}

/* ---- rule sets + row filtering ------------------------------------------ */

/** Rules that participate in filtering (enabled !== false). */
export function activeFilterRules(rules: DataFilterRule[]): DataFilterRule[] {
  return rules.filter((r) => r.enabled !== false)
}

/** Rules saved on the column but toggled off (enabled === false). */
export function inactiveFilterRules(rules: DataFilterRule[]): DataFilterRule[] {
  return rules.filter((r) => r.enabled === false)
}

/** Rules within one column are AND-ed (disabled rules skipped). */
export function columnRulesPass(dataType: DataType, rules: DataFilterRule[], raw: unknown): boolean {
  const active = activeFilterRules(rules)
  if (active.length === 0) return true
  return active.every((r) => evaluateFilterRule(dataType, r, raw))
}

export function filterRowsByColumnState<T extends RowLikeForFilter>(
  rows: T[],
  columns: ColumnLikeForFilter[],
  filters: DataFiltersState,
): T[] {
  const colByKey = new Map(columns.map((c) => [c.key, c]))
  return rows.filter((row) => {
    for (const [colKey, rules] of Object.entries(filters)) {
      if (!rules?.length) continue
      const col = colByKey.get(colKey)
      if (!col) continue
      const dataType = dataTypeForColumn(col)
      const raw = getFilterPayload(row, colKey)
      if (!columnRulesPass(dataType, rules, raw)) return false
    }
    return true
  })
}

/* ---- counts ------------------------------------------------------------- */

export function countActiveFilters(filters: DataFiltersState): number {
  let n = 0
  for (const rules of Object.values(filters)) {
    if (!rules?.length) continue
    n += activeFilterRules(rules).length
  }
  return n
}

export function countInactiveFilters(filters: DataFiltersState): number {
  let n = 0
  for (const rules of Object.values(filters)) {
    if (!rules?.length) continue
    n += inactiveFilterRules(rules).length
  }
  return n
}

export function countAllFilterRules(filters: DataFiltersState): number {
  let n = 0
  for (const rules of Object.values(filters)) {
    if (!rules?.length) continue
    n += rules.length
  }
  return n
}

export function countActiveFiltersForColumn(filters: DataFiltersState, columnKey: string): number {
  const rules = filters[columnKey]
  if (!rules?.length) return 0
  return activeFilterRules(rules).length
}

export function countInactiveFiltersForColumn(filters: DataFiltersState, columnKey: string): number {
  const rules = filters[columnKey]
  if (!rules?.length) return 0
  return inactiveFilterRules(rules).length
}

export function createRuleId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
