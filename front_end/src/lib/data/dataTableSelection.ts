/**
 * DataTable selection helpers — cell / row / column keys, shift ranges, and
 * scoped export payloads.
 */

import type { DataColumn, DataRow } from './dataTypes'
import { ROW_INDEX_COLUMN_KEY, resolveColumnDataType } from './dataTypes'
import {
  buildTableCsv,
  buildTypedTableJson,
  type ExportTypedRow,
  type ExportValueRow,
  type TypedTableExportPayload,
} from './dataTableExport'
import { coerceValueForCsv } from './dataTypes'
import type { DataType } from './dataTypes'

export type TableCellKey = `${string}:${string}`

export function toCellKey(rowId: string, colKey: string): TableCellKey {
  return `${rowId}:${colKey}`
}

export function parseCellKey(key: TableCellKey): { rowId: string; colKey: string } {
  const split = key.indexOf(':')
  return { rowId: key.slice(0, split), colKey: key.slice(split + 1) }
}

export function isSelectableDataColumn(col: DataColumn): boolean {
  return col.key !== ROW_INDEX_COLUMN_KEY
}

export function selectableColumns(columns: DataColumn[]): DataColumn[] {
  return columns.filter(isSelectableDataColumn)
}

export function rowIndexInList(rows: DataRow[], rowId: string): number {
  return rows.findIndex((r) => r.id === rowId)
}

export function columnIndexInList(columns: DataColumn[], colKey: string): number {
  return columns.findIndex((c) => c.key === colKey)
}

/** Inclusive rectangular cell range between two anchors. */
export function cellKeysInRange(
  rows: DataRow[],
  columns: DataColumn[],
  anchor: { rowId: string; colKey: string },
  target: { rowId: string; colKey: string },
): TableCellKey[] {
  const dataCols = selectableColumns(columns)
  const rowIds = rows.map((r) => r.id)
  const colKeys = dataCols.map((c) => c.key)
  const r0 = rowIds.indexOf(anchor.rowId)
  const r1 = rowIds.indexOf(target.rowId)
  const c0 = colKeys.indexOf(anchor.colKey)
  const c1 = colKeys.indexOf(target.colKey)
  if (r0 < 0 || r1 < 0 || c0 < 0 || c1 < 0) return [toCellKey(target.rowId, target.colKey)]

  const rMin = Math.min(r0, r1)
  const rMax = Math.max(r0, r1)
  const cMin = Math.min(c0, c1)
  const cMax = Math.max(c0, c1)
  const keys: TableCellKey[] = []
  for (let ri = rMin; ri <= rMax; ri += 1) {
    for (let ci = cMin; ci <= cMax; ci += 1) {
      keys.push(toCellKey(rowIds[ri], colKeys[ci]))
    }
  }
  return keys
}

/** Inclusive row-id range for shift-select on checkboxes. */
export function rowIdsInRange(rows: DataRow[], anchorRowId: string, targetRowId: string): string[] {
  const ids = rows.map((r) => r.id)
  const a = ids.indexOf(anchorRowId)
  const b = ids.indexOf(targetRowId)
  if (a < 0 || b < 0) return [targetRowId]
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  return ids.slice(lo, hi + 1)
}

/** Inclusive column-key range for ctrl/shift header selection. */
export function columnKeysInRange(
  columns: DataColumn[],
  anchorColKey: string,
  targetColKey: string,
): string[] {
  const dataCols = selectableColumns(columns)
  const keys = dataCols.map((c) => c.key)
  const a = keys.indexOf(anchorColKey)
  const b = keys.indexOf(targetColKey)
  if (a < 0 || b < 0) return [targetColKey]
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  return keys.slice(lo, hi + 1)
}

export type TableSelectionSummary = {
  cells: number
  rows: number
  columns: number
  label: string
}

export function summarizeTableSelection(input: {
  selectedCellKeys: Set<TableCellKey>
  selectedRowIds: Set<string>
  selectedColumnKeys: Set<string>
  visibleRowCount: number
}): TableSelectionSummary {
  const cells = input.selectedCellKeys.size
  const rows = input.selectedRowIds.size
  const columns = input.selectedColumnKeys.size
  const parts: string[] = []
  if (cells > 0) parts.push(`${cells} cell${cells === 1 ? '' : 's'}`)
  if (rows > 0) parts.push(`${rows} row${rows === 1 ? '' : 's'}`)
  if (columns > 0) parts.push(`${columns} column${columns === 1 ? '' : 's'}`)
  const label =
    parts.length > 0 ? parts.join(' · ') : `${input.visibleRowCount} visible row${input.visibleRowCount === 1 ? '' : 's'}`
  return { cells, rows, columns, label }
}

export interface CellSelectionExportPayload {
  tableKey: string
  version: 1
  selection: 'cells'
  cells: Array<{
    rowId: string
    columnKey: string
    header: string
    dataType: DataType
    value: unknown
  }>
}

export function buildCellSelectionJson(
  tableKey: string,
  columns: DataColumn[],
  rows: DataRow[],
  cellKeys: Set<TableCellKey>,
): CellSelectionExportPayload {
  const colByKey = new Map(columns.map((c) => [c.key, c]))
  const rowById = new Map(rows.map((r) => [r.id, r]))
  const cells = [...cellKeys].flatMap((key) => {
    const { rowId, colKey } = parseCellKey(key)
    const col = colByKey.get(colKey)
    const row = rowById.get(rowId)
    if (!col || !row) return []
    return [
      {
        rowId,
        columnKey: colKey,
        header: col.header,
        dataType: resolveColumnDataType(col),
        value: row.values[colKey],
      },
    ]
  })
  return { tableKey, version: 1, selection: 'cells', cells }
}

export function buildCellSelectionCsv(
  columns: DataColumn[],
  rows: DataRow[],
  cellKeys: Set<TableCellKey>,
): string {
  const entries = [...cellKeys]
    .map((key) => {
      const { rowId, colKey } = parseCellKey(key)
      const col = columns.find((c) => c.key === colKey)
      const row = rows.find((r) => r.id === rowId)
      if (!col || !row) return null
      return {
        rowId,
        colKey,
        header: col.header,
        dataType: resolveColumnDataType(col),
        value: row.values[colKey],
      }
    })
    .filter(Boolean) as Array<{
    rowId: string
    colKey: string
    header: string
    dataType: DataType
    value: unknown
  }>

  const header = 'rowId,columnKey,header,dataType,value'
  const lines = entries.map((e) =>
    [
      e.rowId,
      e.colKey,
      e.header,
      e.dataType,
      coerceValueForCsv(e.value, e.dataType),
    ]
      .map((v) => {
        const s = String(v)
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      })
      .join(','),
  )
  return [header, ...lines].join('\r\n')
}

export function resolveExportScope(input: {
  displayedRows: DataRow[]
  displayColumns: DataColumn[]
  userColumns: DataColumn[]
  selectedCellKeys: Set<TableCellKey>
  selectedRowIds: Set<string>
  selectedColumnKeys: Set<string>
}): {
  mode: 'cells' | 'rows' | 'columns' | 'all'
  rows: DataRow[]
  columns: DataColumn[]
} {
  const { displayedRows, displayColumns, selectedCellKeys, selectedRowIds, selectedColumnKeys } = input

  if (selectedCellKeys.size > 0) {
    return { mode: 'cells', rows: displayedRows, columns: displayColumns }
  }

  const rowFiltered =
    selectedRowIds.size > 0 ? displayedRows.filter((r) => selectedRowIds.has(r.id)) : displayedRows

  if (selectedColumnKeys.size > 0) {
    const cols = displayColumns.filter(
      (c) => c.key === ROW_INDEX_COLUMN_KEY || selectedColumnKeys.has(c.key),
    )
    return { mode: 'columns', rows: rowFiltered, columns: cols }
  }

  if (selectedRowIds.size > 0) {
    return { mode: 'rows', rows: rowFiltered, columns: displayColumns }
  }

  return { mode: 'all', rows: displayedRows, columns: displayColumns }
}

export function buildScopedTableCsv(
  columns: DataColumn[],
  rows: ExportValueRow[],
  options?: { includeTypeRow?: boolean },
): string {
  return buildTableCsv(columns, rows, options)
}

export function buildScopedTableJson(
  tableKey: string,
  columns: DataColumn[],
  userColumns: DataColumn[],
  rows: ExportTypedRow[],
): TypedTableExportPayload {
  return buildTypedTableJson(tableKey, columns, userColumns, rows)
}

type ScrollDataTableCellIntoViewOptions = {
  /** Sticky header element inside the scroll viewport (defaults to `thead`). */
  stickyHeader?: HTMLElement | null
  /** Inset so inset ring / border stays visible against viewport edges. */
  edgeInset?: number
  behavior?: ScrollBehavior
  /** Which axes to scroll — expanded cells typically need horizontal only. */
  axis?: 'both' | 'horizontal' | 'vertical'
}

/** Scroll a body cell fully into view inside the table ThemeScroll viewport. */
export function scrollDataTableCellIntoView(
  viewport: HTMLElement,
  cell: HTMLElement,
  options: ScrollDataTableCellIntoViewOptions = {},
): void {
  const { stickyHeader = viewport.querySelector('thead'), edgeInset = 2, behavior = 'smooth', axis = 'both' } =
    options

  const measureEl =
    cell.querySelector<HTMLElement>('.theme-data-table__cell-host--expanded') ??
    cell.querySelector<HTMLElement>('.theme-data-table__cell-scroll') ??
    cell

  const viewportRect = viewport.getBoundingClientRect()
  const cellRect = measureEl.getBoundingClientRect()
  const headerBottom = stickyHeader?.getBoundingClientRect().bottom ?? viewportRect.top

  let scrollLeft = viewport.scrollLeft
  let scrollTop = viewport.scrollTop

  if (axis === 'both' || axis === 'horizontal') {
    const viewportInnerWidth = viewportRect.width - edgeInset * 2
    if (axis === 'horizontal' && cellRect.width <= viewportInnerWidth) {
      scrollLeft += cellRect.left - viewportRect.left - (viewportRect.width - cellRect.width) / 2
    } else if (cellRect.left < viewportRect.left + edgeInset) {
      scrollLeft += cellRect.left - viewportRect.left - edgeInset
    } else if (cellRect.right > viewportRect.right - edgeInset) {
      scrollLeft += cellRect.right - viewportRect.right + edgeInset
    }
  }

  if (axis === 'both' || axis === 'vertical') {
    if (cellRect.top < headerBottom + edgeInset) {
      scrollTop += cellRect.top - headerBottom - edgeInset
    } else if (cellRect.bottom > viewportRect.bottom - edgeInset) {
      scrollTop += cellRect.bottom - viewportRect.bottom + edgeInset
    }
  }

  if (scrollLeft === viewport.scrollLeft && scrollTop === viewport.scrollTop) return

  viewport.scrollTo({ left: scrollLeft, top: scrollTop, behavior })
}
