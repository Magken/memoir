import '@glideapps/glide-data-grid/dist/index.css'
import {
  DataEditor,
  GridCellKind,
  type DataEditorRef,
  type GridCell,
  type GridColumn,
  type GridSelection,
  type Item,
  type EditableGridCell,
} from '@glideapps/glide-data-grid'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { buildGlideTheme, glideThemeCssVars } from '../../lib/dataGridEditor/glideTheme'
import { isDataGridEditable, type DataGridEditorMode } from '../../lib/dataGridEditor/mode'
import type { DataGridSheet } from '../../lib/dataGridEditor/sheetModel'
import { useThemeColor } from '../../lib/theme'

export type DataGridEditorGridHandle = {
  scrollToCell: (col: number, row: number) => void
  focus: () => void
}

type DataGridEditorGridProps = {
  mode: DataGridEditorMode
  sheet: DataGridSheet
  gridSelection: GridSelection
  searchResults?: readonly Item[]
  onGridSelectionChange: (selection: GridSelection) => void
  onCellEdited?: (cell: Item, newValue: EditableGridCell) => void
  onDelete?: (selection: GridSelection) => boolean
  onColumnResize?: (columnIndex: number, width: number) => void
}

export const DataGridEditorGrid = forwardRef<DataGridEditorGridHandle, DataGridEditorGridProps>(
  function DataGridEditorGrid(
    {
      mode,
      sheet,
      gridSelection,
      searchResults,
      onGridSelectionChange,
      onCellEdited,
      onDelete,
      onColumnResize,
    },
    ref,
  ) {
    const hostRef = useRef<HTMLDivElement>(null)
    const editorRef = useRef<DataEditorRef>(null)
    const [size, setSize] = useState({ width: 0, height: 0 })
    const { palette, paletteId } = useThemeColor()
    const editable = isDataGridEditable(mode)

    useEffect(() => {
      const node = hostRef.current
      if (!node) return undefined
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (!entry) return
        const { width, height } = entry.contentRect
        setSize({
          width: Math.max(0, Math.floor(width)),
          height: Math.max(0, Math.floor(height)),
        })
      })
      observer.observe(node)
      return () => observer.disconnect()
    }, [])

    const theme = useMemo(() => buildGlideTheme(palette), [palette, paletteId])

    const hostStyle = useMemo(
      () => glideThemeCssVars(palette) as CSSProperties,
      [palette, paletteId],
    )

    const markerTheme = useMemo(
      () => ({
        accentColor: theme.accentColor,
        accentFg: theme.accentFg,
        accentLight: theme.accentLight,
      }),
      [theme.accentColor, theme.accentFg, theme.accentLight],
    )

    const columns = useMemo<GridColumn[]>(
      () =>
        sheet.columns.map((column) => ({
          id: column.id,
          title: column.title,
          width: column.width,
        })),
      [sheet.columns],
    )

    const getCellContent = useCallback(
      ([col, row]: Item): GridCell => {
        const value = sheet.rows[row]?.[col] ?? ''
        return {
          kind: GridCellKind.Text,
          data: value,
          displayData: value,
          readonly: !editable,
          allowOverlay: editable,
        }
      },
      [editable, sheet],
    )

    useImperativeHandle(
      ref,
      () => ({
        scrollToCell: (col, row) => {
          editorRef.current?.scrollTo(col, row, 'both', 48, 48, {
            hAlign: 'center',
            vAlign: 'center',
          })
        },
        focus: () => {
          editorRef.current?.focus()
        },
      }),
      [],
    )

    const handleColumnResize = useCallback(
      (_column: GridColumn, newSize: number, columnIndex: number) => {
        onColumnResize?.(columnIndex, newSize)
      },
      [onColumnResize],
    )

    const ready = size.width > 0 && size.height > 0

    return (
      <div
        ref={hostRef}
        className="theme-data-grid-editor__grid-host"
        data-scroll-rail="nano"
        style={hostStyle}
      >
        {ready ? (
          <DataEditor
            ref={editorRef}
            className="theme-data-grid-editor__canvas"
            columns={columns}
            rows={sheet.rows.length}
            getCellContent={getCellContent}
            onCellEdited={editable ? onCellEdited : undefined}
            onDelete={editable ? onDelete : () => false}
            onColumnResize={editable ? handleColumnResize : undefined}
            onPaste={editable ? true : false}
            fillHandle={editable}
            editOnType={editable}
            gridSelection={gridSelection}
            onGridSelectionChange={onGridSelectionChange}
            rowMarkers={
              editable
                ? { kind: 'both', theme: markerTheme }
                : { kind: 'number', theme: markerTheme }
            }
            smoothScrollX
            smoothScrollY
            getCellsForSelection
            copyHeaders
            width={size.width}
            height={size.height}
            theme={theme}
            searchResults={searchResults}
          />
        ) : null}
      </div>
    )
  },
)
