import { Minus, Plus } from 'lucide-react'
import { useCallback, useId, useState, type FocusEvent, type ReactNode } from 'react'
import type { ButtonSize } from '../lib/ui/buttonStyles'
import type { FieldSize, FieldVariant } from '../lib/forms/formControls'
import type { ValidateOn, ValidationRule } from '../lib/forms/formValidation'
import { useFormFieldValidation } from '../hooks/useFormFieldValidation'
import { Button } from './Button'
import { Field } from './Field'
import { FieldControlShell, fieldControlRowClass } from './FieldControlShell'

const stepperSize: Record<FieldSize, ButtonSize> = {
  xs: 'xs',
  sm: 'xs',
  md: 'xs',
  lg: 'sm',
}

type NumberInputProps = {
  label?: string
  hint?: string
  error?: string | readonly string[]
  success?: string
  warning?: string
  prefix?: ReactNode
  variant?: FieldVariant
  size?: FieldSize
  shadowless?: boolean
  className?: string
  name?: string
  required?: boolean
  disabled?: boolean
  min?: number
  max?: number
  step?: number
  /**
   * When false (default), floor is `max(0, min ?? 0)` and typed minuses are stripped.
   * Set true to allow negatives (respects `min` when set).
   */
  allowNegative?: boolean
  value?: number
  defaultValue?: number
  onValueChange?: (value: number | undefined) => void
  rules?: readonly ValidationRule[]
  validateOn?: ValidateOn | readonly ValidateOn[]
  successMessage?: string
  showSuccessWhenValid?: boolean
  debug?: boolean
}

function clampNumber(value: number, min?: number, max?: number): number {
  let next = value
  if (min !== undefined) next = Math.max(min, next)
  if (max !== undefined) next = Math.min(max, next)
  return next
}

function resolveNumberMin(min: number | undefined, allowNegative: boolean): number | undefined {
  if (allowNegative) return min
  return Math.max(0, min ?? 0)
}

function parseNumber(raw: string, allowNegative: boolean): number | undefined {
  const trimmed = raw.trim()
  if (trimmed === '' || trimmed === '-') return undefined
  if (!allowNegative && trimmed.includes('-')) {
    const digits = trimmed.replace(/[^\d.]/g, '')
    if (!digits) return undefined
    const parsed = Number(digits)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function NumberInput({
  label,
  hint,
  error: errorProp,
  success,
  warning,
  prefix,
  variant = 'flat',
  size = 'md',
  shadowless = false,
  className = '',
  name,
  required,
  disabled = false,
  min: minProp,
  max,
  step = 1,
  allowNegative = false,
  value: valueProp,
  defaultValue,
  onValueChange,
  rules,
  validateOn = 'blur',
  successMessage,
  showSuccessWhenValid,
  debug = false,
}: NumberInputProps) {
  const autoId = useId()
  const id = autoId.replace(/:/g, '')
  const min = resolveNumberMin(minProp, allowNegative)
  const [internalValue, setInternalValue] = useState<number | undefined>(defaultValue)
  const numericValue = valueProp ?? internalValue
  const displayValue = numericValue === undefined ? '' : String(numericValue)
  const validationValue = displayValue
  const atMin = numericValue !== undefined && min !== undefined && numericValue <= min
  const atMax = numericValue !== undefined && max !== undefined && numericValue >= max

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

  const setNumericValue = useCallback(
    (next: number | undefined) => {
      const clamped =
        next === undefined ? undefined : clampNumber(next, min, max)
      if (valueProp === undefined) {
        setInternalValue(clamped)
      }
      onValueChange?.(clamped)
    },
    [max, min, onValueChange, valueProp],
  )

  const handleChange = useCallback(
    (raw: string) => {
      notifyChange()
      if (!allowNegative && raw.includes('-')) {
        const cleaned = raw.replace(/-/g, '')
        setNumericValue(parseNumber(cleaned, false))
        return
      }
      setNumericValue(parseNumber(raw, allowNegative))
    },
    [allowNegative, notifyChange, setNumericValue],
  )

  const handleBlur = useCallback(
    (_event: FocusEvent<HTMLInputElement>) => {
      onBlur()
    },
    [onBlur],
  )

  const stepBy = useCallback(
    (direction: 1 | -1) => {
      notifyChange()
      const base = numericValue ?? min ?? 0
      setNumericValue(clampNumber(base + direction * step, min, max))
    },
    [max, min, notifyChange, numericValue, setNumericValue, step],
  )

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
      shadowless={shadowless}
      htmlFor={id}
      className={className}
    >
      <FieldControlShell
        rowClassName={fieldControlRowClass({
          leading: Boolean(prefix),
          trailingSteppers: true,
        })}
      >
        {prefix ? <span className="theme-field__control-leading">{prefix}</span> : null}
        <input
          id={id}
          type="text"
          inputMode={allowNegative ? 'text' : 'decimal'}
          name={name}
          required={required}
          disabled={disabled}
          className="theme-field__control"
          aria-invalid={error ? true : undefined}
          value={displayValue}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={handleBlur}
        />
        <span className="theme-field__control-trailing-slot theme-field__steppers">
          <Button
            type="button"
            variant="ghost"
            size={stepperSize[size]}
            disabled={disabled || atMin}
            icon={Minus}
            aria-label="Decrease value"
            onClick={() => stepBy(-1)}
          />
          <Button
            type="button"
            variant="ghost"
            size={stepperSize[size]}
            disabled={disabled || atMax}
            icon={Plus}
            aria-label="Increase value"
            onClick={() => stepBy(1)}
          />
        </span>
      </FieldControlShell>
    </Field>
  )
}

export type { ValidateOn, ValidationRule }
