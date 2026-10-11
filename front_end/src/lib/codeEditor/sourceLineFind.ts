import {
  findTextMatches,
  type TextSearchOptions,
} from '../search/textSearch'

export type SourceLineFindHit = {
  line: number
  column: number
  preview: string
  matchStart: number
  matchEnd: number
}

export function searchSourceLines(
  source: string,
  query: string,
  options: TextSearchOptions = {},
  limit = 200,
): SourceLineFindHit[] {
  const term = query.trim()
  if (!term) return []

  const lines = source.split('\n')
  const hits: SourceLineFindHit[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const lineText = lines[index] ?? ''
    const matches = findTextMatches(lineText, term, options)

    for (const match of matches) {
      hits.push({
        line: index + 1,
        column: match.start + 1,
        preview: lineText.trim() || lineText,
        matchStart: match.start,
        matchEnd: match.end,
      })
      if (hits.length >= limit) return hits
    }
  }

  return hits
}
