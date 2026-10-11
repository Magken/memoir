export type DataGridColumnDef = {
  id: string
  title: string
  width: number
}

export type DataGridSheet = {
  columns: DataGridColumnDef[]
  rows: string[][]
}

export function cloneSheet(sheet: DataGridSheet): DataGridSheet {
  return {
    columns: sheet.columns.map((column) => ({ ...column })),
    rows: sheet.rows.map((row) => [...row]),
  }
}

export function normalizeSheet(sheet: DataGridSheet): DataGridSheet {
  const colCount = sheet.columns.length
  return {
    columns: sheet.columns.map((column) => ({ ...column })),
    rows: sheet.rows.map((row) => {
      const next = row.slice(0, colCount)
      while (next.length < colCount) next.push('')
      return next
    }),
  }
}

export function ensureRowCount(sheet: DataGridSheet, count: number): void {
  while (sheet.rows.length < count) {
    sheet.rows.push(Array.from({ length: sheet.columns.length }, () => ''))
  }
}

export function setCell(sheet: DataGridSheet, col: number, row: number, value: string): void {
  ensureRowCount(sheet, row + 1)
  sheet.rows[row][col] = value
}

export function addRow(sheet: DataGridSheet): void {
  sheet.rows.push(Array.from({ length: sheet.columns.length }, () => ''))
}

export function addColumn(sheet: DataGridSheet, title?: string): void {
  const index = sheet.columns.length + 1
  const id = `col-${index}`
  sheet.columns.push({
    id,
    title: title ?? `Column ${index}`,
    width: 120,
  })
  for (const row of sheet.rows) {
    row.push('')
  }
}

export function deleteRowsAt(sheet: DataGridSheet, rowIndices: readonly number[]): void {
  const sorted = [...rowIndices].sort((a, b) => b - a)
  for (const index of sorted) {
    if (index >= 0 && index < sheet.rows.length) {
      sheet.rows.splice(index, 1)
    }
  }
  if (sheet.rows.length === 0) addRow(sheet)
}

export function clearRange(
  sheet: DataGridSheet,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  for (let row = y; row < y + height; row += 1) {
    for (let col = x; col < x + width; col += 1) {
      if (col < sheet.columns.length) setCell(sheet, col, row, '')
    }
  }
}

export function sheetFingerprint(sheet: DataGridSheet): string {
  return JSON.stringify(normalizeSheet(sheet))
}
