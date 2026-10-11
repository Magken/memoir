import type { Item } from '@glideapps/glide-data-grid'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRegisterCodeEditorSearchHost } from '../../lib/codeEditor/CodeEditorSearchHostContext'
import type { CodeEditorGridSearchHost } from '../../lib/codeEditor/searchHotwire'
import { parseCsv, sheetToCsv } from '../../lib/dataGridEditor/csv'
import { normalizeSheet, cloneSheet, type DataGridSheet } from '../../lib/dataGridEditor/sheetModel'
import { EditableDataGrid, type EditableDataGridHandle } from '../EditableDataGrid'

type CodeEditorCsvViewProps = {
  fileId: string
  source: string
  active: boolean
  onSourceChange: (next: string) => void
  readOnly?: boolean
}

export function CodeEditorCsvView({
  fileId,
  source,
  active,
  onSourceChange,
  readOnly = false,
}: CodeEditorCsvViewProps) {
  const gridRef = useRef<EditableDataGridHandle>(null)
  const [sheet, setSheet] = useState<DataGridSheet>(() => normalizeSheet(parseCsv(source)))
  const [searchResults, setSearchResults] = useState<readonly Item[]>([])
  const wasActiveRef = useRef(active)

  useEffect(() => {
    if (active && !wasActiveRef.current) {
      setSheet(normalizeSheet(parseCsv(source)))
    }
    wasActiveRef.current = active
  }, [active, source])

  const handleSheetChange = useCallback(
    (next: DataGridSheet) => {
      setSheet(next)
      if (!readOnly) onSourceChange(sheetToCsv(next))
    },
    [onSourceChange, readOnly],
  )

  const mutateSheet = useCallback(
    (mutator: (draft: DataGridSheet) => void) => {
      if (readOnly) return
      const draft = cloneSheet(sheet)
      mutator(draft)
      handleSheetChange(draft)
    },
    [handleSheetChange, readOnly, sheet],
  )

  const scrollToCell = useCallback((col: number, row: number) => {
    gridRef.current?.scrollToCell(col, row)
  }, [])

  const selectCell = useCallback((col: number, row: number) => {
    gridRef.current?.selectCell(col, row)
  }, [])

  const searchHost = useMemo<CodeEditorGridSearchHost>(
    () => ({
      kind: 'grid',
      sheet,
      editable: !readOnly,
      onMutateSheet: mutateSheet,
      scrollToCell,
      selectCell,
      onSearchResultsChange: setSearchResults,
    }),
    [mutateSheet, readOnly, scrollToCell, selectCell, sheet],
  )

  useRegisterCodeEditorSearchHost(fileId, active, searchHost)

  return (
    <EditableDataGrid
      ref={gridRef}
      headless
      className="theme-code-editor__csv-grid"
      sheet={sheet}
      onSheetChange={handleSheetChange}
      mode={readOnly ? 'view' : 'edit'}
      searchResults={searchResults}
    />
  )
}
