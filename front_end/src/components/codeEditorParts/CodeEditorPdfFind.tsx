import { useMemo } from 'react'
import { usePdfFind } from '../../hooks/usePdfFind'
import type { CodeEditorPdfSearchHost } from '../../lib/codeEditor/searchHotwire'
import { FindReplaceBar } from '../FindReplaceBar'
import type { CodeEditorSearchResultGroup } from './CodeEditorSearchResults'
import { CodeEditorSearchResults } from './CodeEditorSearchResults'

type CodeEditorPdfFindProps = {
  host: CodeEditorPdfSearchHost
}

export function CodeEditorPdfFind({ host }: CodeEditorPdfFindProps) {
  const {
    query: findQuery,
    setQuery: setFindQuery,
    matchCount,
    activeMatchIndex,
    stepMatch,
  } = usePdfFind({
    pdfDocument: host.pdfDocument,
    page: host.page,
    findBridge: host.findBridge,
    setPage: host.setPage,
  })

  const resultGroups = useMemo((): CodeEditorSearchResultGroup[] => {
    if (matchCount <= 0 || !findQuery.trim()) return []
    return [
      {
        key: 'pdf',
        path: 'PDF document',
        hits: Array.from({ length: matchCount }, (_, index) => ({
          line: index + 1,
          column: 1,
          preview: `Match ${index + 1} of ${matchCount}`,
          active: index === activeMatchIndex,
        })),
        onHitClick: (_hit, index) => {
          const delta = index - activeMatchIndex
          if (delta !== 0) stepMatch(delta)
        },
      },
    ]
  }, [activeMatchIndex, findQuery, matchCount, stepMatch])

  const emptyMessage = host.disabled
    ? 'Loading PDF…'
    : !findQuery.trim()
      ? 'Type to find in the PDF.'
      : 'No matches in this document.'

  return (
    <div className="theme-code-editor__search theme-code-editor__search--pdf">
      <div className="theme-code-editor__search-form">
        <FindReplaceBar
          findQuery={findQuery}
          onFindQueryChange={setFindQuery}
          replaceOpen={false}
          matchCount={matchCount}
          activeMatchIndex={activeMatchIndex}
          onPrevMatch={() => stepMatch(-1)}
          onNextMatch={() => stepMatch(1)}
          findPlaceholder="Find in PDF…"
          disabled={host.disabled}
          size="xs"
          shadowless
          autoFocus
        />
      </div>
      <CodeEditorSearchResults groups={resultGroups} emptyMessage={emptyMessage} />
    </div>
  )
}
