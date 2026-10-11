import type { TableDOMCell } from '@lexical/table'
import type { LexicalEditor, NodeKey } from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useLexicalEditable } from '@lexical/react/useLexicalEditable'
import {
  $computeTableMapSkipCellCheck,
  $getTableNodeFromLexicalNodeOrThrow,
  $getTableRowIndexFromTableCellNode,
  $isTableCellNode,
  $isTableRowNode,
  getDOMCellFromTarget,
  getTableElement,
  TableNode,
} from '@lexical/table'
import { calculateZoomLevel } from '@lexical/utils'
import { $getNearestNodeFromDOMNode, isHTMLElement, mergeRegister } from 'lexical'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEventHandler,
  type ReactPortal,
} from 'react'
import { createPortal } from 'react-dom'

type PointerPosition = { x: number; y: number }
type PointerDraggingDirection = 'right' | 'bottom'

const MIN_ROW_HEIGHT = 33
const MIN_COLUMN_WIDTH = 92

function normalizeColWidths(tableNode: TableNode): number[] {
  const numColumns = tableNode.getColumnCount()
  const existing = tableNode.getColWidths()
  const widths = existing?.length ? [...existing] : []
  while (widths.length < numColumns) widths.push(MIN_COLUMN_WIDTH)
  if (widths.length > numColumns) widths.length = numColumns
  return widths
}

function TableCellResizerInner({ editor, anchorElem }: { editor: LexicalEditor; anchorElem: HTMLElement }) {
  const targetRef = useRef<HTMLElement | null>(null)
  const resizerRef = useRef<HTMLDivElement | null>(null)
  const tableRectRef = useRef<DOMRect | null>(null)
  const [hasTable, setHasTable] = useState(false)
  const pointerStartPosRef = useRef<PointerPosition | null>(null)
  const [pointerCurrentPos, setPointerCurrentPos] = useState<PointerPosition | null>(null)
  const [activeCell, setActiveCell] = useState<TableDOMCell | null>(null)
  const [draggingDirection, setDraggingDirection] = useState<PointerDraggingDirection | null>(null)

  const resetState = useCallback(() => {
    setActiveCell(null)
    targetRef.current = null
    setDraggingDirection(null)
    pointerStartPosRef.current = null
    tableRectRef.current = null
  }, [])

  useEffect(() => {
    const tableKeys = new Set<NodeKey>()
    return editor.registerMutationListener(TableNode, (nodeMutations) => {
      for (const [nodeKey, mutation] of nodeMutations) {
        if (mutation === 'destroyed') tableKeys.delete(nodeKey)
        else tableKeys.add(nodeKey)
      }
      setHasTable(tableKeys.size > 0)
    })
  }, [editor])

  useEffect(() => {
    if (!hasTable) return

    return mergeRegister(
      editor.registerNodeTransform(TableNode, (tableNode) => {
        const numColumns = tableNode.getColumnCount()
        const colWidths = tableNode.getColWidths()
        if (colWidths && colWidths.length === numColumns) return tableNode
        tableNode.setColWidths(normalizeColWidths(tableNode))
        return tableNode
      }),
    )
  }, [editor, hasTable])

  useEffect(() => {
    if (!hasTable) return

    const onPointerMove = (event: PointerEvent) => {
      const target = event.target
      if (!isHTMLElement(target)) return

      if (draggingDirection) {
        event.preventDefault()
        event.stopPropagation()
        setPointerCurrentPos({ x: event.clientX, y: event.clientY })
        return
      }

      if (resizerRef.current && resizerRef.current.contains(target)) return

      if (targetRef.current !== target) {
        targetRef.current = target
        const cell = getDOMCellFromTarget(target)

        if (cell && activeCell !== cell) {
          editor.read('latest', () => {
            const tableCellNode = $getNearestNodeFromDOMNode(cell.elem)
            if (!tableCellNode) return

            const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode)
            const tableElement = getTableElement(tableNode, editor.getElementByKey(tableNode.getKey()))
            if (!tableElement) return

            targetRef.current = target
            tableRectRef.current = tableElement.getBoundingClientRect()
            setActiveCell(cell)
          })
        } else if (cell == null) {
          resetState()
        }
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') onPointerMove(event)
    }

    const rootElement = editor.getRootElement()
    if (!rootElement) return

    rootElement.addEventListener('pointermove', onPointerMove)
    rootElement.addEventListener('pointerdown', onPointerDown)

    return () => {
      rootElement.removeEventListener('pointermove', onPointerMove)
      rootElement.removeEventListener('pointerdown', onPointerDown)
    }
  }, [activeCell, draggingDirection, editor, resetState, hasTable])

  const updateRowHeight = useCallback(
    (heightChange: number) => {
      if (!activeCell) return

      editor.update(() => {
        const tableCellNode = $getNearestNodeFromDOMNode(activeCell.elem)
        if (!$isTableCellNode(tableCellNode)) return

        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode)
        const baseRowIndex = $getTableRowIndexFromTableCellNode(tableCellNode)
        const tableRows = tableNode.getChildren()
        const tableRowIndex = baseRowIndex + tableCellNode.getRowSpan() - 1

        if (tableRowIndex >= tableRows.length || tableRowIndex < 0) return

        const tableRow = tableRows[tableRowIndex]
        if (!$isTableRowNode(tableRow)) return

        let height = tableRow.getHeight()
        if (height === undefined) {
          const rowCells = tableRow.getChildren().filter($isTableCellNode)
          height = Math.min(
            ...rowCells.map((cell) => {
              const domCell = editor.getElementByKey(cell.getKey())
              return domCell?.clientHeight ?? Infinity
            }),
          )
        }

        tableRow.setHeight(Math.max(height + heightChange, MIN_ROW_HEIGHT))
      })
    },
    [activeCell, editor],
  )

  const updateColumnWidth = useCallback(
    (widthChange: number) => {
      if (!activeCell) return

      editor.update(() => {
        const tableCellNode = $getNearestNodeFromDOMNode(activeCell.elem)
        if (!$isTableCellNode(tableCellNode)) return

        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode)
        const [tableMap] = $computeTableMapSkipCellCheck(tableNode, null, null)

        let columnIndex: number | undefined
        for (let row = 0; row < tableMap.length; row++) {
          for (let col = 0; col < tableMap[row].length; col++) {
            if (tableMap[row][col].cell === tableCellNode) {
              columnIndex = col
              break
            }
          }
          if (columnIndex !== undefined) break
        }
        if (columnIndex === undefined) return

        const colWidths = normalizeColWidths(tableNode)
        const width = colWidths[columnIndex]
        if (width === undefined) return

        const newColWidths = [...colWidths]
        newColWidths[columnIndex] = Math.max(width + widthChange, MIN_COLUMN_WIDTH)
        tableNode.setColWidths(newColWidths)
      })
    },
    [activeCell, editor],
  )

  const pointerUpHandler = useCallback(
    (direction: PointerDraggingDirection) => {
      const handler = (event: PointerEvent) => {
        event.preventDefault()
        event.stopPropagation()

        if (!activeCell || !pointerStartPosRef.current) return

        const { x, y } = pointerStartPosRef.current
        const zoom = calculateZoomLevel(event.target as Element)

        if (direction === 'bottom') {
          updateRowHeight((event.clientY - y) / zoom)
        } else {
          updateColumnWidth((event.clientX - x) / zoom)
        }

        resetState()
        document.removeEventListener('pointerup', handler)
      }
      return handler
    },
    [activeCell, resetState, updateColumnWidth, updateRowHeight],
  )

  const toggleResize = useCallback(
    (direction: PointerDraggingDirection): PointerEventHandler<HTMLDivElement> =>
      (event) => {
        event.preventDefault()
        event.stopPropagation()

        if (!activeCell) return

        pointerStartPosRef.current = { x: event.clientX, y: event.clientY }
        setPointerCurrentPos(pointerStartPosRef.current)
        setDraggingDirection(direction)
        document.addEventListener('pointerup', pointerUpHandler(direction))
      },
    [activeCell, pointerUpHandler],
  )

  const getResizers = useCallback(() => {
    if (!activeCell) return { bottom: null as CSSProperties | null, right: null as CSSProperties | null }

    const anchorRect = anchorElem.getBoundingClientRect()
    const { height, width, top, left } = activeCell.elem.getBoundingClientRect()
    const zoneWidth = 16

    const relLeft = left - anchorRect.left
    const relTop = top - anchorRect.top

    const styles: Record<string, CSSProperties> = {
      bottom: {
        backgroundColor: 'transparent',
        cursor: 'row-resize',
        height: `${zoneWidth}px`,
        left: `${relLeft}px`,
        top: `${relTop + height - zoneWidth / 2}px`,
        width: `${width}px`,
      },
      right: {
        backgroundColor: 'transparent',
        cursor: 'col-resize',
        height: `${height}px`,
        left: `${relLeft + width - zoneWidth / 2}px`,
        top: `${relTop}px`,
        width: `${zoneWidth}px`,
      },
    }

    const tableRect = tableRectRef.current
    if (draggingDirection && pointerCurrentPos && tableRect) {
      const tableRelLeft = tableRect.left - anchorRect.left
      const tableRelTop = tableRect.top - anchorRect.top

      if (draggingDirection === 'bottom') {
        styles[draggingDirection].left = `${tableRelLeft}px`
        styles[draggingDirection].top = `${pointerCurrentPos.y - anchorRect.top}px`
        styles[draggingDirection].height = '3px'
        styles[draggingDirection].width = `${tableRect.width}px`
      } else {
        styles[draggingDirection].top = `${tableRelTop}px`
        styles[draggingDirection].left = `${pointerCurrentPos.x - anchorRect.left}px`
        styles[draggingDirection].width = '3px'
        styles[draggingDirection].height = `${tableRect.height}px`
      }
      styles[draggingDirection].backgroundColor = 'var(--type-accent, #76b6ff)'
      styles[draggingDirection].mixBlendMode = 'unset'
    }

    return styles
  }, [activeCell, anchorElem, draggingDirection, pointerCurrentPos])

  const resizerStyles = getResizers()

  return (
    <div ref={resizerRef} className="theme-doc-editor__table-resizer">
      {activeCell != null && (
        <>
          <div
            className="theme-doc-editor__table-resizer-handle"
            style={resizerStyles.right ?? undefined}
            onPointerDown={toggleResize('right')}
          />
          <div
            className="theme-doc-editor__table-resizer-handle"
            style={resizerStyles.bottom ?? undefined}
            onPointerDown={toggleResize('bottom')}
          />
        </>
      )}
    </div>
  )
}

export function DocEditorTableCellResizer({ anchorElem }: { anchorElem: HTMLElement }): ReactPortal | null {
  const [editor] = useLexicalComposerContext()
  const isEditable = useLexicalEditable()

  return useMemo(
    () =>
      isEditable
        ? createPortal(<TableCellResizerInner editor={editor} anchorElem={anchorElem} />, anchorElem)
        : null,
    [anchorElem, editor, isEditable],
  )
}
