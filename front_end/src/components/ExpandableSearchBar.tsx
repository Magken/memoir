import { Search, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import type { ButtonSize } from '../lib/ui/buttonStyles'
import { FieldControlShell, fieldControlRowClass } from './FieldControlShell'
import { IconButton } from './IconButton'
import { SearchMatchMeta } from './SearchMatchMeta'

type ExpandableSearchBarProps = {
  query?: string
  defaultQuery?: string
  onQueryChange?: (query: string) => void
  matchCount?: number
  activeMatchIndex?: number
  onPrevMatch?: () => void
  onNextMatch?: () => void
  expanded?: boolean
  defaultExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  placeholder?: string
  /** Clears query (and downstream highlights) when the bar collapses — default true. */
  clearQueryOnClose?: boolean
  disabled?: boolean
  size?: ButtonSize
  /** Fixed slot — bar expands left over the toolbar without shifting siblings. */
  overlay?: boolean
  className?: string
  debug?: boolean
}

export function ExpandableSearchBar({
  query: queryProp,
  defaultQuery = '',
  onQueryChange,
  matchCount = 0,
  activeMatchIndex = 0,
  onPrevMatch,
  onNextMatch,
  expanded: expandedProp,
  defaultExpanded = false,
  onExpandedChange,
  placeholder = 'Find…',
  clearQueryOnClose = true,
  disabled = false,
  size = 'xs',
  overlay = false,
  className = '',
  debug = false,
}: ExpandableSearchBarProps) {
  const inputId = useId().replace(/:/g, '')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [internalQuery, setInternalQuery] = useState(defaultQuery)
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)

  const query = queryProp ?? internalQuery
  const expanded = expandedProp ?? internalExpanded
  const trimmedQuery = query.trim()
  const hasQuery = trimmedQuery.length > 0
  const showMeta = expanded && hasQuery
  const showStepper = showMeta && matchCount > 0

  const setQuery = useCallback(
    (next: string) => {
      if (queryProp === undefined) setInternalQuery(next)
      onQueryChange?.(next)
    },
    [onQueryChange, queryProp],
  )

  const setExpanded = useCallback(
    (next: boolean) => {
      if (expandedProp === undefined) setInternalExpanded(next)
      onExpandedChange?.(next)
      if (debug) console.debug('[ExpandableSearchBar]', { expanded: next, query })
    },
    [debug, expandedProp, onExpandedChange, query],
  )

  useEffect(() => {
    if (!expanded) return
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [expanded])

  const collapseSearch = useCallback(() => {
    if (!expanded) return
    setExpanded(false)
    if (clearQueryOnClose) setQuery('')
  }, [clearQueryOnClose, expanded, setExpanded, setQuery])

  useEffect(() => {
    if (!expanded) return
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return
      collapseSearch()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [collapseSearch, expanded])

  function handleExpand() {
    if (disabled || expanded) return
    setExpanded(true)
  }

  function handleQueryChange(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value)
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (event.shiftKey) onPrevMatch?.()
      else onNextMatch?.()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      collapseSearch()
    }
  }

  const root = (
    <div
      ref={rootRef}
      className={[
        'theme-expandable-search',
        overlay ? 'theme-expandable-search--overlay' : '',
        expanded ? 'theme-expandable-search--expanded' : '',
        showMeta ? 'theme-expandable-search--has-meta' : '',
        showStepper ? 'theme-expandable-search--has-matches' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-size={size}
    >
      <IconButton
        icon={Search}
        aria-label="Open search"
        size={size}
        variant="ghost"
        className="theme-expandable-search__trigger"
        disabled={disabled}
        aria-hidden={expanded}
        onClick={handleExpand}
      />

      <div className="theme-expandable-search__panel" role="search" aria-hidden={!expanded}>
        <div className="theme-expandable-search__panel-inner">
          <FieldControlShell
            className="theme-expandable-search__field-shell"
            rowClassName={fieldControlRowClass({ trailing: true })}
          >
            <label htmlFor={inputId} className="sr-only">
              Search
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              role="searchbox"
              className="theme-field__control theme-expandable-search__input"
              value={query}
              placeholder={placeholder}
              disabled={disabled || !expanded}
              tabIndex={expanded ? 0 : -1}
              autoComplete="off"
              onChange={handleQueryChange}
              onKeyDown={handleInputKeyDown}
            />

            <SearchMatchMeta
              hasQuery={showMeta}
              matchCount={matchCount}
              activeMatchIndex={activeMatchIndex}
              onPrevMatch={onPrevMatch}
              onNextMatch={onNextMatch}
              disabled={disabled}
            />

            <span className="theme-field__control-trailing-slot">
              <IconButton
                icon={X}
                aria-label="Close search"
                size="xs"
                variant="ghost"
                disabled={disabled || !expanded}
                onClick={collapseSearch}
              />
            </span>
          </FieldControlShell>
        </div>
      </div>
    </div>
  )

  if (overlay) {
    return <span className="theme-expandable-search-slot">{root}</span>
  }

  return root
}
