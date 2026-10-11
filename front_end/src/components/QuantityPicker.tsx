import { Minus, Plus } from 'lucide-react'
import { useCallback, useId, useMemo, useState, type CSSProperties, type FocusEvent } from 'react'
import type { FieldSize, FieldVariant } from '../lib/forms/formControls'
import {
  buildQuantitySteps,
  clampQuantity,
  parseQuantityInput,
  quantityTrackOffset,
  shouldUseQuantityTrack,
} from '../lib/forms/quantityPicker'
import type { ValidateOn, ValidationRule } from '../lib/forms/formValidation'
import { useFormFieldValidation } from '../hooks/useFormFieldValidation'
import { Field } from './Field'

type QuantityPickerProps = {
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
  disabled?: boolean
  readOnly?: boolean
  min?: number
  max?: number
  step?: number
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  rules?: readonly ValidationRule[]
  validateOn?: ValidateOn | readonly ValidateOn[]
  successMessage?: string
  showSuccessWhenValid?: boolean
  debug?: boolean
}

export function QuantityPicker({
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
  disabled = false,
  readOnly = false,
  min = 0,
  max = 100,
  step = 1,
  value: valueProp,
  defaultValue = min,
  onValueChange,
  rules,
  validateOn = 'blur',
  successMessage,
  showSuccessWhenValid,
  debug = false,
}: QuantityPickerProps) {
  const autoId = useId()
  const id = autoId.replace(/:/g, '')
  const [internalValue, setInternalValue] = useState(defaultValue)
  const value = valueProp ?? internalValue
  const validationValue = String(value)
  const steps = useMemo(() => buildQuantitySteps(min, max, step), [max, min, step])
  const useTrack = shouldUseQuantityTrack(min, max, step)
  const trackText = useMemo(() => steps.join('\n'), [steps])
  const trackOffset = quantityTrackOffset(value, min, step)

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

  const setValue = useCallback(
    (next: number) => {
      const clamped = clampQuantity(next, min, max, step)
      notifyChange()
      if (valueProp === undefined) {
        setInternalValue(clamped)
      }
      onValueChange?.(clamped)
    },
    [max, min, notifyChange, onValueChange, step, valueProp],
  )

  const stepBy = useCallback(
    (direction: 1 | -1) => {
      if (disabled || readOnly) return
      setValue(value + direction * step)
    },
    [disabled, readOnly, setValue, step, value],
  )

  const atMin = value - step < min
  const atMax = value + step > max
  const controlsDisabled = disabled || readOnly

  const handleInput = (raw: string) => {
    notifyChange()
    const parsed = parseQuantityInput(raw)
    if (parsed === null) return
    if (valueProp === undefined) {
      setInternalValue(parsed)
    }
    onValueChange?.(parsed)
  }

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    onBlur()
    const parsed = parseQuantityInput(event.target.value)
    if (parsed !== null) {
      setValue(parsed)
      event.target.value = String(clampQuantity(parsed, min, max, step))
    }
  }

  if (debug) {
    console.debug('[QuantityPicker]', { id, value, min, max, step, useTrack, trackOffset })
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
      <div
        className={[
          'theme-field__control-shell',
          'theme-quantity-picker',
          `theme-quantity-picker--${size}`,
          disabled ? 'theme-quantity-picker--disabled' : '',
          readOnly ? 'theme-quantity-picker--readonly' : '',
          !useTrack ? 'theme-quantity-picker--plain' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <button
          type="button"
          className="theme-quantity-picker__step theme-quantity-picker__step--decrement"
          aria-label="Decrease quantity"
          disabled={controlsDisabled || atMin}
          onClick={() => stepBy(-1)}
        >
          <Minus strokeWidth={2.5} aria-hidden />
        </button>
        <div className="theme-quantity-picker__track-container">
          <input
            id={id}
            name={name}
            type="number"
            className="theme-quantity-picker__input"
            min={min}
            max={max}
            step={step}
            value={value}
            required={required}
            disabled={disabled}
            readOnly={readOnly}
            aria-invalid={error ? true : undefined}
            onBlur={handleBlur}
            onInput={(event) => handleInput(event.currentTarget.value)}
          />
          {useTrack ? (
            <div
              aria-hidden
              className="theme-quantity-picker__track"
              style={
                {
                  '--theme-quantity-offset': trackOffset,
                } as CSSProperties
              }
              data-low-range-out={min - step}
              data-high-range-out={max + step}
            >
              {trackText}
            </div>
          ) : (
            <span aria-hidden className="theme-quantity-picker__value type-label">
              {value}
            </span>
          )}
        </div>
        <button
          type="button"
          className="theme-quantity-picker__step theme-quantity-picker__step--increment"
          aria-label="Increase quantity"
          disabled={controlsDisabled || atMax}
          onClick={() => stepBy(1)}
        >
          <Plus strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </Field>
  )
}

export type { ValidateOn, ValidationRule }
