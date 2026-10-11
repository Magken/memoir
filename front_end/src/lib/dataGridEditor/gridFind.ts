import {
  clampMatchIndex,
  findTextMatches,
  replaceAllTextMatches,
  replaceTextAtMatch,
  type TextSearchMatch,
} from '../search/textSearch'
import { setCell, type DataGridSheet } from './sheetModel'

export type GridFindHit = {
  col: number
  row: number
  matchStart: number
  matchEnd: number
  preview: string
  columnTitle: string
}

export type GridFindOptions = {
  matchCase?: boolean
  wholeWord?: boolean
  useRegex?: boolean
}

export function searchSheet(
  sheet: DataGridSheet,
  query: string,
  options: GridFindOptions = {},
  limit = 500,
): GridFindHit[] {
  const term = query.trim()
  if (!term) return []

  const searchOptions = {
    caseSensitive: options.matchCase,
    wholeWord: options.wholeWord,
    useRegex: options.useRegex,
  }

  const hits: GridFindHit[] = []

  for (let row = 0; row < sheet.rows.length; row += 1) {
    for (let col = 0; col < sheet.columns.length; col += 1) {
      const value = sheet.rows[row]?.[col] ?? ''
      const matches = findTextMatches(value, term, searchOptions)
      const columnTitle = sheet.columns[col]?.title ?? `Column ${col + 1}`

      for (const match of matches) {
        hits.push({
          col,
          row,
          matchStart: match.start,
          matchEnd: match.end,
          preview: value,
          columnTitle,
        })
        if (hits.length >= limit) return hits
      }
    }
  }

  return hits
}

export function gridHitsToSearchResults(hits: readonly GridFindHit[]): [number, number][] {
  const seen = new Set<string>()
  const results: [number, number][] = []

  for (const hit of hits) {
    const key = `${hit.col}:${hit.row}`
    if (seen.has(key)) continue
    seen.add(key)
    results.push([hit.col, hit.row])
  }

  return results
}

export { clampMatchIndex }

function hitMatch(hit: GridFindHit): TextSearchMatch {
  return { start: hit.matchStart, end: hit.matchEnd }
}

export function replaceGridHitValue(
  value: string,
  hit: GridFindHit,
  replacement: string,
  preserveCase = false,
): string {
  return replaceTextAtMatch(value, hitMatch(hit), replacement, preserveCase)
}

export function applyGridHitReplace(
  sheet: DataGridSheet,
  hit: GridFindHit,
  replacement: string,
  preserveCase = false,
): void {
  const value = sheet.rows[hit.row]?.[hit.col] ?? ''
  const next = replaceGridHitValue(value, hit, replacement, preserveCase)
  setCell(sheet, hit.col, hit.row, next)
}

export function applyGridReplaceAll(
  sheet: DataGridSheet,
  hits: readonly GridFindHit[],
  replacement: string,
  preserveCase = false,
): void {
  const byCell = new Map<string, GridFindHit[]>()

  for (const hit of hits) {
    const key = `${hit.col}:${hit.row}`
    const list = byCell.get(key) ?? []
    list.push(hit)
    byCell.set(key, list)
  }

  for (const [key, cellHits] of byCell) {
    const [col, row] = key.split(':').map(Number)
    const value = sheet.rows[row]?.[col] ?? ''
    const matches = cellHits.map(hitMatch)
    const next = replaceAllTextMatches(value, matches, replacement, preserveCase)
    setCell(sheet, col, row, next)
  }
}
