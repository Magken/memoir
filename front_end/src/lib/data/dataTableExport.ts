/**
 * Typed export for tables — CSV (with optional data-type row) and a typed JSON
 * bundle for downstream analysis / charting tools. Pure builders; the caller
 * owns selection and triggering the download.
 */

import type { DataColumn } from './dataTypes'
import {
  ROW_INDEX_COLUMN_KEY,
  coerceValueForCsv,
  excelColumnLetter,
  resolveColumnDataType,
} from './dataTypes'
import type { DataType } from './dataTypes'

/** Typed export bundle (version 1). */
export interface TypedTableExportPayload {
  tableKey: string
  version: 1
  columns: Array<{
    key: string
    header: string
    dataType: DataType
    columnLetter?: string
  }>
  rows: Array<{
    rowIndex: number
    rowId: string
    values: Record<string, unknown>
  }>
}

/** Row passed to the CSV builder — already merged with any synthetic columns. */
export interface ExportValueRow {
  values: Record<string, unknown>
}

/** Row passed to the typed-JSON builder. */
export interface ExportTypedRow {
  rowId: string
  rowIndex: number
  values: Record<string, unknown>
}

export function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

/** Excel column letter for a user column (skips the synthetic row-index column). */
export function letterForColumn(col: DataColumn, userColumns: DataColumn[]): string {
  if (col.key === ROW_INDEX_COLUMN_KEY) return ''
  const i = userColumns.findIndex((c) => c.key === col.key)
  return i >= 0 ? excelColumnLetter(i) : ''
}

export function buildTableCsv(
  columns: DataColumn[],
  rows: ExportValueRow[],
  options?: { includeTypeRow?: boolean },
): string {
  const includeTypeRow = options?.includeTypeRow ?? true
  const headerLine = columns.map((c) => escapeCsvCell(c.header)).join(',')
  const typeLine = includeTypeRow
    ? columns.map((c) => escapeCsvCell(resolveColumnDataType(c))).join(',')
    : null
  const lines = rows.map((row) =>
    columns
      .map((col) => escapeCsvCell(coerceValueForCsv(row.values[col.key], resolveColumnDataType(col))))
      .join(','),
  )
  return [headerLine, ...(typeLine ? [typeLine] : []), ...lines].join('\r\n')
}

export function buildTypedTableJson(
  tableKey: string,
  columns: DataColumn[],
  userColumns: DataColumn[],
  rows: ExportTypedRow[],
): TypedTableExportPayload {
  return {
    tableKey,
    version: 1,
    columns: columns.map((c) => ({
      key: c.key,
      header: c.header,
      dataType: resolveColumnDataType(c),
      columnLetter: c.key === ROW_INDEX_COLUMN_KEY ? undefined : letterForColumn(c, userColumns),
    })),
    rows: rows.map((r) => ({ rowIndex: r.rowIndex, rowId: r.rowId, values: r.values })),
  }
}

/** Triggers a client-side file download (CSV gets a UTF-8 BOM for Excel). */
export function triggerTableDownload(filename: string, content: string, mime: string): void {
  if (typeof document === 'undefined') return
  const body = mime.includes('csv') ? `\ufeff${content}` : content
  const url = URL.createObjectURL(new Blob([body], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
