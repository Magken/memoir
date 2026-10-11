export type TextSearchMatch = {
  start: number
  end: number
}

export type TextSearchOptions = {
  caseSensitive?: boolean
  wholeWord?: boolean
  useRegex?: boolean
}

export type TextSearchSegment =
  | { type: 'text'; value: string }
  | { type: 'mark'; value: string; matchIndex: number; active: boolean }

function isWordChar(ch: string) {
  return /[\w$]/.test(ch)
}

function isWholeWordMatch(text: string, start: number, end: number) {
  const before = text[start - 1] ?? ' '
  const after = text[end] ?? ' '
  return !isWordChar(before) && !isWordChar(after)
}

export function findTextMatches(
  text: string,
  query: string,
  options: TextSearchOptions | boolean = false,
): TextSearchMatch[] {
  const opts: TextSearchOptions =
    typeof options === 'boolean' ? { caseSensitive: options } : options
  const trimmed = query.trim()
  if (!trimmed) return []

  if (opts.useRegex) {
    try {
      const flags = opts.caseSensitive ? 'g' : 'gi'
      const pattern = new RegExp(trimmed, flags)
      const matches: TextSearchMatch[] = []
      let match: RegExpExecArray | null
      while ((match = pattern.exec(text)) !== null) {
        const start = match.index
        const end = start + match[0].length
        if (opts.wholeWord && !isWholeWordMatch(text, start, end)) continue
        matches.push({ start, end })
        if (match[0].length === 0) pattern.lastIndex += 1
      }
      return matches
    } catch {
      return []
    }
  }

  const haystack = opts.caseSensitive ? text : text.toLowerCase()
  const needle = opts.caseSensitive ? trimmed : trimmed.toLowerCase()
  const matches: TextSearchMatch[] = []
  let from = 0

  while (from < haystack.length) {
    const index = haystack.indexOf(needle, from)
    if (index === -1) break
    const end = index + needle.length
    if (!opts.wholeWord || isWholeWordMatch(text, index, end)) {
      matches.push({ start: index, end })
    }
    from = index + Math.max(needle.length, 1)
  }

  return matches
}

export function buildSearchSegments(
  text: string,
  query: string,
  activeMatchIndex: number,
  options: TextSearchOptions | boolean = false,
): TextSearchSegment[] {
  const matches = findTextMatches(text, query, options)
  if (matches.length === 0) return [{ type: 'text', value: text }]

  const segments: TextSearchSegment[] = []
  let cursor = 0

  matches.forEach((match, matchIndex) => {
    if (match.start > cursor) {
      segments.push({ type: 'text', value: text.slice(cursor, match.start) })
    }
    segments.push({
      type: 'mark',
      value: text.slice(match.start, match.end),
      matchIndex,
      active: matchIndex === activeMatchIndex,
    })
    cursor = match.end
  })

  if (cursor < text.length) {
    segments.push({ type: 'text', value: text.slice(cursor) })
  }

  return segments
}

export function clampMatchIndex(index: number, matchCount: number): number {
  if (matchCount <= 0) return 0
  return ((index % matchCount) + matchCount) % matchCount
}

export function applyPreserveCase(found: string, replacement: string) {
  if (!found) return replacement
  if (found === found.toUpperCase()) return replacement.toUpperCase()
  if (found === found.toLowerCase()) return replacement.toLowerCase()
  if (found[0] === found[0]?.toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase()
  }
  return replacement
}

export function replaceTextAtMatch(
  text: string,
  match: TextSearchMatch,
  replacement: string,
  preserveCase = false,
): string {
  const found = text.slice(match.start, match.end)
  const next = preserveCase ? applyPreserveCase(found, replacement) : replacement
  return text.slice(0, match.start) + next + text.slice(match.end)
}

export function replaceAllTextMatches(
  text: string,
  matches: readonly TextSearchMatch[],
  replacement: string,
  preserveCase = false,
): string {
  return [...matches]
    .sort((a, b) => b.start - a.start)
    .reduce(
      (result, match) => replaceTextAtMatch(result, match, replacement, preserveCase),
      text,
    )
}
