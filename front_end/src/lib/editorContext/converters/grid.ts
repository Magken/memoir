import { parseCsv } from '../../dataGridEditor/csv'
import { normalizeSheet } from '../../dataGridEditor/sheetModel'
import { isEditorContextEnvelope } from '../envelope'
import { GRID_SHEET_FIXTURE } from '../fixtures'
import type { GridEditorPayload } from '../types'

export async function convertCsvToGrid(csv: string): Promise<{ payload: GridEditorPayload; warnings?: string[] }> {
  return { payload: normalizeSheet(parseCsv(csv)) }
}

export function convertJsonToGrid(input: unknown): { payload: GridEditorPayload; warnings?: string[] } {
  if (isEditorContextEnvelope(input) && input.kind === 'grid') {
    return { payload: normalizeSheet(input.payload as GridEditorPayload) }
  }
  if (input && typeof input === 'object' && 'columns' in input && 'rows' in input) {
    return { payload: normalizeSheet(input as GridEditorPayload) }
  }
  return { payload: normalizeSheet(GRID_SHEET_FIXTURE), warnings: ['JSON did not match grid shape — loaded sample sheet.'] }
}

export function csvToMarkdownTable(csv: string): string {
  const sheet = parseCsv(csv)
  const header = `| ${sheet.columns.map((c) => c.title).join(' | ')} |`
  const sep = `| ${sheet.columns.map(() => '---').join(' | ')} |`
  const rows = sheet.rows.map((row) => `| ${row.join(' | ')} |`)
  return [header, sep, ...rows].join('\n')
}
