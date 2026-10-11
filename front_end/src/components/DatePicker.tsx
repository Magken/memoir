import { Calendar } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FocusEvent } from 'react'
import type { ButtonSize } from '../lib/ui/buttonStyles'
import type { FieldSize, FieldVariant } from '../lib/forms/formControls'
import {
  buildDayOptions,
  buildMonthOptions,
  buildYearOptions,
  formatIsoDate,
  formatDateInputText,
  parseIsoDate,
  todayIsoDate,
} from '../lib/forms/dateTimePicker'
import type { ValidateOn, ValidationRule } from '../lib/forms/formValidation'
import { useFormFieldValidation } from '../hooks/useFormFieldValidation'
import { Button } from './Button'
import { Field } from './Field'
import { FieldControlShell, fieldControlRowClass } from './FieldControlShell'
import { PickerCarouselColumn, PickerCarouselShell } from './PickerCarousel'

type DatePickerProps = {
  label?: string
  hint?: string
  error?: string | readonly string[]
  success?: string
  warning?: string
  variant?: FieldVariant
  size?: FieldSize
  className?: string
  name?: string
  required?: boolean
  optional?: boolean
  disabled?: boolean
  minYear?: number
  maxYear?: number
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  rules?: readonly ValidationRule[]
  validateOn?: ValidateOn | readonly ValidateOn[]
  successMessage?: string
  showSuccessWhenValid?: boolean
  /** Always-visible scroll wheels (no text field / dropdown) — compact embeds e.g. filter popover */
  inlineCarousel?: boolean
  /** Text input only — no calendar button or dropdown panel */
  showPickerDropdown?: boolean
  debug?: boolean
}

const DEFAULT_MIN_YEAR = 1925
const DEFAULT_MAX_YEAR = 2099

const trailingButtonSize: Record<FieldSize, ButtonSize> = {
  xs: 'sm',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
}

export function DatePicker({
  label,
  hint,
  error: errorProp,
  success,
  warning,
  variant = 'flat',
  size = 'md',
  className = '',
  name,
  required,
  optional,
  disabled = false,
  minYear = DEFAULT_MIN_YEAR,
  maxYear = DEFAULT_MAX_YEAR,
  value: valueProp,
  defaultValue,
  onChange,
  rules,
  validateOn = 'blur',
  successMessage,
  showSuccessWhenValid,
  inlineCarousel = false,
  showPickerDropdown = true,
  debug = false,
}: DatePickerProps) {
  const autoId = useId()
  const id = autoId.replace(/:/g, '')
  const panelId = `${id}-panel`
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [internalIso, setInternalIso] = useState(defaultValue ?? todayIsoDate())
  const isoValue = valueProp ?? internalIso
  const [inputText, setInputText] = useState(isoValue)

  const parts = useMemo(
    () => parseIsoDate(isoValue) ?? parseIsoDate(todayIsoDate())!,
    [isoValue],
  )

  const { error, success: resolvedSuccess, warning: resolvedWarning, onBlur, notifyChange } =
    useFormFieldValidation({
      value: isoValue,
      rules,
      validateOn,
      error: errorProp,
      success,
      warning,
      successMessage,
      showSuccessWhenValid,
      debug,
    })

  const monthOptions = useMemo(() => buildMonthOptions(), [])
  const yearOptions = useMemo(() => buildYearOptions(minYear, maxYear), [maxYear, minYear])
  const dayOptions = useMemo(
    () => buildDayOptions(parts.year, parts.month),
    [parts.month, parts.year],
  )

  const commitIso = useCallback(
    (iso: string) => {
      notifyChange()
      if (valueProp === undefined) {
        setInternalIso(iso)
      }
      onChange?.(iso)
      setInputText(iso)
    },
    [notifyChange, onChange, valueProp],
  )

  const updateParts = useCallback(
    (patch: Partial<{ year: number; month: number; day: number }>) => {
      const current = parseIsoDate(isoValue) ?? parts
      const next = { ...current, ...patch }
      const maxDay = buildDayOptions(next.year, next.month).length
      const clampedDay = Math.min(next.day, maxDay)
      commitIso(formatIsoDate(next.year, next.month, clampedDay))
    },
    [commitIso, isoValue, parts],
  )

  const close = useCallback(() => {
    setOpen(false)
    setInputText(isoValue)
  }, [isoValue])

  useEffect(() => {
    if (open) return
    if (inputRef.current === document.activeElement) return
    setInputText(isoValue)
  }, [isoValue, open])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return
      close()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [close, open])

  const handleFocus = () => {
    if (disabled || !showPickerDropdown) return
    setOpen(true)
  }

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (rootRef.current?.contains(event.relatedTarget as Node | null)) {
      return
    }

    const parsed = parseIsoDate(inputText.trim())
    if (parsed) {
      commitIso(formatIsoDate(parsed.year, parsed.month, parsed.day))
    } else {
      setInputText(isoValue)
    }

    onBlur()
    setOpen(false)
  }

  if (debug) {
    console.debug('[DatePicker]', { id, isoValue, open, inputText, inlineCarousel })
  }

  const carousel = (
    <PickerCarouselShell columnCount={3}>
      <PickerCarouselColumn
        aria-label="Month"
        disabled={disabled}
        options={monthOptions}
        value={String(parts.month)}
        onChange={(month) => updateParts({ month: Number(month) })}
      />
      <PickerCarouselColumn
        aria-label="Day"
        disabled={disabled}
        options={dayOptions}
        value={String(parts.day)}
        onChange={(day) => updateParts({ day: Number(day) })}
      />
      <PickerCarouselColumn
        aria-label="Year"
        disabled={disabled}
        options={yearOptions}
        value={String(parts.year)}
        onChange={(year) => updateParts({ year: Number(year) })}
      />
    </PickerCarouselShell>
  )

  if (inlineCarousel) {
    return (
      <Field
        label={label}
        hint={hint}
        error={error}
        success={resolvedSuccess}
        warning={resolvedWarning}
        required={required}
        optional={optional}
        variant={variant}
        size={size}
        htmlFor={id}
        className={className}
      >
        {name ? <input type="hidden" name={name} value={isoValue} required={required} /> : null}
        <div
          className={[
            'theme-field__picker',
            'theme-field__date-picker',
            'theme-field__picker--inline',
            disabled ? 'theme-field__picker--disabled' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label={label ?? 'Choose date'}
        >
          {carousel}
        </div>
      </Field>
    )
  }

  if (!showPickerDropdown) {
    return (
      <Field
        label={label}
        hint={hint}
        error={error}
        success={resolvedSuccess}
        warning={resolvedWarning}
        required={required}
        optional={optional}
        variant={variant}
        size={size}
        htmlFor={id}
        className={className}
      >
        {name ? <input type="hidden" name={name} value={isoValue} required={required} /> : null}
        <FieldControlShell rowClassName={fieldControlRowClass()}>
          <input
            ref={inputRef}
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            disabled={disabled}
            required={required}
            placeholder="YYYY-MM-DD"
            className="theme-field__control theme-field__control--date-text"
            aria-invalid={error ? true : undefined}
            value={inputText}
            onBlur={() => {
              const parsed = parseIsoDate(inputText.trim())
              if (parsed) {
                commitIso(formatIsoDate(parsed.year, parsed.month, parsed.day))
              } else {
                setInputText(isoValue)
              }
              onBlur()
            }}
            onChange={(event) => {
              const text = formatDateInputText(event.target.value)
              setInputText(text)
              const parsed = parseIsoDate(text.trim())
              if (parsed) {
                commitIso(formatIsoDate(parsed.year, parsed.month, parsed.day))
              }
            }}
          />
        </FieldControlShell>
      </Field>
    )
  }

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      success={resolvedSuccess}
      warning={resolvedWarning}
      required={required}
      optional={optional}
      variant={variant}
      size={size}
      htmlFor={id}
      className={className}
    >
      {name ? <input type="hidden" name={name} value={isoValue} required={required} /> : null}
      <div
        ref={rootRef}
        className={[
          'theme-menu',
          'theme-field__menu',
          'theme-field__date-picker',
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
            type="text"
            inputMode="numeric"
            autoComplete="off"
            disabled={disabled}
            required={required}
            placeholder="YYYY-MM-DD"
            className="theme-field__control theme-field__control--date-text"
            aria-invalid={error ? true : undefined}
            aria-expanded={open}
            aria-controls={panelId}
            value={inputText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={(event) => {
              const text = formatDateInputText(event.target.value)
              setInputText(text)
              const parsed = parseIsoDate(text.trim())
              if (parsed) {
                commitIso(formatIsoDate(parsed.year, parsed.month, parsed.day))
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                close()
              }
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size={trailingButtonSize[size]}
            disabled={disabled}
            className="theme-field__control-trailing"
            aria-label={open ? 'Close calendar' : 'Open calendar'}
            aria-expanded={open}
            aria-controls={panelId}
            icon={Calendar}
            onClick={() => {
              if (disabled) return
              setOpen((current) => !current)
              inputRef.current?.focus()
            }}
          />
        </FieldControlShell>
        <div
          id={panelId}
          role="dialog"
          aria-label="Choose date"
          aria-hidden={!open}
          data-lenis-prevent-wheel
          data-lenis-prevent-touch
          className={[
            'theme-menu__panel',
            'theme-menu__panel--from-start',
            'theme-field__picker-panel',
            open ? 'theme-menu__panel--open' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onMouseDown={(event) => event.preventDefault()}
        >
          <div
            className={[
              'theme-field__picker-panel-inner',
              'theme-field__picker',
              disabled ? 'theme-field__picker--disabled' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {carousel}
          </div>
        </div>
      </div>
    </Field>
  )
}

export type { ValidateOn, ValidationRule }
