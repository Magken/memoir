/**
 * DataTable cell presentation — typography cues per semantic type and expanded
 * text for focus/expand popovers.
 */

import type { DataType } from './dataTypes'
import { formatValueForDisplay } from './dataTypes'

/** Tailwind + scoped host classes for typed cell values. */
export function cellTypographyClass(dataType: DataType): string {
  switch (dataType) {
    case 'integer':
    case 'number':
    case 'currency':
    case 'percent':
      return 'theme-data-table__cell-val theme-data-table__cell-val--numeric type-mono type-tabular'
    case 'date':
    case 'datetime':
    case 'time':
      return 'theme-data-table__cell-val theme-data-table__cell-val--temporal type-mono type-tabular type-caption'
    case 'json':
      return 'theme-data-table__cell-val theme-data-table__cell-val--json type-code'
    case 'boolean':
      return 'theme-data-table__cell-val theme-data-table__cell-val--bool type-body-sm'
    case 'tags':
      return 'theme-data-table__cell-val theme-data-table__cell-val--tags type-body-sm'
    case 'enum':
      return 'theme-data-table__cell-val theme-data-table__cell-val--enum type-body-sm'
    default:
      return 'theme-data-table__cell-val theme-data-table__cell-val--text type-body-sm'
  }
}

/** Full cell text when expanded (pretty JSON, no display truncation). */
export function formatCellExpandedValue(value: unknown, dataType: DataType): string {
  if (value === null || value === undefined) return '—'
  if (dataType === 'json') {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value
      return JSON.stringify(parsed, null, 2)
    } catch {
      return String(value)
    }
  }
  if (dataType === 'tags' && Array.isArray(value)) {
    return value.map(String).join('\n')
  }
  return formatValueForDisplay(value, dataType)
}
