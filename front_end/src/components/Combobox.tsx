import { ChevronDown } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react'
import { fieldMenuSize } from '../lib/menus/fieldMenu'
import type { FieldSize, FieldVariant } from '../lib/forms/formControls'
import type { ValidateOn, ValidationRule } from '../lib/forms/formValidation'
import { useFormFieldValidation } from '../hooks/useFormFieldValidation'
import { DEFAULT_SCROLL_RAIL, type ScrollRailType } from '../lib/scroll/scrollRail'
import { Button } from './Button'
import { Field } from './Field'
import { FieldControlShell, fieldControlRowClass } from './FieldControlShell'
import { ThemeScroll } from './ThemeScroll'
import { menuItemButtonSize, menuScrollConfig } from '../lib/menus/menuControls'
import type { SelectOption } from './Select'

type ComboboxProps = {
  options: readonly SelectOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  label?: string
  hint?: string
  error?: string | readonly string[]
  success?: string
  warning?: string
  variant?: FieldVariant
  size?: FieldSize
  placeholder?: string
  name?: string
  disabled?: boolean
  required?: boolean
  rules?: readonly ValidationRule[]
  validateOn?: ValidateOn | readonly ValidateOn[]
  successMessage?: string
  showSuccessWhenValid?: boolean
  id?: string
  className?: string
  /** Options list scroll rail — `curved` (default) · `straight` · `hidden` */
  scrollRail?: ScrollRailType
  /** Soft edge fade when list overflows — default `true` */
  scrollClouds?: boolean
  debug?: boolean
}

export function Combobox({
  options,
  value: valueProp,
  defaultValue = '',
  onChange,
  label,
  hint,
  error: errorProp,
  success,
  warning,
  variant = 'flat',
  size = 'md',
  placeholder = 'Search or choose…',
  name,
  disabled = false,
  required,
  rules,
  validateOn = 'blur',
  successMessage,
  showSuccessWhenValid,
  className = '',
  scrollRail = DEFAULT_SCROLL_RAIL,
  scrollClouds = true,
  debug = false,
  id: idProp,
}: ComboboxProps) {
  const autoId = useId()
  const id = idProp ?? autoId.replace(/:/g, '')
  const listId = `${id}-list`
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const value = valueProp ?? internalValue
  const menuSize = fieldMenuSize[size]
  const rowSize = menuItemButtonSize[menuSize]

  const selected = options.find((option) => option.value === value)
  const validationValue = value

  const { error, success: resolvedSuccess, warning: resolvedWarning, onBlur, notifyChange } =
    useFormFieldValidation({
      value: validationValue,
      rules,
      validateOn,
      error: errorProp,
      success,
      warning,
      successMessage,
      showSuccessWhenValid,
      debug,
    })

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return options
    return options.filter((option) => option.label.toLowerCase().includes(needle))
  }, [options, query])

  const setValue = useCallback(
    (next: string) => {
      if (valueProp === undefined) {
        setInternalValue(next)
      }
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
    if (selected) {
      setQuery(selected.label)
    }
  }, [selected])

  useEffect(() => {
    if (!open) {
      setQuery(selected?.label ?? '')
    }
  }, [open, selected])

  useLayoutEffect(() => {
    if (!open) return
    setActiveIndex(0)
  }, [open, query])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) return
      close()
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [close, open])

  const handleFocus = () => {
    setOpen(true)
    if (!query && selected) {
      setQuery(selected.label)
    }
  }

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (rootRef.current?.contains(event.relatedTarget as Node | null)) {
      return
    }
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
    console.debug('[Combobox]', { id, value, open, filtered: filtered.length })
  }

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      success={resolvedSuccess}
      warning={resolvedWarning}
      required={required}
      variant={variant}
      size={size}
      htmlFor={id}
      className={className}
    >
      {name ? <input type="hidden" name={name} value={value} required={required} /> : null}
      <div
        ref={rootRef}
        className={[
          'theme-menu',
          'theme-field__menu',
          'theme-field__combobox',
          open ? 'theme-menu--open' : '',
          disabled ? 'theme-field__menu--disabled' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <FieldControlShell rowClassName={fieldControlRowClass({ trailing: true })}>
          <input
            ref={inputRef}
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-invalid={error ? true : undefined}
            disabled={disabled}
            placeholder={placeholder}
            className="theme-field__control"
            value={query}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onKeyDown={handleKeyDown}
          />
          <Button
            type="button"
            variant="ghost"
            size={rowSize}
            disabled={disabled}
            className="theme-field__control-trailing"
            aria-label={open ? 'Close options' : 'Open options'}
            icon={ChevronDown}
            labelAnim={false}
            onClick={() => {
              if (disabled) return
              setOpen((current) => !current)
              inputRef.current?.focus()
            }}
          />
        </FieldControlShell>
        <div
          id={listId}
          role="listbox"
          aria-hidden={!open}
          className={[
            'theme-menu__panel',
            'theme-menu__panel--from-start',
            open ? 'theme-menu__panel--open' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <ThemeScroll
            className="theme-menu__scroll"
            config={menuScrollConfig[menuSize]}
            rail={scrollRail}
            scrollClouds={scrollClouds}
            tabIndex={-1}
          >
            <ul className="theme-menu__list">
              {filtered.length === 0 ? (
                <li className="theme-field__combobox-empty type-caption" role="presentation">
                  No matches
                </li>
              ) : (
                filtered.map((option, index) => (
                  <li key={option.value} role="none">
                    <Button
                      type="button"
                      role="option"
                      aria-selected={value === option.value}
                      tabIndex={open ? undefined : -1}
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
                      {option.label}
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </ThemeScroll>
        </div>
      </div>
    </Field>
  )
}

export type { SelectOption, ValidateOn, ValidationRule }
