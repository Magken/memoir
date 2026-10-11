import { useMemo } from 'react'
import { buildSearchSegments, type TextSearchOptions } from '../lib/search/textSearch'

type SearchHighlightTextProps = {
  text: string
  query: string
  activeMatchIndex?: number
  caseSensitive?: boolean
  wholeWord?: boolean
  useRegex?: boolean
  matchIdPrefix?: string
  className?: string
}

export function SearchHighlightText({
  text,
  query,
  activeMatchIndex = 0,
  caseSensitive = false,
  wholeWord = false,
  useRegex = false,
  matchIdPrefix = 'search-match',
  className = '',
}: SearchHighlightTextProps) {
  const searchOptions = useMemo<TextSearchOptions>(
    () => ({ caseSensitive, wholeWord, useRegex }),
    [caseSensitive, useRegex, wholeWord],
  )
  const segments = useMemo(
    () => buildSearchSegments(text, query, activeMatchIndex, searchOptions),
    [activeMatchIndex, query, searchOptions, text],
  )

  return (
    <p
      className={['theme-search-highlight', className].filter(Boolean).join(' ')}
      data-has-matches={query.trim() ? 'true' : 'false'}
    >
      {segments.map((segment, index) =>
        segment.type === 'text' ? (
          <span key={`text-${index}`}>{segment.value}</span>
        ) : (
          <mark
            key={`mark-${segment.matchIndex}-${index}`}
            id={`${matchIdPrefix}-${segment.matchIndex}`}
            className={[
              'theme-search-highlight__mark',
              segment.active ? 'theme-search-highlight__mark--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {segment.value}
          </mark>
        ),
      )}
    </p>
  )
}
