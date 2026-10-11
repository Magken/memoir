import type { DataGridSheet } from './sheetModel'
import { normalizeSheet } from './sheetModel'

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }
    current += char
  }
  cells.push(current)
  return cells
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function parseCsv(text: string): DataGridSheet {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  if (lines.length === 0) {
    return normalizeSheet({ columns: [{ id: 'col-1', title: 'Column 1', width: 120 }], rows: [['']] })
  }

  const parsed = lines.map(parseCsvLine)
  const header = parsed[0]
  const body = parsed.slice(1)
  const colCount = Math.max(header.length, ...body.map((row) => row.length), 1)

  const columns = Array.from({ length: colCount }, (_, index) => ({
    id: `col-${index + 1}`,
    title: header[index]?.trim() || `Column ${index + 1}`,
    width: 120,
  }))

  const rows = body.length > 0 ? body : [Array.from({ length: colCount }, () => '')]
  return normalizeSheet({
    columns,
    rows: rows.map((row) => {
      const next = row.slice(0, colCount)
      while (next.length < colCount) next.push('')
      return next
    }),
  })
}

export function sheetToCsv(sheet: DataGridSheet): string {
  const normalized = normalizeSheet(sheet)
  const header = normalized.columns.map((column) => escapeCsvCell(column.title)).join(',')
  const body = normalized.rows.map((row) => row.map(escapeCsvCell).join(','))
  return [header, ...body].join('\n')
}

export function sheetToTsv(sheet: DataGridSheet): string {
  const normalized = normalizeSheet(sheet)
  const header = normalized.columns.map((column) => column.title).join('\t')
  const body = normalized.rows.map((row) => row.join('\t'))
  return [header, ...body].join('\n')
}
