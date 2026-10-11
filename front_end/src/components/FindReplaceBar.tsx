import {
  ChevronRight,
  Replace,
  ReplaceAll,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import type { FieldSize } from '../lib/forms/formControls'
import { Button } from './Button'
import { FieldControlShell, fieldControlRowClass } from './FieldControlShell'
import { IconButton } from './IconButton'
import { SearchMatchMeta } from './SearchMatchMeta'
import { Tooltip } from './Tooltip'

type FindReplaceBarProps = {
  findQuery?: string
  defaultFindQuery?: string
  onFindQueryChange?: (value: string) => void
  replaceQuery?: string
  defaultReplaceQuery?: string
  onReplaceQueryChange?: (value: string) => void
  replaceOpen?: boolean
  defaultReplaceOpen?: boolean
  onReplaceOpenChange?: (open: boolean) => void
  matchCase?: boolean
  defaultMatchCase?: boolean
  onMatchCaseChange?: (value: boolean) => void
  wholeWord?: boolean
  defaultWholeWord?: boolean
  onWholeWordChange?: (value: boolean) => void
  useRegex?: boolean
  defaultUseRegex?: boolean
  onUseRegexChange?: (value: boolean) => void
  preserveCase?: boolean
  defaultPreserveCase?: boolean
  onPreserveCaseChange?: (value: boolean) => void
  matchCount?: number
  activeMatchIndex?: number
  onPrevMatch?: () => void
  onNextMatch?: () => void
  onReplace?: () => void
  onReplaceAll?: () => void
  onClose?: () => void
  findPlaceholder?: string
  replacePlaceholder?: string
  disabled?: boolean
  size?: FieldSize
  shadowless?: boolean
  className?: string
  debug?: boolean
  autoFocus?: boolean
}

function FindToggleButton({
  label,
  tooltip,
  active,
  disabled,
  option,
  onClick,
}: {
  label: string
  tooltip: string
  active: boolean
  disabled?: boolean
  option?: string
  onClick: () => void
}) {
  return (
    <Tooltip content={tooltip} placement="bottom">
      <Button
        type="button"
        size="xxs"
        variant="tray"
        labelAnim={false}
        active={active}
        aria-pressed={active}
        disabled={disabled}
        data-option={option}
        className="theme-find-replace-bar__toggle"
        onClick={onClick}
      >
        {label}
      </Button>
    </Tooltip>
  )
}

function ActionTooltip({
  content,
  children,
  placement = 'bottom',
}: {
  content: string
  children: ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
}) {
  return (
    <Tooltip content={content} placement={placement}>
      {children}
    </Tooltip>
  )
}

export function FindReplaceBar({
  findQuery: findQueryProp,
  defaultFindQuery = '',
  onFindQueryChange,
  replaceQuery: replaceQueryProp,
  defaultReplaceQuery = '',
  onReplaceQueryChange,
  replaceOpen: replaceOpenProp,
  defaultReplaceOpen = false,
  onReplaceOpenChange,
  matchCase: matchCaseProp,
  defaultMatchCase = false,
  onMatchCaseChange,
  wholeWord: wholeWordProp,
  defaultWholeWord = false,
  onWholeWordChange,
  useRegex: useRegexProp,
  defaultUseRegex = false,
  onUseRegexChange,
  preserveCase: preserveCaseProp,
  defaultPreserveCase = false,
  onPreserveCaseChange,
  matchCount = 0,
  activeMatchIndex = 0,
  onPrevMatch,
  onNextMatch,
  onReplace,
  onReplaceAll,
  onClose,
  findPlaceholder = 'Find',
  replacePlaceholder = 'Replace',
  disabled = false,
  size = 'xs',
  shadowless = true,
  className = '',
  debug = false,
  autoFocus = false,
}: FindReplaceBarProps) {
  const findId = useId().replace(/:/g, '')
  const replaceId = useId().replace(/:/g, '')
  const findRef = useRef<HTMLInputElement>(null)

  const [internalFind, setInternalFind] = useState(defaultFindQuery)
  const [internalReplace, setInternalReplace] = useState(defaultReplaceQuery)
  const [internalReplaceOpen, setInternalReplaceOpen] = useState(defaultReplaceOpen)
  const [internalMatchCase, setInternalMatchCase] = useState(defaultMatchCase)
  const [internalWholeWord, setInternalWholeWord] = useState(defaultWholeWord)
  const [internalUseRegex, setInternalUseRegex] = useState(defaultUseRegex)
  const [internalPreserveCase, setInternalPreserveCase] = useState(defaultPreserveCase)

  const findQuery = findQueryProp ?? internalFind
  const replaceQuery = replaceQueryProp ?? internalReplace
  const replaceOpen = replaceOpenProp ?? internalReplaceOpen
  const matchCase = matchCaseProp ?? internalMatchCase
  const wholeWord = wholeWordProp ?? internalWholeWord
  const useRegex = useRegexProp ?? internalUseRegex
  const preserveCase = preserveCaseProp ?? internalPreserveCase

  const hasFindQuery = findQuery.trim().length > 0
  const canReplace = hasFindQuery && matchCount > 0 && !disabled

  const setFindQuery = useCallback(
    (next: string) => {
      if (findQueryProp === undefined) setInternalFind(next)
      onFindQueryChange?.(next)
    },
    [findQueryProp, onFindQueryChange],
  )

  const setReplaceQuery = useCallback(
    (next: string) => {
      if (replaceQueryProp === undefined) setInternalReplace(next)
      onReplaceQueryChange?.(next)
    },
    [onReplaceQueryChange, replaceQueryProp],
  )

  const setReplaceOpen = useCallback(
    (next: boolean) => {
      if (replaceOpenProp === undefined) setInternalReplaceOpen(next)
      onReplaceOpenChange?.(next)
      if (debug) console.debug('[FindReplaceBar] replaceOpen', next)
    },
    [debug, onReplaceOpenChange, replaceOpenProp],
  )

  const toggleBool = useCallback(
    (
      current: boolean,
      controlled: boolean | undefined,
      setInternal: (v: boolean) => void,
      onChange?: (v: boolean) => void,
    ) => {
      const next = !current
      if (controlled === undefined) setInternal(next)
      onChange?.(next)
    },
    [],
  )

  useEffect(() => {
    if (!autoFocus) return
    findRef.current?.focus()
  }, [autoFocus])

  function handleFindKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (event.shiftKey) onPrevMatch?.()
      else onNextMatch?.()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose?.()
    }
  }

  return (
    <div
      className={[
        'theme-find-replace-bar',
        shadowless ? 'theme-find-replace-bar--shadowless' : '',
        replaceOpen ? 'theme-find-replace-bar--replace-open' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-size={size}
      role="search"
    >
      <div className="theme-find-replace-bar__row theme-find-replace-bar__row--find">
        <ActionTooltip
          content={replaceOpen ? 'Hide replace' : 'Show replace'}
          placement="left"
        >
          <button
            type="button"
            className="theme-find-replace-bar__expand"
            aria-label={replaceOpen ? 'Hide replace' : 'Show replace'}
            aria-expanded={replaceOpen}
            disabled={disabled}
            onClick={() => setReplaceOpen(!replaceOpen)}
          >
            <ChevronRight
              aria-hidden
              strokeWidth={2.25}
              className="theme-find-replace-bar__expand-icon"
            />
          </button>
        </ActionTooltip>

        <FieldControlShell
          className="theme-find-replace-bar__field"
          rowClassName={fieldControlRowClass({ trailing: true })}
        >
          <label htmlFor={findId} className="sr-only">
            Find
          </label>
          <input
            ref={findRef}
            id={findId}
            type="text"
            className="theme-field__control theme-find-replace-bar__input"
            value={findQuery}
            placeholder={findPlaceholder}
            disabled={disabled}
            autoComplete="off"
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFindQuery(e.target.value)}
            onKeyDown={handleFindKeyDown}
          />
          <div
            className="theme-find-replace-bar__options"
            role="group"
            aria-label="Find options"
          >
            <FindToggleButton
              label="Aa"
              tooltip="Match case"
              active={matchCase}
              disabled={disabled}
              onClick={() =>
                toggleBool(matchCase, matchCaseProp, setInternalMatchCase, onMatchCaseChange)
              }
            />
            <FindToggleButton
              label="ab"
              tooltip="Match whole word"
              active={wholeWord}
              disabled={disabled}
              option="whole-word"
              onClick={() =>
                toggleBool(wholeWord, wholeWordProp, setInternalWholeWord, onWholeWordChange)
              }
            />
            <FindToggleButton
              label=".*"
              tooltip="Use regular expression"
              active={useRegex}
              disabled={disabled}
              onClick={() =>
                toggleBool(useRegex, useRegexProp, setInternalUseRegex, onUseRegexChange)
              }
            />
          </div>
        </FieldControlShell>

        <SearchMatchMeta
          className="theme-find-replace-bar__meta"
          hasQuery={hasFindQuery}
          matchCount={matchCount}
          activeMatchIndex={activeMatchIndex}
          onPrevMatch={onPrevMatch}
          onNextMatch={onNextMatch}
          disabled={disabled}
        />

        {onClose ? (
          <ActionTooltip content="Close find">
            <IconButton
              icon={X}
              aria-label="Close find"
              size="xxs"
              variant="ghost"
              className="theme-find-replace-bar__close"
              disabled={disabled}
              onClick={onClose}
            />
          </ActionTooltip>
        ) : null}
      </div>

      <div className="theme-find-replace-bar__replace-panel">
        <div className="theme-find-replace-bar__replace-panel-inner">
          <div className="theme-find-replace-bar__row theme-find-replace-bar__row--replace">
            <span className="theme-find-replace-bar__expand-spacer" aria-hidden />
            <FieldControlShell
              className="theme-find-replace-bar__field"
              rowClassName={fieldControlRowClass({ trailing: true })}
            >
              <label htmlFor={replaceId} className="sr-only">
                Replace
              </label>
              <input
                id={replaceId}
                type="text"
                className="theme-field__control theme-find-replace-bar__input"
                value={replaceQuery}
                placeholder={replacePlaceholder}
                disabled={disabled}
                autoComplete="off"
                tabIndex={replaceOpen ? 0 : -1}
                aria-hidden={!replaceOpen}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setReplaceQuery(e.target.value)}
              />
              <div
                className="theme-find-replace-bar__options"
                role="group"
                aria-label="Replace options"
              >
                <FindToggleButton
                  label="AB"
                  tooltip="Preserve case"
                  active={preserveCase}
                  disabled={disabled}
                  onClick={() =>
                    toggleBool(
                      preserveCase,
                      preserveCaseProp,
                      setInternalPreserveCase,
                      onPreserveCaseChange,
                    )
                  }
                />
              </div>
            </FieldControlShell>

            <div
              className="theme-find-replace-bar__actions"
              role="group"
              aria-label="Replace actions"
            >
              <ActionTooltip content="Replace">
                <IconButton
                  icon={Replace}
                  aria-label="Replace"
                  size="xs"
                  variant="tray"
                  disabled={!canReplace}
                  onClick={onReplace}
                />
              </ActionTooltip>
              <ActionTooltip content="Replace all">
                <IconButton
                  icon={ReplaceAll}
                  aria-label="Replace all"
                  size="xs"
                  variant="tray"
                  disabled={!canReplace}
                  onClick={onReplaceAll}
                />
              </ActionTooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
