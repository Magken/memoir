import { Search, X } from 'lucide-react'
import { useCallback, useEffect, useId, useState, type ChangeEvent, type FocusEvent } from 'react'
import type { FieldShape, FieldSize, FieldVariant } from '../lib/forms/formControls'
import type { ValidateOn, ValidationRule } from '../lib/forms/formValidation'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useFormFieldValidation } from '../hooks/useFormFieldValidation'
import { IconButton } from './IconButton'
import { Field } from './Field'
import { FieldControlShell, fieldControlRowClass } from './FieldControlShell'

type SearchInputProps = {
  label?: string
  hint?: string
  error?: string | readonly string[]
  success?: string
  warning?: string
  variant?: FieldVariant
  size?: FieldSize
  shape?: FieldShape
  shadowless?: boolean
  className?: string
  placeholder?: string
  name?: string
  required?: boolean
  disabled?: boolean
  debounceMs?: number
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  onDebouncedChange?: (value: string) => void
  rules?: readonly ValidationRule[]
  validateOn?: ValidateOn | readonly ValidateOn[]
  successMessage?: string
  showSuccessWhenValid?: boolean
  debug?: boolean
  /** Accessible name when no visible `label` (e.g. chrome / palette search). */
  ariaLabel?: string
}

export function SearchInput({
  label,
  hint,
  error: errorProp,
  success,
  warning,
  variant = 'flat',
  size = 'md',
  shape = 'rect',
  shadowless = false,
  className = '',
  placeholder = 'Search…',
  name,
  required,
  disabled = false,
  debounceMs = 300,
  value: valueProp,
  defaultValue = '',
  onValueChange,
  onDebouncedChange,
  rules,
  validateOn = 'blur',
  successMessage,
  showSuccessWhenValid,
  debug = false,
  ariaLabel,
}: SearchInputProps) {
  const autoId = useId()
  const id = autoId.replace(/:/g, '')
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [focused, setFocused] = useState(false)
  const value = valueProp ?? internalValue
  const debounced = useDebouncedValue(value, debounceMs)
  const isVurify = variant === 'vurify'
  /** Vurify line chrome is square — pill fights the underline. */
  const resolvedShape = isVurify ? 'rect' : shape
  const floatLabel = (label ?? ariaLabel ?? placeholder).replace(/\u2026$/, '').trim() || 'Search'
  const filled = focused || value.trim().length > 0

  const { error, success: resolvedSuccess, warning: resolvedWarning, onBlur, notifyChange } =
    useFormFieldValidation({
      value,
      rules,
      validateOn,
      error: errorProp,
      success,
      warning,
      successMessage,
      showSuccessWhenValid,
      debug,
    })

  useEffect(() => {
    onDebouncedChange?.(debounced)
  }, [debounced, onDebouncedChange])

  const setValue = useCallback(
    (next: string) => {
      if (valueProp === undefined) {
        setInternalValue(next)
      }
      onValueChange?.(next)
    },
    [onValueChange, valueProp],
  )

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      notifyChange()
      setValue(event.target.value)
    },
    [notifyChange, setValue],
  )

  const handleFocus = useCallback(() => {
    setFocused(true)
  }, [])

  const handleBlur = useCallback(
    (_event: FocusEvent<HTMLInputElement>) => {
      setFocused(false)
      onBlur()
    },
    [onBlur],
  )

  const clear = useCallback(() => {
    notifyChange()
    setValue('')
  }, [notifyChange, setValue])

  return (
    <Field
      label={isVurify ? undefined : label}
      hint={hint}
      error={error}
      success={resolvedSuccess}
      warning={resolvedWarning}
      required={required}
      variant={variant}
      size={size}
      shape={resolvedShape}
      shadowless={shadowless}
      htmlFor={id}
      className={[className, isVurify ? 'theme-field--vurify-float' : ''].filter(Boolean).join(' ')}
    >
      <FieldControlShell
        rowClassName={fieldControlRowClass({
          leading: true,
          trailing: Boolean(value),
        })}
        data-filled={filled ? 'true' : 'false'}
        data-focused={focused ? 'true' : 'false'}
        overlay={
          isVurify ? (
            <label className="theme-field__float-label" htmlFor={id}>
              <span className="theme-field__float-label-text">{floatLabel}</span>
            </label>
          ) : null
        }
      >
        <span className="theme-field__control-leading" aria-hidden>
          <Search strokeWidth={2.25} />
        </span>
        <input
          id={id}
          type="text"
          role="searchbox"
          name={name}
          required={required}
          disabled={disabled}
          placeholder={isVurify ? '' : placeholder}
          className="theme-field__control"
          autoComplete="off"
          aria-label={isVurify || label ? undefined : ariaLabel}
          aria-invalid={error ? true : undefined}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {value ? (
          <span className="theme-field__control-trailing-slot">
            <IconButton
              icon={X}
              aria-label="Clear search"
              variant="ghost"
              size="xs"
              disabled={disabled}
              onClick={clear}
            />
          </span>
        ) : null}
      </FieldControlShell>
    </Field>
  )
}

export type { ValidateOn, ValidationRule }
