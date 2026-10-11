import {
  CompactSelection,
  GridCellKind,
  type EditableGridCell,
  type GridSelection,
  type Item,
} from '@glideapps/glide-data-grid'
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import {
  clearRange,
  cloneSheet,
  deleteRowsAt,
  setCell,
  type DataGridSheet,
} from '../lib/dataGridEditor/sheetModel'
import { isDataGridEditable, type DataGridEditorMode } from '../lib/dataGridEditor/mode'
import {
  DataGridEditorGrid,
  type DataGridEditorGridHandle,
} from './dataGridEditorParts/DataGridEditorGrid'

export type EditableDataGridHandle = DataGridEditorGridHandle & {
  selectCell: (col: number, row: number) => void
}

export type EditableDataGridProps = {
  /** Grid only — no workbench chrome (for CodeEditor CSV view and other embeds). */
  headless?: boolean
  sheet: DataGridSheet
  onSheetChange: (sheet: DataGridSheet) => void
  mode?: DataGridEditorMode
  className?: string
  searchResults?: readonly Item[]
}

export const EditableDataGrid = forwardRef<EditableDataGridHandle, EditableDataGridProps>(
  function EditableDataGrid(
    {
      headless = true,
      sheet,
      onSheetChange,
      mode = 'edit',
      className = '',
      searchResults,
    },
    ref,
  ) {
  const editable = isDataGridEditable(mode)
  const gridRef = useRef<DataGridEditorGridHandle>(null)
  const [gridSelection, setGridSelection] = useState<GridSelection>(() => ({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  }))

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

  useImperativeHandle(
    ref,
    () => ({
      scrollToCell: (col, row) => gridRef.current?.scrollToCell(col, row),
      focus: () => gridRef.current?.focus(),
      selectCell,
    }),
    [selectCell],
  )

  const mutateSheet = useCallback(
    (mutate: (draft: DataGridSheet) => void) => {
      const draft = cloneSheet(sheet)
      mutate(draft)
      onSheetChange(draft)
    },
    [onSheetChange, sheet],
  )

  const handleCellEdited = useCallback(
    (cell: Item, newValue: EditableGridCell) => {
      if (!editable) return
      if (newValue.kind !== GridCellKind.Text) return
      const [col, row] = cell
      mutateSheet((draft) => {
        setCell(draft, col, row, newValue.data)
      })
    },
    [editable, mutateSheet],
  )

  const handleDelete = useCallback(
    (selection: GridSelection) => {
      if (!editable) return false
      mutateSheet((draft) => {
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
    [editable, mutateSheet],
  )

  const handleColumnResize = useCallback(
    (columnIndex: number, width: number) => {
      if (!editable) return
      mutateSheet((draft) => {
        const column = draft.columns[columnIndex]
        if (column) column.width = Math.round(width)
      })
    },
    [editable, mutateSheet],
  )

  return (
    <div
      className={[
        'theme-data-grid-editor',
        headless ? 'theme-data-grid-editor--headless' : '',
        editable ? '' : 'theme-data-grid-editor--view',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-data-grid-editor__stage">
        <DataGridEditorGrid
          ref={gridRef}
          mode={mode}
          sheet={sheet}
          gridSelection={gridSelection}
          searchResults={searchResults}
          onGridSelectionChange={setGridSelection}
          onCellEdited={handleCellEdited}
          onDelete={handleDelete}
          onColumnResize={handleColumnResize}
        />
      </div>
    </div>
  )
},
)
