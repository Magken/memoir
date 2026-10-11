/**
 * LCL table. Index is 4 columns. Detail is Field | Value. Views is one nest column.
 */
import { Fragment } from 'react'
import { Images } from 'lucide-react'
import { ScrollEnterText } from './ScrollEnterText'
import { TypeAnimText } from './TypeAnimText'

export type LclTableColumn = {
  id: string
  label: string
  align?: 'start' | 'end'
}

export type LclTableRow = {
  id: string
  cells: string[]
  viewsLabel?: string
}

export type LclTableMode = 'index' | 'detail' | 'views'

type LclTableProps = {
  mode: LclTableMode
  columns: readonly LclTableColumn[]
  rows: readonly LclTableRow[]
  sortKey?: string | null
  sortDir?: 'asc' | 'desc' | null
  expandedId?: string | null
  expand?: { id: string; thumbs: { id: string; src: string; alt: string }[] } | null
  onSort?: (id: string) => void
  onRow?: (id: string) => void
  onViews?: (id: string) => void
  onThumb?: (rowId: string, viewId: string) => void
  onRowHover?: (id: string | null) => void
  onHeaderHover?: (id: string | null) => void
  tableRef?: (node: HTMLTableElement | null) => void
  theadRef?: (node: HTMLTableSectionElement | null) => void
  tbodyRef?: (node: HTMLTableSectionElement | null) => void
}

export function LclTable({
  mode,
  columns,
  rows,
  sortKey = null,
  sortDir = null,
  expandedId = null,
  expand = null,
  onSort,
  onRow,
  onViews,
  onThumb,
  onRowHover,
  onHeaderHover,
  tableRef,
  theadRef,
  tbodyRef,
}: LclTableProps) {
  return (
    <table ref={tableRef} className="theme-lcl-table" data-mode={mode}>
      <thead ref={theadRef}>
        <tr>
          {columns.map((col) => (
            <th
              key={col.id}
              className={col.align === 'end' ? 'theme-lcl-table__num' : undefined}
              aria-sort={sortKey === col.id ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              <button
                type="button"
                className="theme-lcl-table__head theme-hairline-fx theme-hairline-fx--eirene"
                onClick={() => onSort?.(col.id)}
                onMouseEnter={() => onHeaderHover?.(col.id)}
                onMouseLeave={() => onHeaderHover?.(null)}
                onFocus={() => onHeaderHover?.(col.id)}
                onBlur={() => onHeaderHover?.(null)}
              >
                <ScrollEnterText split="line" bind="none">
                  <TypeAnimText anim="slide-left" trigger="hover" className="type-caption mb-0">
                    {col.label}
                  </TypeAnimText>
                </ScrollEnterText>
                <span className="theme-hairline-fx__wipe" aria-hidden>
                  <span className="theme-hairline-fx__pill" />
                </span>
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody ref={tbodyRef}>
        {rows.map((row) => (
          <Fragment key={row.id}>
            <tr
              className="theme-lcl-table__row theme-hairline-fx theme-hairline-fx--eirene"
              onMouseEnter={() => onRowHover?.(row.id)}
              onMouseLeave={() => onRowHover?.(null)}
            >
              {row.cells.map((cell, index) => {
                const col = columns[index]
                const isViews = mode === 'index' && col?.id === 'views'
                const last = index === row.cells.length - 1
                return (
                  <td key={`${row.id}-${col?.id ?? index}`} className={col?.align === 'end' ? 'theme-lcl-table__num' : undefined}>
                    {isViews ? (
                      <button type="button" className="theme-lcl-table__views" onClick={() => onViews?.(row.id)}>
                        <Images size={14} strokeWidth={2} aria-hidden />
                        {expandedId === row.id ? 'Close' : row.viewsLabel ?? cell}
                      </button>
                    ) : (
                      <button type="button" className="theme-lcl-table__cell" onClick={() => onRow?.(row.id)}>
                        <ScrollEnterText split="line" bind="none">
                          {cell}
                        </ScrollEnterText>
                      </button>
                    )}
                    {last ? (
                      <span className="theme-hairline-fx__wipe" aria-hidden>
                        <span className="theme-hairline-fx__pill" />
                      </span>
                    ) : null}
                  </td>
                )
              })}
            </tr>
            {expand && expand.id === row.id ? (
              <tr className="theme-lcl-table__expand">
                <td colSpan={columns.length}>
                  <div className="theme-lcl-table__thumbs">
                    {expand.thumbs.map((thumb) => (
                      <button
                        key={thumb.id}
                        type="button"
                        className="theme-lcl-media theme-lcl-media--thumb"
                        onClick={() => onThumb?.(row.id, thumb.id)}
                      >
                        <span className="theme-lcl-media__shell theme-hairline-fx">
                          <span className="theme-lcl-media__frame">
                            <img className="theme-lcl-media__img" src={thumb.src} alt={thumb.alt} />
                          </span>
                          <span className="theme-hairline-fx__wipe" aria-hidden>
                            <span className="theme-hairline-fx__rule" />
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ) : null}
          </Fragment>
        ))}
      </tbody>
    </table>
  )
}
