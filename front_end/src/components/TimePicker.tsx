import { Clock } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FocusEvent } from 'react'
import type { ButtonSize } from '../lib/ui/buttonStyles'
import type { FieldSize, FieldVariant } from '../lib/forms/formControls'
import {
  buildHour12Options,
  buildMeridiemOptions,
  buildMinuteOptions,
  defaultTimeValue,
  formatTimeFromParts,
  formatTimeInputText,
  formatTimeValue,
  parseTimeValue,
  timePartsFromValue,
  type TimePickerParts,
} from '../lib/forms/dateTimePicker'
import type { ValidateOn, ValidationRule } from '../lib/forms/formValidation'
import { useFormFieldValidation } from '../hooks/useFormFieldValidation'
import { Button } from './Button'
import { Field } from './Field'
import { FieldControlShell, fieldControlRowClass } from './FieldControlShell'
import { PickerCarouselColumn, PickerCarouselShell } from './PickerCarousel'

type TimePickerProps = {
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
  minuteStep?: number
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  rules?: readonly ValidationRule[]
  validateOn?: ValidateOn | readonly ValidateOn[]
  successMessage?: string
  showSuccessWhenValid?: boolean
  /** Always-visible scroll wheels (no text field / dropdown) — compact embeds e.g. filter popover */
  inlineCarousel?: boolean
  /** Text input only — no clock button or dropdown panel */
  showPickerDropdown?: boolean
  debug?: boolean
}

const trailingButtonSize: Record<FieldSize, ButtonSize> = {
  xs: 'sm',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
}

export function TimePicker({
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
  minuteStep = 1,
  value: valueProp,
  defaultValue = defaultTimeValue(),
  onChange,
  rules,
  validateOn = 'blur',
  successMessage,
  showSuccessWhenValid,
  inlineCarousel = false,
  showPickerDropdown = true,
  debug = false,
}: TimePickerProps) {
  const autoId = useId()
  const id = autoId.replace(/:/g, '')
  const panelId = `${id}-panel`
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [internalValue, setInternalValue] = useState(defaultValue)
  const timeValue = valueProp ?? internalValue
  const [inputText, setInputText] = useState(timeValue)
  const parts = useMemo(() => timePartsFromValue(timeValue), [timeValue])

  const { error, success: resolvedSuccess, warning: resolvedWarning, onBlur, notifyChange } =
    useFormFieldValidation({
      value: timeValue,
      rules,
      validateOn,
      error: errorProp,
      success,
      warning,
      successMessage,
      showSuccessWhenValid,
      debug,
    })

  const hourOptions = useMemo(() => buildHour12Options(), [])
  const minuteOptions = useMemo(() => buildMinuteOptions(minuteStep), [minuteStep])
  const meridiemOptions = useMemo(() => buildMeridiemOptions(), [])

  const commitTime = useCallback(
    (nextValue: string) => {
      notifyChange()
      if (valueProp === undefined) {
        setInternalValue(nextValue)
      }
      onChange?.(nextValue)
      setInputText(nextValue)
    },
    [notifyChange, onChange, valueProp],
  )

  const updateParts = useCallback(
    (patch: Partial<TimePickerParts>) => {
      commitTime(formatTimeFromParts({ ...timePartsFromValue(timeValue), ...patch }))
    },
    [commitTime, timeValue],
  )

  const close = useCallback(() => {
    setOpen(false)
    setInputText(timeValue)
  }, [timeValue])

  useEffect(() => {
    if (open) return
    if (inputRef.current === document.activeElement) return
    setInputText(timeValue)
  }, [open, timeValue])

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

    const parsed = parseTimeValue(inputText.trim())
    if (parsed) {
      commitTime(formatTimeValue(parsed.hour, parsed.minute))
    } else {
      setInputText(timeValue)
    }

    onBlur()
    setOpen(false)
  }

  if (debug) {
    console.debug('[TimePicker]', { id, timeValue, open, inputText, minuteStep, inlineCarousel })
  }

  const carousel = (
    <PickerCarouselShell columnCount={3}>
      <PickerCarouselColumn
        aria-label="Hour"
        disabled={disabled}
        options={hourOptions}
        value={String(parts.hour12)}
        onChange={(hour12) => updateParts({ hour12: Number(hour12) })}
      />
      <PickerCarouselColumn
        aria-label="Minute"
        disabled={disabled}
        options={minuteOptions}
        value={String(parts.minute)}
        onChange={(minute) => updateParts({ minute: Number(minute) })}
      />
      <PickerCarouselColumn
        aria-label="Meridiem"
        disabled={disabled}
        options={meridiemOptions}
        value={parts.meridiem}
        onChange={(meridiem) => updateParts({ meridiem: meridiem === 'pm' ? 'pm' : 'am' })}
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
        {name ? <input type="hidden" name={name} value={timeValue} required={required} /> : null}
        <div
          className={[
            'theme-field__picker',
            'theme-field__time-picker',
            'theme-field__picker--inline',
            disabled ? 'theme-field__picker--disabled' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label={label ?? 'Choose time'}
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
        {name ? <input type="hidden" name={name} value={timeValue} required={required} /> : null}
        <FieldControlShell rowClassName={fieldControlRowClass()}>
          <input
            ref={inputRef}
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            disabled={disabled}
            required={required}
            placeholder="HH:MM"
            className="theme-field__control theme-field__control--time-text"
            aria-invalid={error ? true : undefined}
            value={inputText}
            onBlur={() => {
              const parsed = parseTimeValue(inputText.trim())
              if (parsed) {
                commitTime(formatTimeValue(parsed.hour, parsed.minute))
              } else {
                setInputText(timeValue)
              }
              onBlur()
            }}
            onChange={(event) => {
              const text = formatTimeInputText(event.target.value)
              setInputText(text)
              const parsed = parseTimeValue(text.trim())
              if (parsed) {
                commitTime(formatTimeValue(parsed.hour, parsed.minute))
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
      {name ? <input type="hidden" name={name} value={timeValue} required={required} /> : null}
      <div
        ref={rootRef}
        className={[
          'theme-menu',
          'theme-field__menu',
          'theme-field__time-picker',
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
            placeholder="HH:MM"
            className="theme-field__control theme-field__control--time-text"
            aria-invalid={error ? true : undefined}
            aria-expanded={open}
            aria-controls={panelId}
            value={inputText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={(event) => {
              const text = formatTimeInputText(event.target.value)
              setInputText(text)
              const parsed = parseTimeValue(text.trim())
              if (parsed) {
                commitTime(formatTimeValue(parsed.hour, parsed.minute))
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
            aria-label={open ? 'Close time picker' : 'Open time picker'}
            aria-expanded={open}
            aria-controls={panelId}
            icon={Clock}
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
          aria-label="Choose time"
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
