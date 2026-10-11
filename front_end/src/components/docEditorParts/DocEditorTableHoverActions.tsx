import { useCallback, useEffect, useRef, useState, type FC } from 'react'
import { createPortal } from 'react-dom'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useLexicalEditable } from '@lexical/react/useLexicalEditable'
import {
  $computeTableMapSkipCellCheck,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isSimpleTable,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  $moveTableColumn,
  type TableNode,
} from '@lexical/table'
import {
  $getChildCaret,
  $getNearestNodeFromDOMNode,
  $getSiblingCaret,
  isHTMLElement,
} from 'lexical'
import {
  draggable,
  dropTargetForElements,
  type ElementDragPayload,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import {
  autoUpdate,
  offset,
  shift,
  useFloating,
  type VirtualElement,
} from '@floating-ui/react'
import { ArrowDownAZ, ArrowUpZA, GripHorizontal, GripVertical, Plus } from 'lucide-react'

const INDICATOR_SIZE = 18
const TOP_OVERHANG = INDICATOR_SIZE / 2
const LEFT_OVERHANG = INDICATOR_SIZE / 2
const ROW_ACTION_HIDE_DELAY_MS = 220
const ROW_ACTION_BRIDGE_PAD = 12

type ColumnDragData = {
  columnIndex: number
  tableKey: string | null
  type: 'table-column'
}

type RowDragData = {
  rowIndex: number
  tableKey: string | null
  type: 'table-row'
}

type ColumnDropIndicator = {
  kind: 'column'
  height: number
  left: number
  top: number
}

type RowDropIndicator = {
  kind: 'row'
  width: number
  left: number
  top: number
}

type DropIndicatorState = ColumnDropIndicator | RowDropIndicator

function $moveTableRow(tableNode: TableNode, originRow: number, targetRow: number) {
  if (originRow === targetRow) return
  if (!$isSimpleTable(tableNode)) return

  const rows = tableNode.getChildren().filter($isTableRowNode)
  const rowCount = rows.length
  if (
    originRow < 0 ||
    originRow >= rowCount ||
    targetRow < 0 ||
    targetRow >= rowCount
  ) return

  const reordered = [...rows]
  const [moved] = reordered.splice(originRow, 1)
  reordered.splice(targetRow, 0, moved)
  tableNode.splice(0, tableNode.getChildrenSize(), reordered)
}

function getClosestTopCell(table: HTMLTableElement, clientX: number) {
  const firstRow = table.rows[0]
  if (!firstRow) return null

  let closest: { cell: HTMLTableCellElement; centerX: number; top: number } | null = null
  let minDelta = Infinity

  for (const cell of Array.from(firstRow.cells)) {
    const rect = cell.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const d = Math.abs(cx - clientX)
    if (d < minDelta) {
      minDelta = d
      closest = { cell, centerX: cx, top: rect.top }
    }
  }
  return closest
}

function isTableFromEditor(
  table: HTMLTableElement | null,
  editor: ReturnType<typeof useLexicalComposerContext>[0],
) {
  const root = editor.getRootElement()
  return !!root && !!table && root.contains(table)
}

function getTableKey(table: HTMLTableElement | null): string | null {
  return table?.getAttribute('data-lexical-key') ?? null
}

function getColumnBoundaryIndex(cell: HTMLTableCellElement, clientX: number): number {
  const rect = cell.getBoundingClientRect()
  const isRight = clientX > rect.left + rect.width / 2
  return (cell.cellIndex ?? 0) + (isRight ? 1 : 0)
}

function getRowBoundaryIndex(cell: HTMLTableCellElement, clientY: number): number {
  const rect = cell.getBoundingClientRect()
  const isBottom = clientY > rect.top + rect.height / 2
  const rowIndex = cell.parentElement instanceof HTMLTableRowElement ? cell.parentElement.rowIndex : 0
  return rowIndex + (isBottom ? 1 : 0)
}

function getColumnDropIndicator(
  headerRow: HTMLTableRowElement,
  tableRect: DOMRect,
  boundaryIndex: number,
): ColumnDropIndicator | null {
  const cellCount = headerRow.cells.length
  if (cellCount === 0) return null
  const clamped = Math.max(0, Math.min(boundaryIndex, cellCount))

  if (clamped === 0) {
    const r = headerRow.cells[0].getBoundingClientRect()
    return { kind: 'column', height: tableRect.height, left: r.left, top: tableRect.top }
  }
  if (clamped === cellCount) {
    const r = headerRow.cells[cellCount - 1].getBoundingClientRect()
    return { kind: 'column', height: tableRect.height, left: r.right, top: tableRect.top }
  }
  const r = headerRow.cells[clamped].getBoundingClientRect()
  return { kind: 'column', height: tableRect.height, left: r.left, top: tableRect.top }
}

function getRowDropIndicator(
  table: HTMLTableElement,
  tableRect: DOMRect,
  boundaryIndex: number,
): RowDropIndicator | null {
  const rowCount = table.rows.length
  if (rowCount === 0) return null
  const clamped = Math.max(0, Math.min(boundaryIndex, rowCount))

  if (clamped === 0) {
    const r = table.rows[0].getBoundingClientRect()
    return { kind: 'row', width: tableRect.width, left: tableRect.left, top: r.top }
  }
  if (clamped === rowCount) {
    const r = table.rows[rowCount - 1].getBoundingClientRect()
    return { kind: 'row', width: tableRect.width, left: tableRect.left, top: r.bottom }
  }
  const r = table.rows[clamped].getBoundingClientRect()
  return { kind: 'row', width: tableRect.width, left: tableRect.left, top: r.top }
}

function isColumnDrag(source: ElementDragPayload, tableKey: string | null): source is ElementDragPayload & { data: ColumnDragData } {
  const data = source?.data as ColumnDragData | undefined
  return data?.type === 'table-column' && data.tableKey === tableKey
}

function isRowDrag(source: ElementDragPayload, tableKey: string | null): source is ElementDragPayload & { data: RowDragData } {
  const data = source?.data as RowDragData | undefined
  return data?.type === 'table-row' && data.tableKey === tableKey
}

function getFirstColumnCells(table: HTMLTableElement): HTMLTableCellElement[] {
  const cells: HTMLTableCellElement[] = []
  for (const row of Array.from(table.rows)) {
    const first = row.cells[0]
    if (first) cells.push(first)
  }
  return cells
}

function isInRowActionBridge(
  clientX: number,
  clientY: number,
  tableEl: HTMLTableElement,
  leftPanel: HTMLElement,
): boolean {
  const panelRect = leftPanel.getBoundingClientRect()
  const tableRect = tableEl.getBoundingClientRect()
  const pad = ROW_ACTION_BRIDGE_PAD

  return (
    clientX >= panelRect.left - pad &&
    clientX <= tableRect.left + pad &&
    clientY >= panelRect.top - pad &&
    clientY <= panelRect.bottom + pad
  )
}

function TableHoverActionsInner({ anchorElem }: { anchorElem: HTMLElement }) {
  const [editor] = useLexicalComposerContext()
  const isEditable = useLexicalEditable()

  const anchorRectRef = useRef<DOMRect>(new DOMRect())

  const toAnchorCoords = useCallback((left: number, top: number) => {
    const anchorRect = anchorRectRef.current
    return { left: left - anchorRect.left, top: top - anchorRect.top }
  }, [])

  const [topVisible, setTopVisible] = useState(false)
  const [leftVisible, setLeftVisible] = useState(false)
  const [leftHoverLocked, setLeftHoverLocked] = useState(false)
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [canReorder, setCanReorder] = useState(false)
  const [hoveredColumnIndex, setHoveredColumnIndex] = useState<number | null>(null)
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null)
  const [dropIndicatorState, setDropIndicatorState] = useState<DropIndicatorState | null>(null)

  const topVirtRef = useRef<VirtualElement>({ getBoundingClientRect: () => new DOMRect() })
  const leftVirtRef = useRef<VirtualElement>({ getBoundingClientRect: () => new DOMRect() })

  const topFloatRef = useRef<HTMLElement | null>(null)
  const leftFloatRef = useRef<HTMLElement | null>(null)
  const sortMenuRef = useRef<HTMLDivElement | null>(null)
  const columnDragHandleRef = useRef<HTMLButtonElement | null>(null)
  const rowDragHandleRef = useRef<HTMLButtonElement | null>(null)
  const columnDropCleanupRef = useRef<Array<() => void>>([])
  const rowDropCleanupRef = useRef<Array<() => void>>([])

  const hoveredTopCellRef = useRef<HTMLTableCellElement | null>(null)
  const hoveredLeftCellRef = useRef<HTMLTableCellElement | null>(null)
  const hoveredTableRef = useRef<HTMLTableElement | null>(null)
  const leftHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leftVisibleRef = useRef(false)
  const leftHoverLockedRef = useRef(false)
  const [hoveredTable, setHoveredTable] = useState<HTMLTableElement | null>(null)

  const setLeftShown = useCallback((shown: boolean) => {
    leftVisibleRef.current = shown
    setLeftVisible(shown)
  }, [])

  const setLeftLocked = useCallback((locked: boolean) => {
    leftHoverLockedRef.current = locked
    setLeftHoverLocked(locked)
  }, [])

  const cancelLeftHide = useCallback(() => {
    if (leftHideTimerRef.current) {
      clearTimeout(leftHideTimerRef.current)
      leftHideTimerRef.current = null
    }
  }, [])

  const scheduleLeftHide = useCallback(() => {
    cancelLeftHide()
    leftHideTimerRef.current = setTimeout(() => {
      leftVisibleRef.current = false
      leftHoverLockedRef.current = false
      setLeftVisible(false)
      setLeftHoverLocked(false)
      hoveredLeftCellRef.current = null
      setHoveredRowIndex(null)
    }, ROW_ACTION_HIDE_DELAY_MS)
  }, [cancelLeftHide])

  const { refs: topRefs, floatingStyles: topStyles, update: updateTop } = useFloating({
    middleware: [offset({ mainAxis: -TOP_OVERHANG }), shift({ padding: 8 })],
    placement: 'top',
    strategy: 'absolute',
    whileElementsMounted: autoUpdate,
  })

  const { refs: leftRefs, floatingStyles: leftStyles, update: updateLeft } = useFloating({
    middleware: [offset({ mainAxis: -LEFT_OVERHANG }), shift({ padding: 8 })],
    placement: 'left',
    strategy: 'absolute',
    whileElementsMounted: autoUpdate,
  })

  const showLeftForCell = useCallback((
    cell: HTMLTableCellElement,
    tableEl: HTMLTableElement,
    rowIdx: number,
  ) => {
    cancelLeftHide()
    hoveredLeftCellRef.current = cell
    hoveredTableRef.current = tableEl
    setHoveredTable(tableEl)
    setHoveredRowIndex(rowIdx)
    leftRefs.setPositionReference(leftVirtRef.current)
    setLeftShown(true)
    updateLeft?.()
  }, [cancelLeftHide, leftRefs, setLeftShown, updateLeft])

  useEffect(() => {
    topVirtRef.current.getBoundingClientRect = () => {
      const cell = hoveredTopCellRef.current
      if (!cell) return new DOMRect()
      const rect = cell.getBoundingClientRect()
      return new DOMRect(rect.left + rect.width / 2, rect.top, 0, 0)
    }
    leftVirtRef.current.getBoundingClientRect = () => {
      const cell = hoveredLeftCellRef.current
      if (!cell) return new DOMRect()
      const rect = cell.getBoundingClientRect()
      return new DOMRect(rect.left, rect.top + rect.height / 2, 0, 0)
    }
  }, [])

  useEffect(() => {
    anchorRectRef.current = anchorElem.getBoundingClientRect()
  })

  useEffect(() => {
    if (!isEditable) return

    const handleMouseMove = (e: MouseEvent) => {
      const leftPanel = leftFloatRef.current
      const overLeftPanel = leftPanel && e.target instanceof Node && leftPanel.contains(e.target)
      const overTopPanel = topFloatRef.current && e.target instanceof Node && topFloatRef.current.contains(e.target)

      if (overLeftPanel || overTopPanel) return

      const bridgeTable = hoveredTableRef.current
      if (leftPanel && bridgeTable && (leftVisibleRef.current || leftHoverLockedRef.current)) {
        if (isInRowActionBridge(e.clientX, e.clientY, bridgeTable, leftPanel)) return
      }

      if (!isHTMLElement(e.target)) {
        setTopVisible(false); setLeftShown(false); setLeftLocked(false); setHoveredTable(null); setShowSortMenu(false)
        hoveredTableRef.current = null
        setHoveredColumnIndex(null); setHoveredRowIndex(null); setDropIndicatorState(null)
        cancelLeftHide()
        return
      }

      const cell = (e.target as HTMLElement).closest<HTMLTableCellElement>('td, th')
      const tableEl = cell?.closest<HTMLTableElement>('table') ?? null

      if (!tableEl || !isTableFromEditor(tableEl, editor)) {
        if (!leftHoverLockedRef.current) scheduleLeftHide()
        setTopVisible(false); setHoveredTable(null); setShowSortMenu(false)
        hoveredTableRef.current = null
        setHoveredColumnIndex(null); setDropIndicatorState(null)
        if (!leftHoverLockedRef.current) {
          setHoveredRowIndex(null)
        }
        return
      }

      if (!cell) {
        setTopVisible(false)
        hoveredTopCellRef.current = null
        if (!leftHoverLockedRef.current) scheduleLeftHide()
        return
      }

      const rowIdx = cell.parentElement instanceof HTMLTableRowElement ? cell.parentElement.rowIndex : -1
      const rowEl = cell.parentElement instanceof HTMLTableRowElement ? cell.parentElement : null

      const closestTop = getClosestTopCell(tableEl, e.clientX)

      if (!closestTop || rowIdx !== 0) {
        setTopVisible(false)
        hoveredTopCellRef.current = null
        setHoveredColumnIndex(null)
        setShowSortMenu(false)
      } else {
        hoveredTopCellRef.current = closestTop.cell
        hoveredTableRef.current = tableEl
        setHoveredTable(tableEl)
        setHoveredColumnIndex(closestTop.cell.cellIndex ?? null)
        topRefs.setPositionReference(topVirtRef.current)
        setTopVisible(true)
        updateTop?.()
      }

      if (rowEl?.cells[0]) {
        showLeftForCell(rowEl.cells[0], tableEl, rowIdx)
      } else if (!leftHoverLockedRef.current) {
        scheduleLeftHide()
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      cancelLeftHide()
    }
  }, [
    cancelLeftHide,
    editor,
    isEditable,
    scheduleLeftHide,
    setLeftLocked,
    setLeftShown,
    showLeftForCell,
    topRefs,
    updateTop,
  ])

  useEffect(() => {
    const handleLeave = (e: MouseEvent) => {
      const next = e.relatedTarget
      if (next && topFloatRef.current?.contains(next as Node)) return
      if (next && leftFloatRef.current?.contains(next as Node)) return
      setTopVisible(false); setShowSortMenu(false)
      if (!leftHoverLockedRef.current) scheduleLeftHide()
    }
    return editor.registerRootListener((root) => {
      if (root) {
        root.addEventListener('mouseleave', handleLeave)
        return () => root.removeEventListener('mouseleave', handleLeave)
      }
    })
  }, [editor, scheduleLeftHide])

  useEffect(() => {
    if (!showSortMenu) return
    function handleClick(e: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) setShowSortMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showSortMenu])

  useEffect(() => {
    if (!hoveredTable) { setCanReorder(false); return }
    if (!isTableFromEditor(hoveredTable, editor)) { setCanReorder(false); return }
    editor.getEditorState().read(() => {
      const tableNode = $getNearestNodeFromDOMNode(hoveredTable)
      setCanReorder($isTableNode(tableNode) && $isSimpleTable(tableNode))
    }, { editor })
  }, [editor, hoveredTable])

  useEffect(() => {
    const handle = columnDragHandleRef.current
    const tableElement = hoveredTable
    const columnIndex = hoveredColumnIndex
    if (!handle || !tableElement || columnIndex == null || !canReorder) return

    return draggable({
      canDrag: () => canReorder,
      element: handle,
      getInitialData: () => ({
        columnIndex,
        tableKey: getTableKey(tableElement),
        type: 'table-column' as const,
      }),
      onDrop: () => setDropIndicatorState(null),
    })
  }, [canReorder, hoveredColumnIndex, hoveredTable])

  useEffect(() => {
    const handle = rowDragHandleRef.current
    const tableElement = hoveredTable
    const rowIndex = hoveredRowIndex
    if (!handle || !tableElement || rowIndex == null || !canReorder) return

    return draggable({
      canDrag: () => canReorder,
      element: handle,
      getInitialData: () => ({
        rowIndex,
        tableKey: getTableKey(tableElement),
        type: 'table-row' as const,
      }),
      onDrop: () => setDropIndicatorState(null),
    })
  }, [canReorder, hoveredRowIndex, hoveredTable])

  useEffect(() => {
    columnDropCleanupRef.current.forEach((fn) => fn())
    columnDropCleanupRef.current = []
    if (!hoveredTable || !canReorder) return
    const headerRow = hoveredTable.rows[0]
    if (!headerRow || !isTableFromEditor(hoveredTable, editor)) return

    const tableKey = getTableKey(hoveredTable)

    const register = (cell: HTMLTableCellElement) =>
      dropTargetForElements({
        canDrop: ({ source }) => isColumnDrag(source, tableKey),
        element: cell,
        getData: ({ input }) => ({ boundaryIndex: getColumnBoundaryIndex(cell, input.clientX) }),
        onDrag: ({ location, source }) => {
          if (!isColumnDrag(source, tableKey)) return
          const bi = getColumnBoundaryIndex(cell, location.current.input.clientX)
          const tRect = hoveredTable!.getBoundingClientRect()
          setDropIndicatorState(getColumnDropIndicator(headerRow, tRect, bi))
        },
        onDragEnter: ({ location, source }) => {
          if (!isColumnDrag(source, tableKey)) return
          const bi = getColumnBoundaryIndex(cell, location.current.input.clientX)
          const tRect = hoveredTable!.getBoundingClientRect()
          setDropIndicatorState(getColumnDropIndicator(headerRow, tRect, bi))
        },
        onDragLeave: () => setDropIndicatorState(null),
        onDrop: ({ location, source }) => {
          setDropIndicatorState(null)
          const data = (source?.data ?? {}) as ColumnDragData
          if (data.columnIndex == null) return
          const bi = getColumnBoundaryIndex(cell, location.current.input.clientX)
          const targetTable = cell.closest('table')
          if (!isHTMLElement(targetTable) || !isColumnDrag(source, tableKey)) return

          editor.update(() => {
            const tableNode = $getNearestNodeFromDOMNode(targetTable)
            if (!$isTableNode(tableNode)) return
            const colCount = tableNode.getColumnCount()
            const clamped = Math.max(0, Math.min(bi, colCount))
            const start = data.columnIndex
            if (clamped === start || clamped === start + 1 || start < 0 || start >= colCount) return
            const finish = clamped > start ? clamped - 1 : clamped
            $moveTableColumn(tableNode, start, finish)
          })
        },
      })

    columnDropCleanupRef.current = Array.from(headerRow.cells).map(register)

    return () => {
      columnDropCleanupRef.current.forEach((fn) => fn())
      columnDropCleanupRef.current = []
      setDropIndicatorState(null)
    }
  }, [canReorder, editor, hoveredTable])

  useEffect(() => {
    rowDropCleanupRef.current.forEach((fn) => fn())
    rowDropCleanupRef.current = []
    if (!hoveredTable || !canReorder) return
    if (!isTableFromEditor(hoveredTable, editor)) return

    const tableKey = getTableKey(hoveredTable)
    const firstColCells = getFirstColumnCells(hoveredTable)

    const register = (cell: HTMLTableCellElement) =>
      dropTargetForElements({
        canDrop: ({ source }) => isRowDrag(source, tableKey),
        element: cell,
        getData: ({ input }) => ({ boundaryIndex: getRowBoundaryIndex(cell, input.clientY) }),
        onDrag: ({ location, source }) => {
          if (!isRowDrag(source, tableKey)) return
          const bi = getRowBoundaryIndex(cell, location.current.input.clientY)
          const tRect = hoveredTable!.getBoundingClientRect()
          setDropIndicatorState(getRowDropIndicator(hoveredTable!, tRect, bi))
        },
        onDragEnter: ({ location, source }) => {
          if (!isRowDrag(source, tableKey)) return
          const bi = getRowBoundaryIndex(cell, location.current.input.clientY)
          const tRect = hoveredTable!.getBoundingClientRect()
          setDropIndicatorState(getRowDropIndicator(hoveredTable!, tRect, bi))
        },
        onDragLeave: () => setDropIndicatorState(null),
        onDrop: ({ location, source }) => {
          setDropIndicatorState(null)
          const data = (source?.data ?? {}) as RowDragData
          if (data.rowIndex == null) return
          const bi = getRowBoundaryIndex(cell, location.current.input.clientY)
          const targetTable = cell.closest('table')
          if (!isHTMLElement(targetTable) || !isRowDrag(source, tableKey)) return

          editor.update(() => {
            const tableNode = $getNearestNodeFromDOMNode(targetTable)
            if (!$isTableNode(tableNode)) return
            const rowCount = tableNode.getChildren().filter($isTableRowNode).length
            const clamped = Math.max(0, Math.min(bi, rowCount))
            const start = data.rowIndex
            if (clamped === start || clamped === start + 1 || start < 0 || start >= rowCount) return
            const finish = clamped > start ? clamped - 1 : clamped
            $moveTableRow(tableNode, start, finish)
          })
        },
      })

    rowDropCleanupRef.current = firstColCells.map(register)

    return () => {
      rowDropCleanupRef.current.forEach((fn) => fn())
      rowDropCleanupRef.current = []
      setDropIndicatorState(null)
    }
  }, [canReorder, editor, hoveredTable])

  if (!isEditable) return null

  const handleAddColumn = () => {
    const cell = hoveredTopCellRef.current
    if (!cell) return
    editor.update(() => {
      const node = $getNearestNodeFromDOMNode(cell)
      if ($isTableCellNode(node)) {
        node.selectEnd()
        $insertTableColumnAtSelection()
      }
    })
  }

  const handleAddRow = () => {
    const cell = hoveredLeftCellRef.current
    if (!cell) return
    editor.update(() => {
      const node = $getNearestNodeFromDOMNode(cell)
      if ($isTableCellNode(node)) {
        node.selectEnd()
        $insertTableRowAtSelection()
      }
    })
  }

  const handleSort = (direction: 'asc' | 'desc') => {
    const cell = hoveredTopCellRef.current
    if (!cell) return
    setShowSortMenu(false)

    editor.update(() => {
      const cellNode = $getNearestNodeFromDOMNode(cell)
      if (!$isTableCellNode(cellNode)) return

      const rowNode = cellNode.getParent()
      if (!rowNode || !$isTableRowNode(rowNode)) return

      const tableNode = rowNode.getParent()
      if (!$isTableNode(tableNode) || !$isSimpleTable(tableNode)) return

      const colIndex = cellNode.getIndexWithinParent()
      const rows = tableNode.getChildren().filter($isTableRowNode)
      const [tableMap] = $computeTableMapSkipCellCheck(tableNode, cellNode, cellNode)

      const headerCell = tableMap[0]?.[colIndex]?.cell
      const skipTop = headerCell?.hasHeader() ?? false
      const sortable = skipTop ? rows.slice(1) : rows

      if (sortable.length <= 1) return

      sortable.sort((a, b) => {
        const ai = rows.indexOf(a)
        const bi = rows.indexOf(b)
        const aText = tableMap[ai]?.[colIndex]?.cell.getTextContent() ?? ''
        const bText = tableMap[bi]?.[colIndex]?.cell.getTextContent() ?? ''
        const res = aText.localeCompare(bText, undefined, { numeric: true })
        return direction === 'asc' ? -res : res
      })

      const caret = skipTop ? $getSiblingCaret(rows[0], 'next') : $getChildCaret(tableNode, 'next')
      caret?.splice(0, sortable)
    })
  }

  const leftShown = leftVisible || leftHoverLocked

  return (
    <>
      <div
        ref={(node) => { topFloatRef.current = node; topRefs.setFloating(node) }}
        style={{ ...topStyles, opacity: topVisible ? 1 : 0, pointerEvents: topVisible ? 'auto' : 'none' }}
        className="theme-doc-editor__table-hover-top"
      >
        {canReorder && (
          <button
            ref={columnDragHandleRef}
            className="theme-doc-editor__table-hover-drag-btn"
            aria-label="Drag to reorder column"
            type="button"
          >
            <GripVertical size={12} />
          </button>
        )}
        <div className="theme-doc-editor__table-hover-top-group" style={{ position: 'relative' }}>
          <button
            className="theme-doc-editor__table-hover-sort-btn"
            aria-label="Sort column"
            type="button"
            onClick={() => setShowSortMenu((v) => !v)}
          >
            <ArrowDownAZ size={12} />
          </button>
          {showSortMenu && (
            <div ref={sortMenuRef} className="theme-doc-editor__table-hover-sort-menu">
              <button className="theme-doc-editor__table-action-item" onClick={() => handleSort('asc')}>
                <ArrowDownAZ size={14} /> Sort ascending
              </button>
              <button className="theme-doc-editor__table-action-item" onClick={() => handleSort('desc')}>
                <ArrowUpZA size={14} /> Sort descending
              </button>
            </div>
          )}
        </div>
        <button
          className="theme-doc-editor__table-hover-add-btn"
          aria-label="Add column"
          type="button"
          onClick={handleAddColumn}
        >
          <Plus size={12} />
        </button>
      </div>

      <div
        ref={(node) => { leftFloatRef.current = node; leftRefs.setFloating(node) }}
        style={{ ...leftStyles, opacity: leftShown ? 1 : 0, pointerEvents: leftShown ? 'auto' : 'none' }}
        className="theme-doc-editor__table-hover-left"
        onMouseEnter={() => {
          cancelLeftHide()
          setLeftLocked(true)
          setLeftShown(true)
        }}
        onMouseLeave={() => {
          setLeftLocked(false)
          scheduleLeftHide()
        }}
      >
        {canReorder && (
          <button
            ref={rowDragHandleRef}
            className="theme-doc-editor__table-hover-drag-btn"
            aria-label="Drag to reorder row"
            type="button"
          >
            <GripHorizontal size={12} />
          </button>
        )}
        <button
          className="theme-doc-editor__table-hover-add-btn"
          aria-label="Add row"
          type="button"
          onClick={handleAddRow}
        >
          <Plus size={12} />
        </button>
      </div>

      {dropIndicatorState?.kind === 'column' && (() => {
        const { left, top } = toAnchorCoords(dropIndicatorState.left, dropIndicatorState.top)
        return (
          <div
            className="theme-doc-editor__table-drop-indicator theme-doc-editor__table-drop-indicator--column"
            style={{
              height: dropIndicatorState.height,
              left,
              top,
            }}
          />
        )
      })()}
      {dropIndicatorState?.kind === 'row' && (() => {
        const { left, top } = toAnchorCoords(dropIndicatorState.left, dropIndicatorState.top)
        return (
          <div
            className="theme-doc-editor__table-drop-indicator theme-doc-editor__table-drop-indicator--row"
            style={{
              width: dropIndicatorState.width,
              left,
              top,
            }}
          />
        )
      })()}
    </>
  )
}

export const DocEditorTableHoverActions: FC<{ anchorElem: HTMLElement }> = function DocEditorTableHoverActions({
  anchorElem,
}) {
  const isEditable = useLexicalEditable()
  if (!isEditable) return null
  return createPortal(<TableHoverActionsInner anchorElem={anchorElem} />, anchorElem)
}
