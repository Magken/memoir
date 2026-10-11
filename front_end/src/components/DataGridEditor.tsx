import {
  CompactSelection,
  GridCellKind,
  type EditableGridCell,
  type GridSelection,
  type Item,
} from '@glideapps/glide-data-grid'
import { useCallback, useMemo, useRef, useState, useImperativeHandle, forwardRef, type ChangeEvent } from 'react'
import { parseCsv, sheetToTsv } from '../lib/dataGridEditor/csv'
import { fitColumnsToSelection, getFitTargets } from '../lib/dataGridEditor/fitColumns'
import { buildGlideTheme } from '../lib/dataGridEditor/glideTheme'
import { createEmptySheet, createSeedSheet } from '../lib/dataGridEditor/seedSheet'
import { selectionSummary } from '../lib/dataGridEditor/selectionSummary'
import {
  addColumn,
  addRow,
  clearRange,
  deleteRowsAt,
  normalizeSheet,
  setCell,
  sheetFingerprint,
  type DataGridSheet,
} from '../lib/dataGridEditor/sheetModel'
import { useSheetHistory } from '../lib/dataGridEditor/useSheetHistory'
import { type DataGridEditorMode, isDataGridEditable } from '../lib/dataGridEditor/mode'
import { useThemeColor } from '../lib/theme'
import {
  DataGridEditorGrid,
  type DataGridEditorGridHandle,
} from './dataGridEditorParts/DataGridEditorGrid'
import { DataGridEditorFind } from './dataGridEditorParts/DataGridEditorFind'
import { DataGridEditorStatusBar } from './dataGridEditorParts/DataGridEditorStatusBar'
import {
  DataGridEditorToolbar,
  type DataGridEditorFileAction,
} from './dataGridEditorParts/DataGridEditorToolbar'

import { downloadExportedContext } from '../lib/editorContext/importExportManager'
import type { EditorRuntimeHandle } from '../lib/editorContext/types'

type DataGridEditorProps = {
  className?: string
  initialTitle?: string
  /** `edit` — full spreadsheet; `view` — read-only selection, search, copy/export */
  mode?: DataGridEditorMode
}

export type DataGridEditorHandle = EditorRuntimeHandle

export type { DataGridEditorMode }

export const DataGridEditor = forwardRef<DataGridEditorHandle, DataGridEditorProps>(function DataGridEditor(
  {
    className = '',
    initialTitle = 'Untitled sheet',
    mode = 'edit',
  },
  ref,
) {
  const editable = isDataGridEditable(mode)
  const seed = useMemo(() => createSeedSheet(), [])
  const history = useSheetHistory(seed)
  const gridRef = useRef<DataGridEditorGridHandle>(null)
  const [title, setTitle] = useState(initialTitle)
  const [gridSelection, setGridSelection] = useState<GridSelection>(() => ({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  }))
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<readonly Item[]>([])
  const [savedFingerprint, setSavedFingerprint] = useState(() => sheetFingerprint(seed))
  const fileInputRef = useRef<HTMLInputElement>(null)

  const dirty = sheetFingerprint(history.sheet) !== savedFingerprint

  const runtimeHandle = useMemo<EditorRuntimeHandle>(
    () => ({
      getContext: () => normalizeSheet(history.sheet),
      loadContext: (payload) => {
        const sheet = normalizeSheet(payload as DataGridSheet)
        history.replaceSheet(sheet)
        setSavedFingerprint(sheetFingerprint(sheet))
      },
    }),
    [history],
  )

  useImperativeHandle(ref, () => runtimeHandle, [runtimeHandle])

  const handleSave = useCallback(() => {
    downloadExportedContext('grid', runtimeHandle, 'envelope-json', title)
    setSavedFingerprint(sheetFingerprint(history.sheet))
  }, [history.sheet, runtimeHandle, title])

  const handleExport = useCallback(
    (formatId: string) => {
      downloadExportedContext('grid', runtimeHandle, formatId as 'csv', title)
      if (formatId === 'csv' || formatId === 'envelope-json') {
        setSavedFingerprint(sheetFingerprint(history.sheet))
      }
    },
    [history.sheet, runtimeHandle, title],
  )

  const handleRefresh = useCallback(() => {
    const next = createSeedSheet()
    history.replaceSheet(next)
    setSavedFingerprint(sheetFingerprint(next))
    setTitle(initialTitle)
  }, [history, initialTitle])
  const { palette, paletteId } = useThemeColor()
  const glideTheme = useMemo(() => buildGlideTheme(palette), [palette, paletteId])
  const canFit = useMemo(
    () => getFitTargets(gridSelection, history.sheet.rows.length, history.sheet.columns.length) !== null,
    [gridSelection, history.sheet.columns.length, history.sheet.rows.length],
  )

  const scrollToCell = useCallback((col: number, row: number) => {
    requestAnimationFrame(() => {
      gridRef.current?.scrollToCell(col, row)
    })
  }, [])

  const selectCell = useCallback((col: number, row: number) => {
    setGridSelection({
      columns: CompactSelection.empty(),
      rows: CompactSelection.empty(),
      current: {
        cell: [col, row],
        range: { x: col, y: row, width: 1, height: 1 },
        rangeStack: [],
      },
    })
  }, [])

  const handleSearchResultsChange = useCallback((results: readonly Item[]) => {
    setSearchResults(results)
  }, [])

  const handleSearchClose = useCallback(() => {
    setSearchOpen(false)
  }, [])

  const handleCellEdited = useCallback(
    (cell: Item, newValue: EditableGridCell) => {
      if (!editable) return
      if (newValue.kind !== GridCellKind.Text) return
      const [col, row] = cell
      history.mutateSheet((draft) => {
        setCell(draft, col, row, newValue.data)
      })
    },
    [editable, history],
  )

  const handleDelete = useCallback(
    (selection: GridSelection) => {
      if (!editable) return false
      history.mutateSheet((draft) => {
        const selectedRows = selection.rows.toArray()
        if (selectedRows.length > 0) {
          deleteRowsAt(draft, selectedRows)
          return
        }
        const range = selection.current?.range
        if (range) {
          clearRange(draft, range.x, range.y, range.width, range.height)
        }
      })
      return true
    },
    [editable, history],
  )

  const handleAddRow = useCallback(() => {
    if (!editable) return
    const newRow = history.sheet.rows.length
    history.mutateSheet((draft) => {
      addRow(draft)
    })
    scrollToCell(0, newRow)
  }, [editable, history, scrollToCell])

  const handleAddColumn = useCallback(() => {
    if (!editable) return
    const newCol = history.sheet.columns.length
    history.mutateSheet((draft) => {
      addColumn(draft)
    })
    scrollToCell(newCol, 0)
  }, [editable, history, scrollToCell])

  const handleColumnResize = useCallback(
    (columnIndex: number, width: number) => {
      if (!editable) return
      history.mutateSheet((draft) => {
        const column = draft.columns[columnIndex]
        if (column) column.width = Math.round(width)
      })
    },
    [editable, history],
  )

  const handleFitSelection = useCallback(() => {
    const next = fitColumnsToSelection(history.sheet, gridSelection, glideTheme.fontFamily)
    history.mutateSheet((draft) => {
      draft.columns = next.columns.map((column) => ({ ...column }))
    })
  }, [glideTheme.fontFamily, gridSelection, history])

  const handleDeleteSelection = useCallback(() => {
    handleDelete(gridSelection)
  }, [gridSelection, handleDelete])

  const handleFileAction = useCallback(
    (id: DataGridEditorFileAction) => {
      if (!editable && (id === 'new' || id === 'load-csv' || id === 'reset')) return
      if (id === 'new') {
        const empty = createEmptySheet()
        history.replaceSheet(empty)
        setSavedFingerprint(sheetFingerprint(empty))
        setTitle('Untitled sheet')
        return
      }
      if (id === 'load-csv') {
        fileInputRef.current?.click()
        return
      }
      if (id === 'download-csv') {
        handleExport('csv')
        return
      }
      if (id === 'copy-all') {
        void navigator.clipboard.writeText(sheetToTsv(history.sheet))
        return
      }
      if (id === 'reset') {
        const next = createSeedSheet()
        history.replaceSheet(next)
        setSavedFingerprint(sheetFingerprint(next))
        setTitle(initialTitle)
      }
    },
    [editable, handleExport, history, initialTitle, title],
  )

  const handleCsvLoad = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : ''
        const parsed = parseCsv(text)
        history.replaceSheet(parsed)
        setSavedFingerprint(sheetFingerprint(parsed))
        const base = file.name.replace(/\.csv$/i, '') || 'Imported sheet'
        setTitle(base)
      }
      reader.readAsText(file)
    },
    [history],
  )

  const selectionLabel = selectionSummary(gridSelection)

  return (
    <div
      className={[
        'theme-data-grid-editor',
        editable ? '' : 'theme-data-grid-editor--view',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <DataGridEditorToolbar
        mode={mode}
        title={title}
        onTitleChange={setTitle}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        canFit={canFit}
        searchOpen={searchOpen}
        onToggleSearch={() => setSearchOpen((open) => !open)}
        onUndo={history.undo}
        onRedo={history.redo}
        onAddRow={handleAddRow}
        onAddColumn={handleAddColumn}
        onFitSelection={handleFitSelection}
        onDeleteSelection={handleDeleteSelection}
        onFileAction={handleFileAction}
        onSave={handleSave}
        onExport={handleExport}
        onRefresh={handleRefresh}
      />

      <div className="theme-data-grid-editor__stage">
        <DataGridEditorGrid
          ref={gridRef}
          mode={mode}
          sheet={history.sheet}
          gridSelection={gridSelection}
          searchResults={searchResults}
          onGridSelectionChange={setGridSelection}
          onCellEdited={handleCellEdited}
          onDelete={handleDelete}
          onColumnResize={handleColumnResize}
        />
        <DataGridEditorFind
          open={searchOpen}
          sheet={history.sheet}
          editable={editable}
          onMutateSheet={history.mutateSheet}
          onSearchResultsChange={handleSearchResultsChange}
          onSelectCell={selectCell}
          onScrollToCell={scrollToCell}
          onClose={handleSearchClose}
        />
      </div>

      <DataGridEditorStatusBar
        rows={history.sheet.rows.length}
        columns={history.sheet.columns.length}
        selectionLabel={selectionLabel}
        dirty={dirty}
        editable={editable}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={handleCsvLoad}
      />
    </div>
  )
})
