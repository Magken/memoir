import type { GridSelection } from '@glideapps/glide-data-grid'

export function selectionSummary(selection: GridSelection | undefined): string {
  if (!selection) return 'No selection'

  const selectedRows = selection.rows.toArray()
  if (selectedRows.length > 0) {
    return selectedRows.length === 1
      ? `Row ${selectedRows[0] + 1}`
      : `${selectedRows.length} rows`
  }

  const selectedCols = selection.columns.toArray()
  if (selectedCols.length > 0) {
    return selectedCols.length === 1
      ? `Column ${selectedCols[0] + 1}`
      : `${selectedCols.length} columns`
  }

  const range = selection.current?.range
  if (range) {
    const cells = range.width * range.height
    if (cells === 1) {
      return `Cell ${columnLabel(range.x)}${range.y + 1}`
    }
    return `${cells} cells`
  }

  return 'No selection'
}

function columnLabel(index: number): string {
  let n = index
  let label = ''
  do {
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return label
}
