import type { Item } from '@glideapps/glide-data-grid'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  applyGridHitReplace,
  applyGridReplaceAll,
  clampMatchIndex,
  gridHitsToSearchResults,
  searchSheet,
} from '../../lib/dataGridEditor/gridFind'
import { sheetFingerprint, type DataGridSheet } from '../../lib/dataGridEditor/sheetModel'
import { FindReplaceBar } from '../FindReplaceBar'
import type { CodeEditorSearchResultGroup } from '../codeEditorParts/CodeEditorSearchResults'
import { CodeEditorSearchResults } from '../codeEditorParts/CodeEditorSearchResults'

type DataGridEditorFindProps = {
  open: boolean
  sheet: DataGridSheet
  editable: boolean
  layout?: 'overlay' | 'sidebar'
  onMutateSheet: (mutator: (draft: DataGridSheet) => void) => void
  onSearchResultsChange: (results: readonly Item[]) => void
  onSelectCell: (col: number, row: number) => void
  onScrollToCell: (col: number, row: number) => void
  onClose?: () => void
}

export function DataGridEditorFind({
  open,
  sheet,
  editable,
  layout = 'overlay',
  onMutateSheet,
  onSearchResultsChange,
  onSelectCell,
  onScrollToCell,
  onClose,
}: DataGridEditorFindProps) {
  const [findQuery, setFindQuery] = useState('')
  const [replaceQuery, setReplaceQuery] = useState('')
  const [replaceOpen, setReplaceOpen] = useState(editable)
  const [matchCase, setMatchCase] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [preserveCase, setPreserveCase] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const sheetRevision = sheetFingerprint(sheet)

  const searchOptions = useMemo(
    () => ({ matchCase, wholeWord, useRegex }),
    [matchCase, useRegex, wholeWord],
  )

  const hits = useMemo(
    () => searchSheet(sheet, findQuery, searchOptions),
    [findQuery, searchOptions, sheet, sheetRevision],
  )

  const safeIndex = clampMatchIndex(activeIndex, hits.length)

  useEffect(() => {
    setActiveIndex(0)
  }, [findQuery, matchCase, wholeWord, useRegex, sheetRevision])

  useEffect(() => {
    if (!open) {
      onSearchResultsChange([])
      return
    }
    onSearchResultsChange(gridHitsToSearchResults(hits))
  }, [hits, onSearchResultsChange, open])

  const revealHit = useCallback(
    (index: number) => {
      const hit = hits[clampMatchIndex(index, hits.length)]
      if (!hit) return
      onScrollToCell(hit.col, hit.row)
      onSelectCell(hit.col, hit.row)
    },
    [hits, onScrollToCell, onSelectCell],
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

  const handleReplace = useCallback(() => {
    const hit = hits[safeIndex]
    if (!hit || !editable) return
    onMutateSheet((draft) => {
      applyGridHitReplace(draft, hit, replaceQuery, preserveCase)
    })
  }, [editable, hits, onMutateSheet, preserveCase, replaceQuery, safeIndex])

  const handleReplaceAll = useCallback(() => {
    if (!editable || hits.length === 0) return
    onMutateSheet((draft) => {
      applyGridReplaceAll(draft, hits, replaceQuery, preserveCase)
    })
  }, [editable, hits, onMutateSheet, preserveCase, replaceQuery])

  const resultGroups = useMemo((): CodeEditorSearchResultGroup[] => {
    if (hits.length === 0) return []
    return [
      {
        key: 'sheet',
        path: 'Sheet matches',
        hits: hits.map((hit, index) => ({
          line: hit.row + 1,
          column: hit.col + 1,
          preview: hit.preview,
          active: index === safeIndex,
        })),
        onHitClick: (_hit, index) => selectMatch(index),
      },
    ]
  }, [hits, safeIndex, selectMatch])

  const emptyMessage = !findQuery.trim()
    ? 'Type to find in the sheet.'
    : 'No matches in this sheet.'

  return (
    <div
      className={[
        'theme-data-grid-editor__find',
        layout === 'sidebar' ? 'theme-data-grid-editor__find--sidebar' : '',
        open ? 'theme-data-grid-editor__find--open' : '',
        editable ? '' : 'theme-data-grid-editor__find--view',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={!open}
    >
      <div className="theme-data-grid-editor__find-form">
        <FindReplaceBar
          findQuery={findQuery}
          onFindQueryChange={setFindQuery}
          replaceQuery={replaceQuery}
          onReplaceQueryChange={setReplaceQuery}
          replaceOpen={editable ? replaceOpen : false}
          onReplaceOpenChange={editable ? setReplaceOpen : undefined}
          matchCase={matchCase}
          onMatchCaseChange={setMatchCase}
          wholeWord={wholeWord}
          onWholeWordChange={setWholeWord}
          useRegex={useRegex}
          onUseRegexChange={setUseRegex}
          preserveCase={preserveCase}
          onPreserveCaseChange={setPreserveCase}
          matchCount={hits.length}
          activeMatchIndex={safeIndex}
          onPrevMatch={() => stepMatch(-1)}
          onNextMatch={() => stepMatch(1)}
          onReplace={editable ? handleReplace : undefined}
          onReplaceAll={editable ? handleReplaceAll : undefined}
          onClose={onClose}
          size="xs"
          shadowless
          autoFocus={open}
        />
      </div>
      <CodeEditorSearchResults groups={resultGroups} emptyMessage={emptyMessage} />
    </div>
  )
}
