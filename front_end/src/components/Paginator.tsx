import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ButtonSize, ButtonVariant } from '../lib/ui/buttonStyles'
import { getPageRange } from '../lib/pagination/pagination'
import {
  paginatorVariantClass,
  paginatorVariantConfig,
  type PaginatorVariant,
} from '../lib/pagination/paginatorVariants'
import { Button } from './Button'
import { TypeAnimText } from './TypeAnimText'

type PaginatorProps = {
  /** 1-based current page */
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  variant?: PaginatorVariant
  size?: ButtonSize
  /** Pages shown on each side of the current page (numbered / icons / compact) */
  siblingCount?: number
  prevLabel?: string
  nextLabel?: string
  /** `arrows` only — show `page / total` between chevrons */
  showTotal?: boolean
  /** `minimal` summary — `words` (Page n of m) or `slash` (n / m) */
  summaryFormat?: 'words' | 'slash'
  /** Summary only — click the current page number to type a page (clamped to `totalPages`) */
  editableSummary?: boolean
  /** Prev/next control style — default `outline`; use `ghost` to match icon toolbars */
  navVariant?: ButtonVariant
  disabled?: boolean
  className?: string
  'aria-label'?: string
  debug?: boolean
}

type PaginatorNavProps = {
  direction: 'prev' | 'next'
  page: number
  totalPages: number
  nav: 'text' | 'icon'
  navVariant: ButtonVariant
  size: ButtonSize
  prevLabel: string
  nextLabel: string
  disabled?: boolean
  onPageChange: (page: number) => void
}

function PaginatorNav({
  direction,
  page,
  totalPages,
  nav,
  navVariant,
  size,
  prevLabel,
  nextLabel,
  disabled = false,
  onPageChange,
}: PaginatorNavProps) {
  const isPrev = direction === 'prev'
  const atBoundary = isPrev ? page <= 1 : page >= totalPages
  const label = isPrev ? prevLabel : nextLabel
  const targetPage = isPrev ? page - 1 : page + 1

  if (nav === 'icon') {
    const Icon = isPrev ? ChevronLeft : ChevronRight
    return (
      <Button
        variant={navVariant}
        size={size}
        icon={Icon}
        disabled={disabled || atBoundary || totalPages < 1}
        aria-label={label}
        onClick={() => onPageChange(targetPage)}
      />
    )
  }

  return (
    <Button
      variant={navVariant}
      size={size}
      disabled={disabled || atBoundary || totalPages < 1}
      onClick={() => onPageChange(targetPage)}
    >
      {label}
    </Button>
  )
}

type PaginatorPagesProps = {
  page: number
  totalPages: number
  size: ButtonSize
  siblingCount: number
  disabled?: boolean
  onPageChange: (page: number) => void
}

type PaginatorPageCellProps = {
  pageNum: number
  currentPage: number
  size: ButtonSize
  disabled?: boolean
  onPageChange: (page: number) => void
}

function PaginatorPageCell({
  pageNum,
  currentPage,
  size,
  disabled = false,
  onPageChange,
}: PaginatorPageCellProps) {
  const isActive = pageNum === currentPage

  return (
    <Button
      variant="outline"
      size={size}
      active={isActive}
      disabled={disabled}
      className="theme-paginator__page-btn"
      aria-current={isActive ? 'page' : undefined}
      onClick={() => onPageChange(pageNum)}
    >
      {isActive ? (
        <TypeAnimText
          key={`active-${pageNum}`}
          anim="flip"
          trigger="enter"
          split="chars"
          className="theme-paginator__page-num"
        >
          {String(pageNum)}
        </TypeAnimText>
      ) : (
        <span className="theme-paginator__page-num">{pageNum}</span>
      )}
    </Button>
  )
}

function PaginatorPages({
  page,
  totalPages,
  size,
  siblingCount,
  disabled = false,
  onPageChange,
}: PaginatorPagesProps) {
  const items = getPageRange(page, totalPages, siblingCount)

  return (
    <div className="theme-paginator__pages-track" role="group" aria-label="Page numbers">
      {items.map((item, index) =>
        item === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className="theme-paginator__ellipsis" aria-hidden>
            …
          </span>
        ) : (
          <PaginatorPageCell
            key={item}
            pageNum={item}
            currentPage={page}
            size={size}
            disabled={disabled}
            onPageChange={onPageChange}
          />
        ),
      )}
    </div>
  )
}

function PaginatorEditablePage({
  page,
  totalPages,
  disabled = false,
  onPageChange,
}: {
  page: number
  totalPages: number
  disabled?: boolean
  onPageChange: (page: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(page))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(String(page))
  }, [editing, page])

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  function commit() {
    const parsed = Number.parseInt(draft.trim(), 10)
    if (Number.isFinite(parsed)) {
      const clamped = Math.min(Math.max(1, parsed), Math.max(totalPages, 1))
      onPageChange(clamped)
      setDraft(String(clamped))
    } else {
      setDraft(String(page))
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        className="theme-paginator__summary-input"
        value={draft}
        aria-label="Current page"
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, ''))}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit()
          } else if (event.key === 'Escape') {
            setDraft(String(page))
            setEditing(false)
          }
        }}
      />
    )
  }

  return (
    <button
      type="button"
      className="theme-paginator__summary-page theme-paginator__summary-page--editable"
      disabled={disabled || totalPages < 1}
      aria-label={`Page ${page}, edit page number`}
      onClick={() => setEditing(true)}
    >
      {page}
    </button>
  )
}

function PaginatorSummary({
  page,
  totalPages,
  variant,
  summaryFormat = 'words',
  editableSummary = false,
  disabled = false,
  onPageChange,
}: {
  page: number
  totalPages: number
  variant: PaginatorVariant
  summaryFormat?: 'words' | 'slash'
  editableSummary?: boolean
  disabled?: boolean
  onPageChange: (page: number) => void
}) {
  const pageText = String(page)
  const useSlash = summaryFormat === 'slash'

  const pageNode = editableSummary ? (
    <PaginatorEditablePage
      page={page}
      totalPages={totalPages}
      disabled={disabled}
      onPageChange={onPageChange}
    />
  ) : (
    <TypeAnimText
      key={`summary-page-${page}`}
      anim="flip"
      trigger="enter"
      split="chars"
      className="theme-paginator__summary-page"
    >
      {pageText}
    </TypeAnimText>
  )

  return (
    <span className="theme-paginator__summary type-body-sm">
      {useSlash ? (
        <>
          {pageNode}
          {' / '}
          <span className="theme-paginator__summary-total">{totalPages}</span>
        </>
      ) : variant === 'minimal' ? (
        <>
          Page {pageNode} of{' '}
          <span className="theme-paginator__summary-total">{totalPages}</span>
        </>
      ) : (
        <>
          {pageNode}
          {' / '}
          <span className="theme-paginator__summary-total">{totalPages}</span>
        </>
      )}
    </span>
  )
}

export function Paginator({
  page,
  totalPages,
  onPageChange,
  variant = 'numbered',
  size: sizeProp,
  siblingCount: siblingCountProp,
  prevLabel = 'Previous',
  nextLabel = 'Next',
  showTotal = false,
  summaryFormat = 'words',
  editableSummary = false,
  navVariant = 'outline',
  disabled = false,
  className = '',
  'aria-label': ariaLabel = 'Pagination',
  debug = false,
}: PaginatorProps) {
  const config = paginatorVariantConfig[variant]
  const size = sizeProp ?? config.defaultSize
  const siblingCount = siblingCountProp ?? config.siblingCount
  const safePage = totalPages < 1 ? 1 : Math.min(Math.max(1, page), totalPages)

  const goToPage = (next: number) => {
    const clamped = Math.min(Math.max(1, next), Math.max(totalPages, 1))
    if (debug) {
      console.debug('[Paginator]', { variant, from: safePage, to: clamped, totalPages })
    }
    if (clamped !== safePage) {
      onPageChange(clamped)
    }
  }

  const showPages = config.showPages && totalPages > 0
  const showSummary =
    (config.showSummary && totalPages > 0) || (variant === 'arrows' && showTotal && totalPages > 0)

  return (
    <nav
      aria-label={ariaLabel}
      className={['theme-paginator', paginatorVariantClass(variant), className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="theme-paginator__shell">
        <div className="theme-paginator__prev">
          <PaginatorNav
            direction="prev"
            page={safePage}
            totalPages={totalPages}
            nav={config.nav}
            navVariant={navVariant}
            size={size}
            prevLabel={prevLabel}
            nextLabel={nextLabel}
            disabled={disabled}
            onPageChange={goToPage}
          />
        </div>

        {showPages ? (
          <div className="theme-paginator__pages">
            <PaginatorPages
              page={safePage}
              totalPages={totalPages}
              size={size}
              siblingCount={siblingCount}
              disabled={disabled}
              onPageChange={goToPage}
            />
          </div>
        ) : showSummary ? (
          <div className="theme-paginator__pages">
            <PaginatorSummary
              page={safePage}
              totalPages={totalPages}
              variant={variant}
              summaryFormat={summaryFormat}
              editableSummary={editableSummary}
              disabled={disabled}
              onPageChange={goToPage}
            />
          </div>
        ) : null}

        <div className="theme-paginator__next">
          <PaginatorNav
            direction="next"
            page={safePage}
            totalPages={totalPages}
            nav={config.nav}
            navVariant={navVariant}
            size={size}
            prevLabel={prevLabel}
            nextLabel={nextLabel}
            disabled={disabled}
            onPageChange={goToPage}
          />
        </div>
      </div>
    </nav>
  )
}
