import type { GridSelection } from '@glideapps/glide-data-grid'
import type { DataGridSheet } from './sheetModel'

const MIN_WIDTH = 52
const MAX_WIDTH = 420
const CELL_PAD = 16
const HEADER_PAD = 28

export type FitTarget = {
  columns: number[]
  rows: number[] | null
}

function rangeIndices(start: number, length: number): number[] {
  return Array.from({ length }, (_, index) => start + index)
}

export function getFitTargets(
  selection: GridSelection,
  rowCount: number,
  colCount: number,
): FitTarget | null {
  const selectedCols = selection.columns.toArray().filter((col) => col >= 0 && col < colCount)
  const selectedRows = selection.rows.toArray().filter((row) => row >= 0 && row < rowCount)
  const range = selection.current?.range

  if (selectedCols.length > 0) {
    return {
      columns: selectedCols,
      rows: range ? rangeIndices(range.y, range.height) : null,
    }
  }

  if (range && range.width > 0 && range.height > 0) {
    return {
      columns: rangeIndices(range.x, range.width).filter((col) => col < colCount),
      rows: rangeIndices(range.y, range.height).filter((row) => row < rowCount),
    }
  }

  const cell = selection.current?.cell
  if (cell) {
    const [col, row] = cell
    if (col >= 0 && col < colCount && row >= 0 && row < rowCount) {
      return { columns: [col], rows: [row] }
    }
  }

  if (selectedRows.length > 0) {
    return {
      columns: rangeIndices(0, colCount),
      rows: selectedRows,
    }
  }

  return null
}

function measureText(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontFamily: string,
  bold = false,
): number {
  ctx.font = bold ? `600 13px ${fontFamily}` : `13px ${fontFamily}`
  return ctx.measureText(text).width
}

export function fitColumnsToSelection(
  sheet: DataGridSheet,
  selection: GridSelection,
  fontFamily: string,
): DataGridSheet {
  const targets = getFitTargets(selection, sheet.rows.length, sheet.columns.length)
  if (!targets || targets.columns.length === 0) return sheet

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return sheet

  const next = {
    columns: sheet.columns.map((column) => ({ ...column })),
    rows: sheet.rows.map((row) => [...row]),
  }

  const rowsToMeasure =
    targets.rows ??
    Array.from({ length: sheet.rows.length }, (_, index) => index)

  for (const colIndex of targets.columns) {
    const column = next.columns[colIndex]
    if (!column) continue

    let maxWidth = measureText(ctx, column.title, fontFamily, true) + HEADER_PAD
    for (const rowIndex of rowsToMeasure) {
      const value = next.rows[rowIndex]?.[colIndex] ?? ''
      maxWidth = Math.max(maxWidth, measureText(ctx, value, fontFamily) + CELL_PAD)
    }

    column.width = Math.ceil(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, maxWidth)))
  }

  return next
}
