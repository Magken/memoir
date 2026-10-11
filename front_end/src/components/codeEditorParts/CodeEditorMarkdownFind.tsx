import { useCallback, useEffect, useMemo, useState } from 'react'
import { revealMarkdownPreviewHit } from '../../lib/codeEditor/markdownPreviewReveal'
import type { CodeEditorMarkdownSearchHost } from '../../lib/codeEditor/searchHotwire'
import { searchSourceLines } from '../../lib/codeEditor/sourceLineFind'
import { clampMatchIndex } from '../../lib/search/textSearch'
import { FindReplaceBar } from '../FindReplaceBar'
import type { CodeEditorSearchResultGroup } from './CodeEditorSearchResults'
import { CodeEditorSearchResults } from './CodeEditorSearchResults'

type CodeEditorMarkdownFindProps = {
  host: CodeEditorMarkdownSearchHost
}

export function CodeEditorMarkdownFind({ host }: CodeEditorMarkdownFindProps) {
  const [findQuery, setFindQuery] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const searchOptions = useMemo(
    () => ({ caseSensitive: matchCase, wholeWord, useRegex }),
    [matchCase, useRegex, wholeWord],
  )

  const hits = useMemo(
    () => searchSourceLines(host.source, findQuery, searchOptions),
    [findQuery, host.source, searchOptions],
  )

  const safeIndex = clampMatchIndex(activeIndex, hits.length)

  useEffect(() => {
    setActiveIndex(0)
  }, [findQuery, matchCase, wholeWord, useRegex, host.source])

  const revealHit = useCallback(
    (index: number) => {
      const hit = hits[clampMatchIndex(index, hits.length)]
      if (!hit) return
      revealMarkdownPreviewHit(host.previewRootRef.current, hit)
    },
    [hits, host.previewRootRef],
  )

  const stepMatch = useCallback(
    (delta: number) => {
      setActiveIndex((index) => {
        const next = clampMatchIndex(index + delta, hits.length)
        revealHit(next)
        return next
      })
    },
    [hits.length, revealHit],
  )

  const selectMatch = useCallback(
    (index: number) => {
      setActiveIndex(index)
      revealHit(index)
    },
    [revealHit],
  )

  const resultGroups = useMemo((): CodeEditorSearchResultGroup[] => {
    if (hits.length === 0) return []
    return [
      {
        key: 'markdown',
        path: 'Markdown source',
        hits: hits.map((hit, index) => ({
          line: hit.line,
          column: hit.column,
          preview: hit.preview,
          active: index === safeIndex,
        })),
        onHitClick: (_hit, index) => selectMatch(index),
      },
    ]
  }, [hits, safeIndex, selectMatch])

  const emptyMessage = !findQuery.trim()
    ? 'Type to find in the preview.'
    : 'No matches in this file.'

  return (
    <div className="theme-code-editor__search theme-code-editor__search--markdown">
      <div className="theme-code-editor__search-form">
        <FindReplaceBar
          findQuery={findQuery}
          onFindQueryChange={setFindQuery}
          replaceOpen={false}
          matchCase={matchCase}
          onMatchCaseChange={setMatchCase}
          wholeWord={wholeWord}
          onWholeWordChange={setWholeWord}
          useRegex={useRegex}
          onUseRegexChange={setUseRegex}
          matchCount={hits.length}
          activeMatchIndex={safeIndex}
          onPrevMatch={() => stepMatch(-1)}
          onNextMatch={() => stepMatch(1)}
          findPlaceholder="Find in preview…"
          size="xs"
          shadowless
          autoFocus
        />
      </div>
      <CodeEditorSearchResults groups={resultGroups} emptyMessage={emptyMessage} />
    </div>
  )
}
