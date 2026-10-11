import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  useCallback,
  useId,
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from 'react'
import { VurifyInput, type VurifyInputSize } from './VurifyInput'

type VurifyCountInputProps = {
  label: string
  value: string
  onValueChange: (value: string) => void
  /** Inclusive lower bound when stepping / clamping typed values. Default `1` when `allowNegative` is false. */
  min?: number
  /** Inclusive upper bound. */
  max?: number
  step?: number
  /** Max digit characters accepted while typing (sign and decimal point not counted). Default `6`. */
  maxDigits?: number
  /**
   * When false (default), values cannot go below zero — floor is `max(0, min ?? 1)`.
   * Set true to allow a leading minus and negative steps (respects `min` when set).
   */
  allowNegative?: boolean
  /** One decimal point (chip / folder weights). Default integer-only. */
  allowDecimal?: boolean
  /** `sm` for dense hosts (chip weights). */
  size?: VurifyInputSize
  className?: string
  name?: string
  id?: string
  required?: boolean
  disabled?: boolean
  autoFocus?: boolean
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void
  debug?: boolean
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | 'className'
  | 'size'
  | 'prefix'
  | 'type'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'inputMode'
  | 'label'
  | 'min'
  | 'max'
  | 'step'
>

/** Digits-only count text — empty allowed (for optional fields). */
export function formatCountInputText(
  value: string,
  maxDigits = 6,
  allowDecimal = false,
): string {
  const cap = Math.max(1, maxDigits)
  if (!allowDecimal) {
    return value.replace(/\D/g, '').slice(0, cap)
  }
  let seenDot = false
  let digits = 0
  let out = ''
  for (const ch of value) {
    if (ch >= '0' && ch <= '9') {
      if (digits >= cap) continue
      out += ch
      digits += 1
    } else if (ch === '.' && !seenDot) {
      seenDot = true
      out += '.'
    }
  }
  return out
}

/** Optional leading minus + digits when negatives are allowed. */
export function formatSignedCountInputText(value: string, maxDigits = 6): string {
  const negative = value.trimStart().startsWith('-')
  const digits = value.replace(/\D/g, '').slice(0, Math.max(1, maxDigits))
  if (!digits) return negative ? '-' : ''
  return negative ? `-${digits}` : digits
}

export function parseCountInput(value: string, allowNegative: boolean, allowDecimal = false): number | null {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '-' || trimmed === '.' || trimmed === '-.') return null
  if (allowDecimal) {
    const re = allowNegative ? /^-?\d*\.?\d+$/ : /^\d*\.?\d+$/
    if (!re.test(trimmed)) return null
  } else if (allowNegative) {
    if (!/^-?\d+$/.test(trimmed)) return null
  } else if (!/^\d+$/.test(trimmed)) {
    return null
  }
  const n = allowDecimal ? Number.parseFloat(trimmed) : Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function roundToStep(value: number, step: number): number {
  const frac = String(step).split('.')[1]
  if (!frac) return value
  const places = frac.replace(/0+$/, '').length
  if (!places) return value
  const f = 10 ** places
  return Math.round(value * f) / f
}

function clampCount(value: number, min?: number, max?: number): number {
  let next = value
  if (min !== undefined) next = Math.max(min, next)
  if (max !== undefined) next = Math.min(max, next)
  return next
}

function resolveCountMin(min: number | undefined, allowNegative: boolean): number | undefined {
  if (allowNegative) return min
  return Math.max(0, min ?? 1)
}

/**
 * Product Vurify capacity / count line field — digits only + chevron steppers (no native spin buttons).
 * Pair with `validators.positiveInteger()` / `validators.required` via Field + useFormFieldValidation.
 */
export function VurifyCountInput({
  label,
  value,
  onValueChange,
  min: minProp,
  max,
  step = 1,
  maxDigits = 6,
  allowNegative = false,
  allowDecimal = false,
  size = 'md',
  className = '',
  name,
  id: idProp,
  required,
  disabled = false,
  autoFocus,
  onBlur,
  onFocus,
  debug = false,
  ...rest
}: VurifyCountInputProps) {
  const autoId = useId().replace(/:/g, '')
  const id = idProp ?? `vurify-count-${autoId}`
  const min = resolveCountMin(minProp, allowNegative)
  const current = parseCountInput(value, allowNegative, allowDecimal)
  const atMin = current !== null && min !== undefined && current <= min
  const atMax = current !== null && max !== undefined && current >= max

  const commit = useCallback(
    (next: number) => {
      onValueChange(String(clampCount(roundToStep(next, step), min, max)))
    },
    [max, min, onValueChange, step],
  )

  const stepBy = useCallback(
    (delta: number) => {
      if (disabled) return
      if (current === null) {
        if (delta < 0) return
        commit(min ?? 0)
        return
      }
      commit(current + delta * step)
    },
    [commit, current, disabled, min, step],
  )

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (allowNegative && !allowDecimal) {
        onValueChange(formatSignedCountInputText(event.target.value, maxDigits))
        return
      }
      onValueChange(formatCountInputText(event.target.value, maxDigits, allowDecimal))
    },
    [allowDecimal, allowNegative, maxDigits, onValueChange],
  )

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      const parsed = parseCountInput(value, allowNegative, allowDecimal)
      if (parsed !== null) {
        const clamped = clampCount(roundToStep(parsed, step), min, max)
        if (String(clamped) !== value.trim()) onValueChange(String(clamped))
      } else if (value.trim() === '-' && !allowNegative) {
        onValueChange('')
      }
      onBlur?.(event)
    },
    [allowDecimal, allowNegative, max, min, onBlur, onValueChange, step, value],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        stepBy(1)
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        stepBy(-1)
      }
    },
    [stepBy],
  )

  if (debug) {
    console.debug('[VurifyCountInput]', {
      id,
      name,
      value,
      min,
      max,
      step,
      allowNegative,
      disabled,
    })
  }

  return (
    <VurifyInput
      label={label}
      size={size}
      className={['theme-vurify-input--count', className].filter(Boolean).join(' ')}
      name={name}
      id={id}
      type="text"
      inputMode={allowDecimal ? 'decimal' : allowNegative ? 'text' : 'numeric'}
      autoComplete="off"
      spellCheck={false}
      required={required}
      disabled={disabled}
      autoFocus={autoFocus}
      value={value}
      {...rest}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={onFocus}
      onKeyDown={handleKeyDown}
      trailing={
        <span className="theme-vurify-input__count-stepper" role="group" aria-label={`${label} steppers`}>
          <button
            type="button"
            className="theme-vurify-input__count-step"
            aria-label={`Increase ${label}`}
            tabIndex={-1}
            disabled={disabled || atMax}
            onClick={() => stepBy(1)}
          >
            <ChevronUp strokeWidth={2.5} aria-hidden />
          </button>
          <button
            type="button"
            className="theme-vurify-input__count-step"
            aria-label={`Decrease ${label}`}
            tabIndex={-1}
            disabled={disabled || (current === null ? true : atMin)}
            onClick={() => stepBy(-1)}
          >
            <ChevronDown strokeWidth={2.5} aria-hidden />
          </button>
        </span>
      }
    />
  )
}
