import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FC,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useLexicalEditable } from '@lexical/react/useLexicalEditable'
import {
  $computeTableMapSkipCellCheck,
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $getNodeTriplet,
  $getTableCellNodeFromLexicalNode,
  $getTableColumnIndexFromTableCellNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $getTableRowIndexFromTableCellNode,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableCellNode,
  $isTableSelection,
  $mergeCells,
  $unmergeCell,
  getTableElement,
  getTableObserverFromTableElement,
  TableCellHeaderStates,
  TableCellNode,
  type TableObserver,
  type TableSelection,
} from '@lexical/table'
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_CRITICAL,
  getDOMSelection,
  mergeRegister,
  SELECTION_CHANGE_COMMAND,
  type ElementNode,
  type LexicalEditor,
} from 'lexical'
import { ChevronDown } from 'lucide-react'
import { CascadeMenuButton, type CascadeMenuItem } from '../CascadeMenuButton'
import { ColorSelector, cssColorToHex } from '../ColorSelector'
import { resolveThemePortalMount } from '../../lib/theme/themePortal'

function computeSelectionCount(selection: TableSelection) {
  const shape = selection.getShape()
  return { columns: shape.toX - shape.fromX + 1, rows: shape.toY - shape.fromY + 1 }
}

function $canUnmerge(): boolean {
  const selection = $getSelection()
  if (
    ($isRangeSelection(selection) && !selection.isCollapsed()) ||
    ($isTableSelection(selection) && !selection.anchor.is(selection.focus)) ||
    (!$isRangeSelection(selection) && !$isTableSelection(selection))
  ) {
    return false
  }
  const [cell] = $getNodeTriplet(selection.anchor)
  return cell.__colSpan > 1 || cell.__rowSpan > 1
}

function $selectLastDescendant(node: ElementNode) {
  const last = node.getLastDescendant()
  if ($isTextNode(last)) last.select()
  else if ($isElementNode(last)) last.selectEnd()
  else if (last !== null) last.selectNext()
}

function currentCellBgColor(editor: LexicalEditor): string | null {
  return editor.read('latest', () => {
    const sel = $getSelection()
    if ($isRangeSelection(sel) || $isTableSelection(sel)) {
      const [cell] = $getNodeTriplet(sel.anchor)
      if ($isTableCellNode(cell)) return cell.getBackgroundColor()
    }
    return null
  })
}

function buildTableCascadeItems({
  cellMerge,
  canMerge,
  canUnmerge,
  selectionCounts,
  isRowHeader,
  isColHeader,
}: {
  cellMerge: boolean
  canMerge: boolean
  canUnmerge: boolean
  selectionCounts: { columns: number; rows: number }
  isRowHeader: boolean
  isColHeader: boolean
}): readonly CascadeMenuItem[] {
  const items: CascadeMenuItem[] = []

  if (cellMerge && canMerge) {
    items.push({ id: 'merge-cells', label: 'Merge cells' })
  }
  if (cellMerge && canUnmerge) {
    items.push({ id: 'unmerge-cells', label: 'Unmerge cells' })
  }

  items.push({ id: 'background-color', label: 'Background color' })
  items.push({ id: 'toggle-row-striping', label: 'Toggle row striping' })
  items.push({
    id: 'vertical-align',
    label: 'Vertical align',
    children: [
      { id: 'vertical-align-top', label: 'Top align' },
      { id: 'vertical-align-middle', label: 'Middle align' },
      { id: 'vertical-align-bottom', label: 'Bottom align' },
    ],
  })
  items.push({ id: 'toggle-first-row-freeze', label: 'Toggle first row freeze' })
  items.push({ id: 'toggle-first-column-freeze', label: 'Toggle first column freeze' })
  items.push({
    id: 'insert-row',
    label: `Insert ${selectionCounts.rows === 1 ? 'row' : `${selectionCounts.rows} rows`}`,
    children: [
      { id: 'insert-row-above', label: 'Above' },
      { id: 'insert-row-below', label: 'Below' },
    ],
  })
  items.push({
    id: 'insert-column',
    label: `Insert ${selectionCounts.columns === 1 ? 'column' : `${selectionCounts.columns} columns`}`,
    children: [
      { id: 'insert-column-left', label: 'Left' },
      { id: 'insert-column-right', label: 'Right' },
    ],
  })
  items.push({
    id: 'delete',
    label: 'Delete',
    children: [
      { id: 'delete-column', label: 'Column' },
      { id: 'delete-row', label: 'Row' },
      { id: 'delete-table', label: 'Table' },
    ],
  })
  items.push({
    id: 'headers',
    label: 'Headers',
    children: [
      { id: 'toggle-row-header', label: isRowHeader ? 'Remove row header' : 'Add row header' },
      { id: 'toggle-column-header', label: isColHeader ? 'Remove column header' : 'Add column header' },
    ],
  })

  return items
}

function TableColorPopover({
  value,
  onChange,
  onClose,
  anchorRef,
}: {
  value: string
  onChange: (color: string) => void
  onClose: () => void
  anchorRef: RefObject<HTMLElement | null>
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [sessionColor, setSessionColor] = useState(() => cssColorToHex(value))
  const [portalThemeStyle, setPortalThemeStyle] = useState<CSSProperties>({})

  const handleColorChange = useCallback(
    (color: string) => {
      const next = cssColorToHex(color)
      setSessionColor(next)
      onChange(next)
    },
    [onChange],
  )

  useLayoutEffect(() => {
    setPortalThemeStyle(resolveThemePortalMount(anchorRef.current).wrapStyle)
  }, [anchorRef])

  useLayoutEffect(() => {
    const popover = ref.current
    const anchor = anchorRef.current
    if (!popover || !anchor) return

    const position = () => {
      const nextPopover = ref.current
      const nextAnchor = anchorRef.current
      if (!nextPopover || !nextAnchor) return
      const rect = nextAnchor.getBoundingClientRect()
      nextPopover.style.top = `${rect.bottom + 4}px`
      nextPopover.style.left = `${rect.left}px`
    }

    position()
    window.addEventListener('scroll', position, true)
    window.addEventListener('resize', position)
    return () => {
      window.removeEventListener('scroll', position, true)
      window.removeEventListener('resize', position)
    }
  }, [anchorRef])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (ref.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    const id = window.setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDown)
      document.addEventListener('keydown', handleEscape)
    }, 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [anchorRef, onClose])

  return createPortal(
    <div className="theme" style={portalThemeStyle}>
      <div
        ref={ref}
        className="theme-doc-editor__color-popover theme-doc-editor__color-popover--portal"
        role="dialog"
        aria-label="Cell background color"
        style={{ zIndex: 1200 }}
      >
        <ColorSelector
          className="theme-color-selector--popover"
          value={sessionColor}
          onChange={handleColorChange}
        />
      </div>
    </div>,
    document.body,
  )
}

function TableCellActionMenuContainer({
  anchorElem,
  cellMerge,
}: {
  anchorElem: HTMLElement
  cellMerge: boolean
}) {
  const [editor] = useLexicalComposerContext()
  const menuContainerRef = useRef<HTMLDivElement>(null)
  const cascadeAnchorRef = useRef<HTMLDivElement>(null)
  const [tableCellNode, setTableCellNode] = useState<TableCellNode | null>(null)
  const [selectionCounts, setSelectionCounts] = useState({ columns: 1, rows: 1 })
  const [canMerge, setCanMerge] = useState(false)
  const [canUnmerge, setCanUnmerge] = useState(false)
  const [bgColor, setBgColor] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)

  const refreshMenuState = useCallback(() => {
    editor.read('latest', () => {
      const sel = $getSelection()
      if ($isTableSelection(sel)) {
        const counts = computeSelectionCount(sel)
        setSelectionCounts(counts)
        const collapsed = sel.anchor.is(sel.focus)
        setCanMerge(!collapsed && (counts.columns > 1 || counts.rows > 1))
      } else {
        setSelectionCounts({ columns: 1, rows: 1 })
        setCanMerge(false)
      }
      setCanUnmerge($canUnmerge())
      setBgColor(currentCellBgColor(editor) || '')
    })
  }, [editor])

  useEffect(() => {
    if (!tableCellNode) return
    return editor.registerMutationListener(
      TableCellNode,
      (mutations) => {
        if (mutations.get(tableCellNode.getKey()) === 'updated') {
          editor.read('latest', () => setTableCellNode(tableCellNode.getLatest()))
          refreshMenuState()
        }
      },
      { skipInitialization: true },
    )
  }, [editor, refreshMenuState, tableCellNode])

  const clearTableSelection = useCallback(() => {
    if (!tableCellNode) return
    editor.update(() => {
      if (tableCellNode.isAttached()) {
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode)
        const tableElement = getTableElement(tableNode, editor.getElementByKey(tableNode.getKey()))
        if (tableElement) {
          const obs = getTableObserverFromTableElement(tableElement)
          if (obs) obs.$clearHighlight()
        }
        tableNode.markDirty()
        setTableCellNode(tableCellNode.getLatest())
      }
      $setSelection(null)
    })
  }, [editor, tableCellNode])

  const closeMenu = useCallback(() => {
    setShowColorPicker(false)
  }, [])

  const insertRow = useCallback(
    (after: boolean) => {
      editor.update(() => {
        for (let i = 0; i < selectionCounts.rows; i++) $insertTableRowAtSelection(after)
      })
      closeMenu()
    },
    [closeMenu, editor, selectionCounts.rows],
  )

  const insertColumn = useCallback(
    (after: boolean) => {
      editor.update(() => {
        for (let i = 0; i < selectionCounts.columns; i++) $insertTableColumnAtSelection(after)
      })
      closeMenu()
    },
    [closeMenu, editor, selectionCounts.columns],
  )

  const deleteRow = useCallback(() => {
    editor.update(() => {
      $deleteTableRowAtSelection()
    })
    closeMenu()
  }, [closeMenu, editor])

  const deleteColumn = useCallback(() => {
    editor.update(() => {
      $deleteTableColumnAtSelection()
    })
    closeMenu()
  }, [closeMenu, editor])

  const deleteTable = useCallback(() => {
    if (!tableCellNode) return
    editor.update(() => {
      $getTableNodeFromLexicalNodeOrThrow(tableCellNode).remove()
      clearTableSelection()
    })
    closeMenu()
  }, [clearTableSelection, closeMenu, editor, tableCellNode])

  const mergeCells = useCallback(() => {
    editor.update(() => {
      const sel = $getSelection()
      if (!$isTableSelection(sel)) return
      const cells = sel.getNodes().filter($isTableCellNode)
      const target = $mergeCells(cells)
      if (target) $selectLastDescendant(target)
    })
    closeMenu()
  }, [closeMenu, editor])

  const unmergeCells = useCallback(() => {
    editor.update(() => {
      $unmergeCell()
    })
    clearTableSelection()
    closeMenu()
  }, [clearTableSelection, closeMenu, editor])

  const toggleRowHeader = useCallback(() => {
    if (!tableCellNode) return
    editor.update(() => {
      const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode)
      const rowIdx = $getTableRowIndexFromTableCellNode(tableCellNode)
      const [gridMap] = $computeTableMapSkipCellCheck(tableNode, null, null)
      const newStyle = tableCellNode.getHeaderStyles() ^ TableCellHeaderStates.ROW
      const seen = new Set<TableCellNode>()
      for (let col = 0; col < gridMap[rowIdx].length; col++) {
        const mc = gridMap[rowIdx][col]
        if (mc?.cell && !seen.has(mc.cell)) {
          seen.add(mc.cell)
          mc.cell.setHeaderStyles(newStyle, TableCellHeaderStates.ROW)
        }
      }
      clearTableSelection()
    })
    closeMenu()
  }, [clearTableSelection, closeMenu, editor, tableCellNode])

  const toggleColumnHeader = useCallback(() => {
    if (!tableCellNode) return
    editor.update(() => {
      const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode)
      const colIdx = $getTableColumnIndexFromTableCellNode(tableCellNode)
      const [gridMap] = $computeTableMapSkipCellCheck(tableNode, null, null)
      const newStyle = tableCellNode.getHeaderStyles() ^ TableCellHeaderStates.COLUMN
      const seen = new Set<TableCellNode>()
      for (let row = 0; row < gridMap.length; row++) {
        const mc = gridMap[row][colIdx]
        if (mc?.cell && !seen.has(mc.cell)) {
          seen.add(mc.cell)
          mc.cell.setHeaderStyles(newStyle, TableCellHeaderStates.COLUMN)
        }
      }
      clearTableSelection()
    })
    closeMenu()
  }, [clearTableSelection, closeMenu, editor, tableCellNode])

  const toggleRowStriping = useCallback(() => {
    if (!tableCellNode) return
    editor.update(() => {
      if (tableCellNode.isAttached()) {
        const tbl = $getTableNodeFromLexicalNodeOrThrow(tableCellNode)
        tbl.setRowStriping(!tbl.getRowStriping())
      }
      clearTableSelection()
    })
    closeMenu()
  }, [clearTableSelection, closeMenu, editor, tableCellNode])

  const toggleFirstRowFreeze = useCallback(() => {
    if (!tableCellNode) return
    editor.update(() => {
      if (tableCellNode.isAttached()) {
        const tbl = $getTableNodeFromLexicalNodeOrThrow(tableCellNode)
        tbl.setFrozenRows(tbl.getFrozenRows() === 0 ? 1 : 0)
      }
      clearTableSelection()
    })
    closeMenu()
  }, [clearTableSelection, closeMenu, editor, tableCellNode])

  const toggleFirstColumnFreeze = useCallback(() => {
    if (!tableCellNode) return
    editor.update(() => {
      if (tableCellNode.isAttached()) {
        const tbl = $getTableNodeFromLexicalNodeOrThrow(tableCellNode)
        tbl.setFrozenColumns(tbl.getFrozenColumns() === 0 ? 1 : 0)
      }
      clearTableSelection()
    })
    closeMenu()
  }, [clearTableSelection, closeMenu, editor, tableCellNode])

  const setCellBgColor = useCallback(
    (color: string) => {
      editor.update(() => {
        const sel = $getSelection()
        if ($isRangeSelection(sel) || $isTableSelection(sel)) {
          const [cell] = $getNodeTriplet(sel.anchor)
          if ($isTableCellNode(cell)) cell.setBackgroundColor(color)
          if ($isTableSelection(sel)) {
            for (const n of sel.getNodes()) {
              if ($isTableCellNode(n)) n.setBackgroundColor(color)
            }
          }
        }
      })
      setBgColor(color)
    },
    [editor],
  )

  const setVerticalAlign = useCallback(
    (value: string) => {
      editor.update(() => {
        const sel = $getSelection()
        if ($isRangeSelection(sel) || $isTableSelection(sel)) {
          const [cell] = $getNodeTriplet(sel.anchor)
          if ($isTableCellNode(cell)) cell.setVerticalAlign(value)
          if ($isTableSelection(sel)) {
            for (const n of sel.getNodes()) {
              if ($isTableCellNode(n)) n.setVerticalAlign(value)
            }
          }
        }
      })
      closeMenu()
    },
    [closeMenu, editor],
  )

  const handleCascadeSelect = useCallback(
    (id: string) => {
      switch (id) {
        case 'merge-cells':
          mergeCells()
          break
        case 'unmerge-cells':
          unmergeCells()
          break
        case 'background-color':
          setShowColorPicker(true)
          break
        case 'toggle-row-striping':
          toggleRowStriping()
          break
        case 'vertical-align-top':
          setVerticalAlign('top')
          break
        case 'vertical-align-middle':
          setVerticalAlign('middle')
          break
        case 'vertical-align-bottom':
          setVerticalAlign('bottom')
          break
        case 'toggle-first-row-freeze':
          toggleFirstRowFreeze()
          break
        case 'toggle-first-column-freeze':
          toggleFirstColumnFreeze()
          break
        case 'insert-row-above':
          insertRow(false)
          break
        case 'insert-row-below':
          insertRow(true)
          break
        case 'insert-column-left':
          insertColumn(false)
          break
        case 'insert-column-right':
          insertColumn(true)
          break
        case 'delete-column':
          deleteColumn()
          break
        case 'delete-row':
          deleteRow()
          break
        case 'delete-table':
          deleteTable()
          break
        case 'toggle-row-header':
          toggleRowHeader()
          break
        case 'toggle-column-header':
          toggleColumnHeader()
          break
        default:
          break
      }
    },
    [
      deleteColumn,
      deleteRow,
      deleteTable,
      insertColumn,
      insertRow,
      mergeCells,
      setVerticalAlign,
      toggleColumnHeader,
      toggleFirstColumnFreeze,
      toggleFirstRowFreeze,
      toggleRowHeader,
      toggleRowStriping,
      unmergeCells,
    ],
  )

  const isRowHeader =
    tableCellNode != null &&
    (tableCellNode.__headerState & TableCellHeaderStates.ROW) === TableCellHeaderStates.ROW
  const isColHeader =
    tableCellNode != null &&
    (tableCellNode.__headerState & TableCellHeaderStates.COLUMN) === TableCellHeaderStates.COLUMN

  const cascadeItems = useMemo(
    () =>
      buildTableCascadeItems({
        cellMerge,
        canMerge,
        canUnmerge,
        selectionCounts,
        isRowHeader,
        isColHeader,
      }),
    [canMerge, canUnmerge, cellMerge, isColHeader, isRowHeader, selectionCounts],
  )

  const $moveMenu = useCallback(() => {
    const container = menuContainerRef.current
    const sel = $getSelection()
    const nativeSel = getDOMSelection(window)

    function disable() {
      if (container) {
        container.classList.remove('theme-doc-editor__table-cell-action-container--active')
        container.classList.add('theme-doc-editor__table-cell-action-container--inactive')
      }
      setTableCellNode(null)
      setShowColorPicker(false)
    }

    if (!sel || !container) return disable()

    const rootEl = editor.getRootElement()
    let tableObserver: TableObserver | null = null
    let cellDOM: HTMLElement | null = null

    if ($isRangeSelection(sel) && rootEl && nativeSel && rootEl.contains(nativeSel.anchorNode)) {
      const cellNode = $getTableCellNodeFromLexicalNode(sel.anchor.getNode())
      if (!cellNode) return disable()

      cellDOM = editor.getElementByKey(cellNode.getKey())
      if (!cellDOM || !cellNode.isAttached()) return disable()

      const tableNode = $getTableNodeFromLexicalNodeOrThrow(cellNode)
      const tableEl = getTableElement(tableNode, editor.getElementByKey(tableNode.getKey()))
      if (!tableEl) return disable()

      tableObserver = getTableObserverFromTableElement(tableEl)
      setTableCellNode(cellNode)
    } else if ($isTableSelection(sel)) {
      const anchorNode = $getTableCellNodeFromLexicalNode(sel.anchor.getNode())
      if (!$isTableCellNode(anchorNode)) return disable()

      const tableNode = $getTableNodeFromLexicalNodeOrThrow(anchorNode)
      const tableEl = getTableElement(tableNode, editor.getElementByKey(tableNode.getKey()))
      if (!tableEl) return disable()

      tableObserver = getTableObserverFromTableElement(tableEl)
      cellDOM = editor.getElementByKey(anchorNode.getKey())
      if (!cellDOM) return disable()
    } else {
      return disable()
    }

    if (!tableObserver || !cellDOM) return disable()

    refreshMenuState()

    const enabled = !tableObserver.isSelecting
    container.classList.toggle('theme-doc-editor__table-cell-action-container--active', enabled)
    container.classList.toggle('theme-doc-editor__table-cell-action-container--inactive', !enabled)

    if (enabled) {
      const cellRect = cellDOM.getBoundingClientRect()
      const anchorRect = anchorElem.getBoundingClientRect()
      const top = cellRect.top - anchorRect.top
      const left = cellRect.right - anchorRect.left
      container.style.transform = `translate(${left}px, ${top}px)`
    }
  }, [anchorElem, editor, refreshMenuState])

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const cb = () => {
      timeoutId = undefined
      editor.read('latest', $moveMenu)
    }
    const delayed = () => {
      if (timeoutId === undefined) timeoutId = setTimeout(cb, 0)
      return false
    }

    return mergeRegister(
      editor.registerUpdateListener(delayed),
      editor.registerCommand(SELECTION_CHANGE_COMMAND, delayed, COMMAND_PRIORITY_CRITICAL),
      editor.registerRootListener((root) => {
        if (root) {
          delayed()
          const handler = () => delayed()
          root.addEventListener('pointerup', handler)
          return () => root.removeEventListener('pointerup', handler)
        }
      }),
      () => clearTimeout(timeoutId),
    )
  })

  const prevCell = useRef(tableCellNode)
  useEffect(() => {
    if (prevCell.current !== tableCellNode) {
      setShowColorPicker(false)
    }
    prevCell.current = tableCellNode
  }, [tableCellNode])

  return (
    <div
      ref={menuContainerRef}
      className="theme-doc-editor__table-cell-action-container theme-doc-editor__table-cell-action-container--inactive"
    >
      {tableCellNode != null && (
        <>
          <div ref={cascadeAnchorRef} className="theme-doc-editor__table-cell-cascade">
            <CascadeMenuButton
              label="Table cell actions"
              icon={ChevronDown}
              iconOnly
              variant="ghost"
              size="xxs"
              menuSize="compact"
              scrollRail="hidden"
              scrollClouds
              triggerClassName="theme-doc-editor__table-cell-action-btn"
              items={cascadeItems}
              onSelect={handleCascadeSelect}
            />
          </div>
          {showColorPicker && (
            <TableColorPopover
              value={bgColor}
              onChange={(color) => {
                setCellBgColor(color)
                setShowColorPicker(false)
              }}
              onClose={() => setShowColorPicker(false)}
              anchorRef={cascadeAnchorRef}
            />
          )}
        </>
      )}
    </div>
  )
}

export const DocEditorTableActionMenu: FC<{ cellMerge?: boolean; anchorElem: HTMLElement }> =
  function DocEditorTableActionMenu({ cellMerge = true, anchorElem }) {
    const isEditable = useLexicalEditable()
    if (!isEditable) return null
    return createPortal(
      <TableCellActionMenuContainer cellMerge={cellMerge} anchorElem={anchorElem} />,
      anchorElem,
    )
  }
