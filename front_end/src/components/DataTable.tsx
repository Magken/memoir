import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, ArrowDownUp, ArrowUp, Download, FileJson, Filter, RefreshCw } from 'lucide-react'
import {
  ROW_INDEX_COLUMN_KEY,
  buildScopedTableCsv,
  buildScopedTableJson,
  rowIdsInRange,
  toCellKey,
  columnSupportsSort,
  countActiveFilters,
  countActiveFiltersForColumn,
  countAllFilterRules,
  filterRowsByColumnState,
  formatValueForDisplay,
  DATA_TYPES,
  dataTypeIcon,
  resolveColumnDataType,
  scrollDataTableCellIntoView,
  sortRowsSingleColumn,
  toggleSortState,
  triggerTableDownload,
  dataTablePageCount,
  dataTablePageRange,
  dataTablePageSlice,
  clampDataTablePage,
  EMPTY_SORT_STATE,
  type DataColumn,
  type DataFilterRule,
  type DataFiltersState,
  type DataRow,
  type DataTableSheet,
  type DataTableVariant,
  type TableCellKey,
  type TableSortState,
} from '../lib/data'
import type { PaginatorVariant } from '../lib/pagination/paginatorVariants'
import { Badge } from './Badge'
import { Button } from './Button'
import { ButtonGroup } from './ButtonGroup'
import { Checkbox } from './Checkbox'
import { DataColumnFilterMenu } from './DataColumnFilterMenu'
import { DataTableCell } from './DataTableCell'
import { IconButton } from './IconButton'
import { Paginator } from './Paginator'
import { ThemeScroll } from './ThemeScroll'
import { Tooltip } from './Tooltip'
import type { ScrollRailType } from '../lib/scroll/scrollRail'

type DataTableProps = {
  /** Stable id for export payloads. */
  tableKey: string
  columns: DataColumn[]
  rows: DataRow[]
  /** Workbook tabs — switches the active column/row set. */
  sheets?: DataTableSheet[]
  title?: ReactNode
  subtitle?: ReactNode
  ariaLabel?: string
  emptyMessage?: ReactNode
  exportBasename?: string
  enableColumnFilters?: boolean
  enableColumnSort?: boolean
  enableSelection?: boolean
  enableDownload?: boolean
  enableJsonExport?: boolean
  showRowIndexColumn?: boolean
  csvIncludeTypeRow?: boolean
  compact?: boolean
  scrollRail?: ScrollRailType
  /** `spreadsheet` workbook grid (default) · `dashboard` compact CMS admin grid */
  variant?: DataTableVariant
  onBooleanChange?: (rowId: string, columnKey: string, next: boolean) => void
  onAction?: (rowId: string, actionId: string, columnKey: string) => void
  /** Top-bar refresh — parent refetches or resets row data. */
  onRefresh?: () => void
  /** Rows per page — when set (> 0), footer pagination slices the filtered/sorted row set. */
  pageSize?: number
  /** Paginator layout in the footer. Default `minimal` (icon prev/next + page summary). */
  paginationVariant?: PaginatorVariant
  className?: string
  debug?: boolean
}

const alignTextClass = (align?: DataColumn['align']) =>
  align === 'center' ? 'text-center' : align === 'end' ? 'text-right' : 'text-left'

export function DataTable({
  tableKey,
  columns,
  rows,
  sheets,
  title,
  subtitle,
  ariaLabel = 'Data table',
  emptyMessage = 'No rows.',
  exportBasename = 'export',
  enableColumnFilters = true,
  enableColumnSort = true,
  enableSelection = true,
  enableDownload = true,
  enableJsonExport = true,
  showRowIndexColumn,
  csvIncludeTypeRow = true,
  compact,
  scrollRail = 'mini',
  variant = 'spreadsheet',
  onBooleanChange,
  onAction,
  onRefresh,
  pageSize,
  paginationVariant,
  className = '',
  debug = false,
}: DataTableProps) {
  const isDashboard = variant === 'dashboard'
  const useRowIndex = showRowIndexColumn ?? !isDashboard
  const useCompact = compact ?? isDashboard
  const sheetGroupVariant = isDashboard ? 'compact' : 'scroll'
  const paginationOn = pageSize != null && pageSize > 0
  const paginatorVariant = paginationVariant ?? 'minimal'
  const [activeSheetId, setActiveSheetId] = useState<string>(() => sheets?.[0]?.id ?? 'default')
  const activeSheet = useMemo(
    () => sheets?.find((sheet) => sheet.id === activeSheetId) ?? null,
    [sheets, activeSheetId],
  )
  const sourceColumns = activeSheet?.columns ?? columns
  const sourceRows = activeSheet?.rows ?? rows

  const displayColumns = useMemo<DataColumn[]>(() => {
    const ri: DataColumn[] = useRowIndex
      ? [{ key: ROW_INDEX_COLUMN_KEY, header: '#', dataType: 'integer', minWidth: '2.75rem', align: 'end' }]
      : []
    return [...ri, ...sourceColumns]
  }, [sourceColumns, useRowIndex])

  const rowsWithIndexValues = useMemo<DataRow[]>(() => {
    if (!useRowIndex) return sourceRows
    return sourceRows.map((r, i) => ({ ...r, values: { ...r.values, [ROW_INDEX_COLUMN_KEY]: i + 1 } }))
  }, [sourceRows, useRowIndex])

  const [filters, setFilters] = useState<DataFiltersState>({})
  const [openFilterColumnKey, setOpenFilterColumnKey] = useState<string | null>(null)
  const [selectedColumnKey, setSelectedColumnKey] = useState<string | null>(null)
  const filterAnchorRef = useRef<HTMLElement | null>(null)
  const scrollViewportRef = useRef<HTMLDivElement | null>(null)
  const rowShiftRef = useRef(false)

  const [sortState, setSortState] = useState<TableSortState>(EMPTY_SORT_STATE)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [rowAnchor, setRowAnchor] = useState<string | null>(null)
  const [expandedCellKey, setExpandedCellKey] = useState<TableCellKey | null>(null)
  const [focusedCellKey, setFocusedCellKey] = useState<TableCellKey | null>(null)
  const [page, setPage] = useState(1)

  const dismissFilterOnScroll = useCallback(() => {
    setOpenFilterColumnKey(null)
  }, [])

  const scrollTableToTop = useCallback(() => {
    const viewport = scrollViewportRef.current
    if (!viewport) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    viewport.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [])

  useEffect(() => {
    const viewport = scrollViewportRef.current
    if (!viewport) return
    viewport.addEventListener('scroll', dismissFilterOnScroll, { passive: true })
    return () => viewport.removeEventListener('scroll', dismissFilterOnScroll)
  }, [dismissFilterOnScroll])

  useEffect(() => {
    if (expandedCellKey == null && focusedCellKey == null) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (target?.closest('.theme-data-table__data-cell')) return
      if (target?.closest('.theme-data-table__cell-host--expanded')) return
      if (target?.closest('.theme-data-table-scroll')) return
      setExpandedCellKey(null)
      setFocusedCellKey(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [expandedCellKey, focusedCellKey])

  useEffect(() => {
    setFilters({})
    setOpenFilterColumnKey(null)
    setSelectedColumnKey(null)
    setSortState(EMPTY_SORT_STATE)
    setSelectedIds(new Set())
    setRowAnchor(null)
    setExpandedCellKey(null)
    setFocusedCellKey(null)
    setPage(1)
  }, [activeSheetId])

  useEffect(() => {
    setPage(1)
  }, [filters, sortState])

  const filteredRows = useMemo(() => {
    if (!enableColumnFilters || countAllFilterRules(filters) === 0) return rowsWithIndexValues
    return filterRowsByColumnState(rowsWithIndexValues, displayColumns, filters)
  }, [rowsWithIndexValues, displayColumns, filters, enableColumnFilters])

  const displayedRows = useMemo(() => {
    if (!enableColumnSort || !sortState.columnKey || !sortState.direction) return filteredRows
    const col = displayColumns.find((c) => c.key === sortState.columnKey)
    if (!col || !columnSupportsSort(col.dataType)) return filteredRows
    return sortRowsSingleColumn(filteredRows, col, sortState.direction)
  }, [filteredRows, displayColumns, sortState, enableColumnSort])

  const totalRowCount = displayedRows.length
  const totalPages = paginationOn ? dataTablePageCount(totalRowCount, pageSize!) : 1
  const safePage = paginationOn ? clampDataTablePage(page, totalPages) : 1

  useEffect(() => {
    if (safePage !== page) setPage(safePage)
  }, [safePage, page])

  const tableRows = useMemo(() => {
    if (!paginationOn) return displayedRows
    return dataTablePageSlice(displayedRows, safePage, pageSize!)
  }, [displayedRows, paginationOn, safePage, pageSize])

  const showPagination = paginationOn && totalRowCount > pageSize!
  const pageRange = paginationOn ? dataTablePageRange(totalRowCount, safePage, pageSize!) : { start: 0, end: 0 }

  const handlePageChange = useCallback(
    (next: number) => {
      setPage(clampDataTablePage(next, totalPages))
      setExpandedCellKey(null)
      setFocusedCellKey(null)
      scrollTableToTop()
    },
    [totalPages, scrollTableToTop],
  )

  useLayoutEffect(() => {
    const scrollKey = focusedCellKey ?? expandedCellKey
    if (!scrollKey) return
    const viewport = scrollViewportRef.current
    if (!viewport) return

    const isExpanded = expandedCellKey === scrollKey

    const runScroll = () => {
      const cell = viewport.querySelector<HTMLElement>(`[data-cell-key="${scrollKey}"]`)
      if (!cell) return
      scrollDataTableCellIntoView(viewport, cell, {
        axis: isExpanded ? 'horizontal' : 'both',
      })
    }

    runScroll()
    if (isExpanded) {
      requestAnimationFrame(runScroll)
    }
  }, [focusedCellKey, expandedCellKey, tableRows])

  const pageRowIds = useMemo(() => tableRows.map((r) => r.id), [tableRows])
  const allIds = useMemo(() => displayedRows.map((r) => r.id), [displayedRows])

  useEffect(() => {
    setSelectedIds((prev) => {
      const allowed = new Set(allIds)
      const next = new Set<string>()
      prev.forEach((id) => allowed.has(id) && next.add(id))
      return next.size === prev.size ? prev : next
    })
  }, [allIds])

  const totalActiveFilters = useMemo(() => countActiveFilters(filters), [filters])
  const totalFilterRules = useMemo(() => countAllFilterRules(filters), [filters])
  const allSelected = pageRowIds.length > 0 && pageRowIds.every((id) => selectedIds.has(id))

  const selectionSummary =
    enableSelection && selectedIds.size > 0
      ? `${selectedIds.size} of ${displayedRows.length} selected`
      : showPagination
        ? `${pageRange.start}–${pageRange.end} of ${totalRowCount} row${totalRowCount === 1 ? '' : 's'}`
        : `${displayedRows.length} visible row${displayedRows.length === 1 ? '' : 's'}`

  const hasSelectionHighlight = enableSelection && selectedIds.size > 0

  const toggleRow = useCallback((id: string, shiftKey: boolean) => {
    if (shiftKey && rowAnchor) {
      setSelectedIds(new Set(rowIdsInRange(displayedRows, rowAnchor, id)))
      setRowAnchor(id)
      return
    }
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setRowAnchor(id)
  }, [displayedRows, rowAnchor])

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allOnPage = pageRowIds.length > 0 && pageRowIds.every((id) => prev.has(id))
      const next = new Set(prev)
      if (allOnPage) pageRowIds.forEach((id) => next.delete(id))
      else pageRowIds.forEach((id) => next.add(id))
      return next
    })
    setRowAnchor(null)
  }, [pageRowIds])

  const updateColumnRules = useCallback((colKey: string, nextRules: DataFilterRule[]) => {
    setFilters((prev) => {
      const copy = { ...prev }
      if (nextRules.length === 0) delete copy[colKey]
      else copy[colKey] = nextRules
      return copy
    })
  }, [])

  const handleSortClick = useCallback((col: DataColumn) => {
    if (!columnSupportsSort(col.dataType)) return
    setSortState((prev) => toggleSortState(prev, col.key))
  }, [])

  const toggleColumnSelection = useCallback((colKey: string) => {
    setSelectedColumnKey((prev) => {
      if (prev === colKey) {
        setOpenFilterColumnKey((open) => (open === colKey ? null : open))
        return null
      }
      setOpenFilterColumnKey((open) => (open != null && open !== colKey ? null : open))
      return colKey
    })
  }, [])

  useEffect(() => {
    if (openFilterColumnKey != null) setSelectedColumnKey(openFilterColumnKey)
  }, [openFilterColumnKey])

  const exportRows = useCallback(() => {
    return selectedIds.size === 0 ? displayedRows : displayedRows.filter((r) => selectedIds.has(r.id))
  }, [displayedRows, selectedIds])

  const mergedValues = useCallback(
    (row: DataRow, positionInFullList: number): Record<string, unknown> => {
      const base = { ...row.values }
      if (showRowIndexColumn) base[ROW_INDEX_COLUMN_KEY] = positionInFullList + 1
      return base
    },
    [showRowIndexColumn],
  )

  const handleExportCsv = useCallback(() => {
    const target = exportRows()
    if (target.length === 0) return
    const valueRows = target.map((row) => {
      const pos = sourceRows.findIndex((r) => r.id === row.id)
      return { values: mergedValues(row, pos >= 0 ? pos : 0) }
    })
    const csv = buildScopedTableCsv(displayColumns, valueRows, { includeTypeRow: csvIncludeTypeRow })
    triggerTableDownload(`${exportBasename}.csv`, csv, 'text/csv;charset=utf-8')
  }, [exportRows, sourceRows, mergedValues, displayColumns, csvIncludeTypeRow, exportBasename])

  const handleExportJson = useCallback(() => {
    const target = exportRows()
    if (target.length === 0) return
    const typedRows = target.map((row) => {
      const pos = sourceRows.findIndex((r) => r.id === row.id)
      return { rowId: row.id, rowIndex: pos >= 0 ? pos + 1 : 0, values: mergedValues(row, pos >= 0 ? pos : 0) }
    })
    const payload = buildScopedTableJson(tableKey, displayColumns, sourceColumns, typedRows)
    triggerTableDownload(`${exportBasename}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8')
  }, [exportRows, sourceRows, mergedValues, displayColumns, sourceColumns, tableKey, exportBasename])

  const handleRefresh = useCallback(() => {
    setExpandedCellKey(null)
    setFocusedCellKey(null)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    scrollViewportRef.current?.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
    onRefresh?.()
  }, [onRefresh])

  if (debug) {
    console.debug('[DataTable]', {
      tableKey,
      sheet: activeSheetId,
      rows: sourceRows.length,
      shown: displayedRows.length,
      page: safePage,
      totalPages,
      pageSize,
      filters: totalFilterRules,
      sort: sortState,
      selectedRows: selectedIds.size,
    })
  }

  const showTopbarActions = enableDownload || enableColumnFilters || enableSelection
  const hasSheets = sheets != null && sheets.length > 0
  const showTopbar = title != null || subtitle != null || showTopbarActions || hasSheets
  const showTopbarMenu = showTopbarActions
  const showTopbarLeading =
    title != null || subtitle != null || (hasSheets && activeSheet != null)
  const showTopbarDivider = showTopbarLeading && showTopbarMenu
  const showFrame = showTopbar || (sheets != null && sheets.length > 0) || enableSelection
  const showFooter = enableSelection || hasSheets || showPagination
  const showReset = enableColumnFilters && totalFilterRules > 0
  const openFilterColumn =
    openFilterColumnKey != null ? displayColumns.find((c) => c.key === openFilterColumnKey) ?? null : null

  const tableScroll = (
    <div className="theme-data-table__grid-shell">
      <ThemeScroll
        rail={scrollRail}
        viewportRef={scrollViewportRef}
        className={[
          'theme-data-table-scroll',
          useCompact ? 'theme-data-table-scroll--compact' : '',
          isDashboard ? 'theme-data-table-scroll--dashboard' : '',
          showFrame ? 'theme-data-table-scroll--framed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <table
          className={['theme-data-table', isDashboard ? 'theme-data-table--dashboard' : ''].filter(Boolean).join(' ')}
          data-header-expanded={selectedColumnKey != null ? 'true' : undefined}
        >
        <colgroup>
          {enableSelection ? <col className="theme-data-table__col-select" /> : null}
          {displayColumns.map((col) => (
            <col
              key={col.key}
              className={col.key === ROW_INDEX_COLUMN_KEY ? 'theme-data-table__col-index' : undefined}
            />
          ))}
        </colgroup>
        <thead>
          <tr>
            {enableSelection ? (
              <th scope="col" className="theme-data-table__select-head">
                <span className="flex items-center justify-center">
                  <Checkbox
                    size="md"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all rows"
                    className="theme-data-table__checkbox"
                  />
                </span>
              </th>
            ) : null}
            {displayColumns.map((col) => {
              const isRowIndex = col.key === ROW_INDEX_COLUMN_KEY
              const dataType = resolveColumnDataType(col)
              const dataTypeLabel = DATA_TYPES[dataType].label
              const sortable = enableColumnSort && columnSupportsSort(col.dataType) && !isRowIndex
              const filterable = enableColumnFilters && !isRowIndex
              const activeCount = countActiveFiltersForColumn(filters, col.key)
              const sortActive = sortState.columnKey === col.key
              const sortAsc = sortActive && sortState.direction === 'asc'
              const sortDesc = sortActive && sortState.direction === 'desc'
              const columnSelected = selectedColumnKey === col.key
              const ColumnTypeIcon = isRowIndex ? null : dataTypeIcon(dataType)
              return (
                <th
                  key={col.key}
                  scope="col"
                  data-column-selected={columnSelected ? 'true' : undefined}
                  className={[
                    isRowIndex ? 'theme-data-table__index-head' : 'theme-data-table__data-head',
                    'theme-data-table__head-cell',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-pressed={columnSelected}
                  tabIndex={0}
                  onClick={() => toggleColumnSelection(col.key)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      toggleColumnSelection(col.key)
                    }
                  }}
                >
                  <span className="theme-data-table__head-stack flex min-w-0 flex-col">
                    <span className="theme-data-table__head-title-row flex min-w-0 items-center gap-1.5">
                      {ColumnTypeIcon ? (
                        <ColumnTypeIcon
                          className="theme-data-table__head-icon shrink-0"
                          aria-hidden
                          strokeWidth={2}
                        />
                      ) : null}
                      <span className="theme-data-table__head-title type-body-sm min-w-0 truncate font-semibold">
                        {col.header}
                      </span>
                      {filterable && activeCount > 0 ? (
                        <Badge tone="info" className="theme-data-table__head-filter-count tabular-nums">
                          {activeCount}
                        </Badge>
                      ) : null}
                    </span>
                    <div
                      className="theme-data-table__head-actions"
                      data-open={columnSelected ? 'true' : 'false'}
                      aria-hidden={columnSelected ? undefined : true}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <div className="theme-data-table__head-actions-inner">
                        <span className="theme-data-table__head-type type-caption type-faint font-mono">
                          {dataTypeLabel}
                        </span>
                        {sortable || filterable ? (
                          <span className="theme-data-table__head-tools flex shrink-0 items-center gap-1">
                            {sortable ? (
                              <IconButton
                                icon={sortAsc ? ArrowUp : sortDesc ? ArrowDown : ArrowDownUp}
                                aria-label={`Sort by ${col.header}`}
                                aria-pressed={sortActive}
                                size="xs"
                                variant="ghost"
                                active={sortActive}
                                className="[&_svg]:size-3.5"
                                onClick={() => handleSortClick(col)}
                              />
                            ) : null}
                            {filterable ? (
                              <span
                                ref={(el) => {
                                  if (openFilterColumnKey === col.key) filterAnchorRef.current = el
                                }}
                                className="inline-flex"
                              >
                                <IconButton
                                  icon={Filter}
                                  aria-label={`Filter ${col.header}`}
                                  aria-expanded={openFilterColumnKey === col.key}
                                  size="xs"
                                  variant="ghost"
                                  active={activeCount > 0 || openFilterColumnKey === col.key}
                                  className="[&_svg]:size-3.5"
                                  onClick={() =>
                                    setOpenFilterColumnKey((prev) => (prev === col.key ? null : col.key))
                                  }
                                />
                              </span>
                            ) : null}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sourceRows.length === 0 ? (
            <tr>
              <td colSpan={displayColumns.length + (enableSelection ? 1 : 0)}>
                <span className="type-caption type-muted block py-2">{emptyMessage}</span>
              </td>
            </tr>
          ) : displayedRows.length === 0 ? (
            <tr>
              <td colSpan={displayColumns.length + (enableSelection ? 1 : 0)}>
                <span className="type-caption type-muted block py-2">No rows match filters.</span>
              </td>
            </tr>
          ) : (
            tableRows.map((row, rowIndex) => {
              const rowSelected = selectedIds.has(row.id)
              const rowNumber =
                paginationOn && useRowIndex
                  ? (safePage - 1) * pageSize! + rowIndex + 1
                  : row.values[ROW_INDEX_COLUMN_KEY]
              return (
                <tr key={row.id} data-selected={rowSelected ? 'true' : undefined}>
                  {enableSelection ? (
                    <td className="theme-data-table__select-cell">
                      <span
                        className="flex items-center justify-center"
                        onPointerDown={(event) => {
                          rowShiftRef.current = event.shiftKey
                          if (event.shiftKey) {
                            event.preventDefault()
                            toggleRow(row.id, true)
                          }
                        }}
                      >
                        <Checkbox
                          size="md"
                          checked={rowSelected}
                          onChange={() => {
                            if (rowShiftRef.current) {
                              rowShiftRef.current = false
                              return
                            }
                            toggleRow(row.id, false)
                          }}
                          aria-label={`Select row ${row.id}`}
                          className="theme-data-table__checkbox"
                        />
                      </span>
                    </td>
                  ) : null}
                  {displayColumns.map((col) => {
                    const isRowIndex = col.key === ROW_INDEX_COLUMN_KEY
                    const cellKey = toCellKey(row.id, col.key)
                    return (
                      <td
                        key={col.key}
                        data-cell-key={isRowIndex ? undefined : cellKey}
                        data-column-selected={selectedColumnKey === col.key ? 'true' : undefined}
                        data-cell-expanded={expandedCellKey === cellKey ? 'true' : undefined}
                        data-cell-focused={focusedCellKey === cellKey ? 'true' : undefined}
                        className={[
                          isRowIndex ? 'theme-data-table__index-cell' : 'theme-data-table__data-cell',
                          alignTextClass(col.align),
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onPointerDown={
                          isRowIndex
                            ? undefined
                            : () => {
                                setFocusedCellKey(cellKey)
                                setExpandedCellKey((prev) => (prev === cellKey ? prev : null))
                              }
                        }
                      >
                        {isRowIndex ? (
                          <span className="theme-data-table__cell theme-data-table__cell-val--numeric type-mono type-tabular type-faint">
                            {formatValueForDisplay(rowNumber, 'integer')}
                          </span>
                        ) : (
                          <DataTableCell
                            row={row}
                            column={col}
                            variant={variant}
                            expanded={expandedCellKey === cellKey}
                            onToggleExpand={() => {
                              setFocusedCellKey(cellKey)
                              setExpandedCellKey((prev) => (prev === cellKey ? null : cellKey))
                            }}
                            onBooleanChange={onBooleanChange}
                            onAction={onAction}
                            debug={debug}
                          />
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
      </ThemeScroll>
    </div>
  )

  return (
    <div
      className={['theme-data-table-root flex w-full min-w-0 flex-col', className].filter(Boolean).join(' ')}
      role="region"
      aria-label={ariaLabel}
    >
      {showFrame ? (
        <div className="theme-data-table-frame theme-data-table-shell">
          {showTopbar ? (
            <div className="theme-data-table__topbar">
              {showTopbarLeading ? (
                <div className="theme-data-table__topbar-leading min-w-0">
                  {title != null || (hasSheets && activeSheet != null) ? (
                    <div className="theme-data-table__topbar-head">
                      {title != null ? (
                        <h2 className="theme-data-table__title type-h3 mb-0 truncate">{title}</h2>
                      ) : null}
                      {hasSheets && activeSheet != null ? (
                        <>
                          {title != null ? (
                            <span className="theme-data-table__sheet-sep" aria-hidden="true">
                              /
                            </span>
                          ) : null}
                          {title != null ? (
                            <span className="theme-data-table__sheet-head">
                              <span
                                className="theme-data-table__sheet-name type-label mb-0 truncate"
                                aria-current="page"
                              >
                                {activeSheet.label}
                              </span>
                              {onRefresh != null ? (
                                <Tooltip content="Refresh">
                                  <IconButton
                                    icon={RefreshCw}
                                    aria-label="Refresh"
                                    variant="ghost"
                                    size="xs"
                                    className="theme-data-table__sheet-refresh"
                                    onClick={handleRefresh}
                                  />
                                </Tooltip>
                              ) : null}
                            </span>
                          ) : (
                            <span className="theme-data-table__sheet-head">
                              <h2 className="theme-data-table__title theme-data-table__sheet-name type-h3 mb-0 truncate">
                                {activeSheet.label}
                              </h2>
                              {onRefresh != null ? (
                                <Tooltip content="Refresh">
                                  <IconButton
                                    icon={RefreshCw}
                                    aria-label="Refresh"
                                    variant="ghost"
                                    size="xs"
                                    className="theme-data-table__sheet-refresh"
                                    onClick={handleRefresh}
                                  />
                                </Tooltip>
                              ) : null}
                            </span>
                          )}
                        </>
                      ) : null}
                    </div>
                  ) : null}
                  {subtitle != null ? (
                    <p className="theme-data-table__subtitle type-body-sm type-muted mb-0 mt-1 truncate">
                      {subtitle}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {showTopbarDivider ? <div className="theme-data-table__topbar-divider" aria-hidden="true" /> : null}
              {showTopbarMenu ? (
                <div className="theme-data-table__topbar-menu">
                  {enableColumnFilters ? (
                    <div
                      className="theme-data-table__toolbar-slide"
                      data-visible={showReset ? 'true' : 'false'}
                      aria-hidden={!showReset}
                    >
                      <div className="theme-data-table__toolbar-slide__inner">
                        <Button
                          variant="outline"
                          size="sm"
                          className="theme-data-table__reset-btn"
                          onClick={() => {
                            setFilters({})
                            setOpenFilterColumnKey(null)
                            setSortState(EMPTY_SORT_STATE)
                            setSelectedColumnKey(null)
                          }}
                        >
                          Reset
                          {totalActiveFilters > 0 ? (
                            <Badge tone="info" className="theme-data-table__head-filter-count tabular-nums">
                              {totalActiveFilters}
                            </Badge>
                          ) : null}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {enableDownload ? (
                    <div className="theme-data-table__topbar-actions">
                      <Tooltip content="Download CSV">
                          <IconButton
                            icon={Download}
                            aria-label="Download CSV"
                            variant="ghost"
                            size="xs"
                            onClick={handleExportCsv}
                          />
                      </Tooltip>
                      {enableJsonExport ? (
                        <Tooltip content="Download JSON">
                          <IconButton
                            icon={FileJson}
                            aria-label="Download JSON"
                            variant="ghost"
                            size="xs"
                            onClick={handleExportJson}
                          />
                        </Tooltip>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          {tableScroll}
          {showFooter ? (
            <footer className="theme-data-table__footer">
              <div className="theme-data-table__footer-start">
                {sheets != null && sheets.length > 0 ? (
                  <ButtonGroup
                    variant={sheetGroupVariant}
                    className="theme-data-table__footer-sheets"
                    aria-label="Sheets"
                  >
                    {sheets.map((sheet) => (
                      <Button
                        key={sheet.id}
                        size="sm"
                        icon={sheet.icon}
                        labelAnim={false}
                        active={sheet.id === activeSheetId}
                        aria-pressed={sheet.id === activeSheetId}
                        onClick={() => setActiveSheetId(sheet.id)}
                      >
                        {sheet.label}
                      </Button>
                    ))}
                  </ButtonGroup>
                ) : null}
                {hasSheets && showPagination ? (
                  <span className="theme-data-table__footer-divider" aria-hidden="true" />
                ) : null}
                {showPagination ? (
                  <div className="theme-data-table__footer-pagination">
                    <Paginator
                      page={safePage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      variant={paginatorVariant}
                      size="xs"
                      aria-label="Table pages"
                      className="theme-data-table__footer-paginator"
                    />
                  </div>
                ) : null}
              </div>
              {enableSelection || showPagination ? (
                <span
                  className="theme-data-table__footer-meta type-caption type-muted tabular-nums"
                  data-active={hasSelectionHighlight ? 'true' : 'false'}
                >
                  {selectionSummary}
                </span>
              ) : (
                <span className="theme-data-table__footer-meta" aria-hidden="true" />
              )}
            </footer>
          ) : null}
        </div>
      ) : (
        <div className="theme-data-table-shell">{tableScroll}</div>
      )}

      {enableColumnFilters && openFilterColumn ? (
        <DataColumnFilterMenu
          key={openFilterColumn.key}
          column={openFilterColumn}
          rules={filters[openFilterColumn.key] ?? []}
          anchorRef={filterAnchorRef}
          isOpen
          onApply={(next) => updateColumnRules(openFilterColumn.key, next)}
          onClose={() => setOpenFilterColumnKey(null)}
          debug={debug}
        />
      ) : null}
    </div>
  )
}
