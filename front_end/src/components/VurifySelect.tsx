import { ChevronDown } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import type { ValidateOn, ValidationRule } from '../lib/forms/formValidation'
import { useFormFieldValidation } from '../hooks/useFormFieldValidation'
import { menuItemButtonSize, menuPanelMetrics, menuScrollConfig } from '../lib/menus/menuControls'
import type { ScrollRailType } from '../lib/scroll/scrollRail'
import { resolveThemePortalMount } from '../lib/theme/themePortal'
import { Button } from './Button'
import { Field } from './Field'
import { FieldControlShell, fieldControlRowClass } from './FieldControlShell'
import { ThemeScroll } from './ThemeScroll'
import type { SelectOption } from './Select'

type VurifySelectProps = {
  /** Floating label — rises when focused, typing, or a value is selected. */
  label: string
  options: readonly SelectOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  /**
   * `search` — typable filter combobox (default).
   * `dropdown` — pick-only list; same housing/panel, no typing.
   */
  variant?: 'search' | 'dropdown'
  placeholder?: string
  name?: string
  disabled?: boolean
  required?: boolean
  error?: string | readonly string[]
  hint?: string
  rules?: readonly ValidationRule[]
  validateOn?: ValidateOn | readonly ValidateOn[]
  successMessage?: string
  showSuccessWhenValid?: boolean
  /** Bump to force submit-time validation (compose Generate). */
  forceSubmit?: number
  id?: string
  className?: string
  /** Options list scroll rail — default `nano` (micro bar). */
  scrollRail?: ScrollRailType
  scrollClouds?: boolean
  /** Portaled list — default `true` so it escapes dashboard scroll hosts. */
  portal?: boolean
  portalZIndex?: number
  debug?: boolean
}

const PANEL_GAP_PX = 5.6
const VIEWPORT_EDGE = 12

function filterOptions(options: readonly SelectOption[], query: string): SelectOption[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return [...options]
  return options.filter(
    (option) =>
      option.label.toLowerCase().includes(needle) ||
      option.value.toLowerCase().includes(needle) ||
      (option.description?.toLowerCase().includes(needle) ?? false),
  )
}

/**
 * Product Vurify select — floating label + thicken underline.
 * `variant="search"` (default): typable filter combobox.
 * `variant="dropdown"`: pick-only list (no typing).
 */
export function VurifySelect({
  label,
  options,
  value: valueProp,
  defaultValue = '',
  onChange,
  variant = 'search',
  placeholder,
  name,
  disabled = false,
  required,
  error: errorProp,
  hint,
  rules,
  validateOn = ['blur', 'change', 'submit'],
  successMessage,
  showSuccessWhenValid = false,
  forceSubmit = 0,
  id: idProp,
  className = '',
  scrollRail = 'nano',
  scrollClouds = true,
  portal = true,
  portalZIndex = 520,
  debug = false,
}: VurifySelectProps) {
  const isDropdown = variant === 'dropdown'
  const resolvedPlaceholder = placeholder ?? (isDropdown ? 'Choose…' : 'Type to filter…')
  const autoId = useId().replace(/:/g, '')
  const id = idProp ?? `vurify-select-${autoId}`
  const listId = `${id}-list`
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [focused, setFocused] = useState(false)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const [portalThemeStyle, setPortalThemeStyle] = useState<CSSProperties>({})
  const [portalBox, setPortalBox] = useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  })
  /** True when option list exceeds the compact menu cap — show rail / clouds. */
  const [listOverflows, setListOverflows] = useState(false)

  const value = valueProp ?? internalValue
  const selected = options.find((option) => option.value === value)
  const filled =
    focused || open || Boolean(selected) || (!isDropdown && query.trim().length > 0)
  const rowSize = menuItemButtonSize.compact

  const { error, onBlur, notifyChange, markSubmitted } = useFormFieldValidation({
    value,
    rules,
    validateOn,
    error: errorProp,
    successMessage,
    showSuccessWhenValid,
    debug,
  })

  const filtered = useMemo(
    () => (isDropdown ? [...options] : filterOptions(options, query)),
    [isDropdown, options, query],
  )

  /**
   * Search: hide the list when idle showing the committed label.
   * Dropdown: list is useful whenever open.
   */
  const idleExactSelection = Boolean(
    !isDropdown && selected && query.trim().toLowerCase() === selected.label.toLowerCase(),
  )
  const listUseful = isDropdown ? open && filtered.length > 0 : !idleExactSelection

  useEffect(() => {
    if (forceSubmit > 0) markSubmitted()
  }, [forceSubmit, markSubmitted])

  // Sync committed label into the input only while idle (not while typing).
  useEffect(() => {
    if (focused || open) return
    setQuery(selected?.label ?? '')
  }, [selected, focused, open])

  useLayoutEffect(() => {
    if (!open) return
    setActiveIndex(0)
  }, [open, query, isDropdown])

  const updatePortalBox = useCallback(() => {
    if (!rootRef.current) return
    const anchor = rootRef.current.getBoundingClientRect()
    const maxHeight = menuPanelMetrics.compact.maxHeight
    const list = panelRef.current?.querySelector<HTMLElement>('.theme-menu__list')
    const empty = panelRef.current?.querySelector<HTMLElement>('.theme-vurify-select__empty')
    // Measure real option rows so short lists fit without scroll rail / clouds.
    const measured = list?.scrollHeight ?? empty?.scrollHeight ?? 0
    const height =
      measured > 0 ? Math.min(Math.ceil(measured), maxHeight) : Math.min(maxHeight, 48)
    const overflows = measured > maxHeight + 1
    let top = anchor.bottom + PANEL_GAP_PX
    let left = anchor.left
    left = Math.max(VIEWPORT_EDGE, Math.min(left, window.innerWidth - anchor.width - VIEWPORT_EDGE))
    if (top + height > window.innerHeight - VIEWPORT_EDGE && anchor.top > height) {
      top = anchor.top - height - PANEL_GAP_PX
    }
    setListOverflows(overflows)
    setPortalBox({
      top,
      left,
      width: Math.max(anchor.width, 1),
      height,
    })
    const mount = resolveThemePortalMount(rootRef.current)
    setPortalRoot(mount.parent)
    setPortalThemeStyle(mount.wrapStyle)
  }, [])

  useLayoutEffect(() => {
    if (!open || !portal) return
    updatePortalBox()
    // Second pass after ThemeScroll mounts so list scrollHeight is final.
    const id = window.requestAnimationFrame(() => updatePortalBox())
    const list = panelRef.current?.querySelector<HTMLElement>('.theme-menu__list')
    const ro =
      typeof ResizeObserver !== 'undefined' && list
        ? new ResizeObserver(() => updatePortalBox())
        : null
    if (list && ro) ro.observe(list)
    return () => {
      window.cancelAnimationFrame(id)
      ro?.disconnect()
    }
  }, [open, portal, updatePortalBox, filtered.length])

  useEffect(() => {
    if (!open || !portal) return
    const onScrollOrResize = () => updatePortalBox()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open, portal, updatePortalBox])

  useEffect(() => {
    if (!open || !portal || filtered.length === 0) return
    const panel = panelRef.current
    if (!panel) return

    const onWheel = (event: WheelEvent) => {
      const viewport = panel.querySelector<HTMLElement>(
        '.theme-scroll__viewport, .theme-rounded-scroll__viewport',
      )
      if (!viewport) {
        // Keep page Lenis from eating the gesture while the pointer is on the menu.
        event.preventDefault()
        event.stopPropagation()
        return
      }
      const max = viewport.scrollHeight - viewport.clientHeight
      if (max <= 1) {
        event.stopPropagation()
        return
      }
      const next = Math.max(0, Math.min(max, viewport.scrollTop + event.deltaY))
      event.preventDefault()
      event.stopPropagation()
      if (next !== viewport.scrollTop) viewport.scrollTop = next
    }

    panel.addEventListener('wheel', onWheel, { passive: false })
    return () => panel.removeEventListener('wheel', onWheel)
  }, [open, portal, filtered.length])

  const setValue = useCallback(
    (next: string) => {
      if (valueProp === undefined) setInternalValue(next)
      onChange?.(next)
    },
    [onChange, valueProp],
  )

  const choose = useCallback(
    (next: string) => {
      notifyChange()
      setValue(next)
      const option = options.find((item) => item.value === next)
      setQuery(option?.label ?? '')
      setOpen(false)
      inputRef.current?.focus()
    },
    [notifyChange, options, setValue],
  )

  const close = useCallback(() => {
    setOpen(false)
    setQuery(selected?.label ?? '')
  }, [selected])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [close, open])

  const handleFocus = () => {
    setFocused(true)
    if (isDropdown) return
    if (!query && selected) setQuery(selected.label)
    if (listUseful) setOpen(true)
    requestAnimationFrame(() => inputRef.current?.select())
  }

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    setFocused(false)
    if (rootRef.current?.contains(event.relatedTarget as Node | null)) return
    if (panelRef.current?.contains(event.relatedTarget as Node | null)) return
    onBlur()
    close()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
      return
    }
    if (event.key === 'Enter' && open && filtered[activeIndex]) {
      event.preventDefault()
      choose(filtered[activeIndex].value)
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  if (debug) {
    console.debug('[VurifySelect]', {
      id,
      value,
      open,
      variant,
      filtered: filtered.length,
      query,
      listUseful,
    })
  }

  const panelOpen = isDropdown ? open && filtered.length > 0 : open && listUseful
  const displayValue = isDropdown ? selected?.label ?? '' : query
  const listRail = listOverflows ? scrollRail : 'hidden'
  const listClouds = listOverflows && scrollClouds

  const listPanel = (
    <div
      ref={panelRef}
      id={listId}
      role="listbox"
      aria-hidden={!panelOpen}
      className={[
        'theme-menu',
        'theme-menu--compact',
        'theme-menu__panel',
        'theme-menu__panel--from-start',
        'theme-vurify-select__panel',
        listOverflows ? '' : 'theme-vurify-select__panel--fit',
        filtered.length === 0 ? 'theme-vurify-select__panel--empty' : '',
        panelOpen ? 'theme-menu__panel--open' : '',
        portal ? 'theme-menu__panel--portal theme-menu__panel--field-portal' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        portal && panelOpen
          ? {
              width: portalBox.width,
              minWidth: portalBox.width,
              maxWidth: portalBox.width,
              // Short lists size to content (CSS --fit). Capped lists need a fixed box
              // so ThemeScroll can overflow — locking height on --fit clips rows.
              ...(listOverflows
                ? {
                    height: portalBox.height,
                    maxHeight: portalBox.height,
                  }
                : {
                    maxHeight: menuPanelMetrics.compact.maxHeight,
                  }),
            }
          : undefined
      }
    >
      {filtered.length === 0 ? (
        <div className="theme-vurify-select__empty type-caption" role="status">
          No matches
        </div>
      ) : (
        <ThemeScroll
          className="theme-menu__scroll"
          config={menuScrollConfig.compact}
          rail={listRail}
          scrollClouds={listClouds}
          tabIndex={-1}
        >
          <ul className="theme-menu__list">
            {filtered.map((option, index) => (
              <li key={option.value} role="none">
                <Button
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  tabIndex={panelOpen ? undefined : -1}
                  size={rowSize}
                  variant="ghost"
                  labelAnim={false}
                  disabled={option.disabled}
                  className={[
                    'theme-menu__item-btn',
                    value === option.value ? 'theme-menu__item-btn--selected' : '',
                    index === activeIndex ? 'theme-field__combobox-option--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    if (option.disabled) return
                    choose(option.value)
                  }}
                >
                  <span className="theme-vurify-select__option-stack">
                    <span className="theme-vurify-select__option-label">{option.label}</span>
                    {option.description ? (
                      <span className="theme-vurify-select__option-desc type-caption type-faint">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </ThemeScroll>
      )}
    </div>
  )

  const portaledList =
    portal && panelOpen && portalRoot
      ? createPortal(
          <div className="theme" style={portalThemeStyle}>
            <div
              className="theme-menu-portal-host"
              style={{
                position: 'fixed',
                top: portalBox.top,
                left: portalBox.left,
                zIndex: portalZIndex,
                pointerEvents: 'none',
              }}
            >
              <div style={{ pointerEvents: 'auto' }}>{listPanel}</div>
            </div>
          </div>,
          portalRoot,
        )
      : null

  return (
    <Field
      hint={hint}
      error={error}
      required={required}
      variant="vurify"
      size="md"
      htmlFor={id}
      className={[
        'theme-field--vurify-float',
        'theme-vurify-select',
        isDropdown ? 'theme-vurify-select--dropdown' : 'theme-vurify-select--search',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {name ? <input type="hidden" name={name} value={value} required={required} /> : null}
      <div
        ref={rootRef}
        className={[
          'theme-menu',
          'theme-menu--compact',
          'theme-field__menu',
          'theme-field__combobox',
          'theme-vurify-select__menu',
          panelOpen ? 'theme-menu--open' : '',
          disabled ? 'theme-field__menu--disabled' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <FieldControlShell
          rowClassName={fieldControlRowClass({ trailing: true })}
          data-filled={filled ? 'true' : 'false'}
          data-focused={focused || open ? 'true' : 'false'}
          overlay={
            <label className="theme-field__float-label" htmlFor={id}>
              <span className="theme-field__float-label-text">{label}</span>
            </label>
          }
        >
          <input
            ref={inputRef}
            id={id}
            role="combobox"
            aria-expanded={panelOpen}
            aria-controls={listId}
            aria-autocomplete={isDropdown ? 'none' : 'list'}
            aria-invalid={error ? true : undefined}
            disabled={disabled}
            readOnly={isDropdown}
            autoComplete="off"
            spellCheck={false}
            placeholder={focused || open ? resolvedPlaceholder : ''}
            className="theme-field__control type-body"
            value={displayValue}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={
              isDropdown
                ? undefined
                : (event) => {
                    setQuery(event.target.value)
                    setOpen(true)
                  }
            }
            onClick={
              isDropdown
                ? () => {
                    if (disabled) return
                    setOpen((wasOpen) => !wasOpen)
                  }
                : undefined
            }
            onKeyDown={handleKeyDown}
          />
          <Button
            type="button"
            variant="ghost"
            size={rowSize}
            disabled={disabled}
            className={[
              'theme-field__control-trailing',
              'theme-vurify-select__chevron-btn',
              panelOpen ? 'theme-vurify-select__chevron-btn--open' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label={panelOpen ? 'Close options' : 'Open options'}
            icon={ChevronDown}
            labelAnim={false}
            tabIndex={-1}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (disabled) return
              if (panelOpen) {
                close()
                return
              }
              if (!isDropdown) setQuery('')
              setOpen(true)
              inputRef.current?.focus()
            }}
          />
        </FieldControlShell>
        {!portal ? listPanel : null}
      </div>
      {portaledList}
    </Field>
  )
}
