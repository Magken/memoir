import { ChevronDown, ChevronUp } from 'lucide-react'
import { useCallback, useMemo, type ReactNode } from 'react'
import type { FieldSize, FieldVariant } from '../lib/forms/formControls'
import { Field } from './Field'
import { FieldControlShell } from './FieldControlShell'

type CounterSize = 'xs' | 'sm' | 'md'

type CounterProps = {
  label?: string
  hint?: string
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** Discrete stepped values — when set, up/down moves through this list */
  steps?: readonly number[]
  /**
   * When false (default), floor is `max(0, min ?? 0)` so values cannot go negative.
   * Set true to allow negatives (respects `min` when set; unbounded when omitted).
   */
  allowNegative?: boolean
  formatDisplay?: (value: number) => string
  size?: CounterSize
  variant?: FieldVariant
  disabled?: boolean
  /** Field control shell — border + shadow like Input */
  shell?: boolean
  /** Custom value region (e.g. hex text input) */
  valueSlot?: ReactNode
  onStepUp?: () => void
  onStepDown?: () => void
  disableStepUp?: boolean
  disableStepDown?: boolean
  className?: string
  'aria-label'?: string
}

function clampNumber(value: number, min?: number, max?: number): number {
  let next = value
  if (min !== undefined) next = Math.max(min, next)
  if (max !== undefined) next = Math.min(max, next)
  return next
}

function resolveCounterMin(min: number | undefined, allowNegative: boolean): number | undefined {
  if (allowNegative) return min
  return Math.max(0, min ?? 0)
}

function counterFieldSize(size: CounterSize): FieldSize {
  if (size === 'xs') return 'sm'
  if (size === 'sm') return 'sm'
  return 'md'
}

export function Counter({
  label,
  hint,
  value,
  onValueChange,
  min: minProp,
  max,
  step = 1,
  steps,
  allowNegative = false,
  formatDisplay,
  size = 'sm',
  variant = 'flat',
  disabled = false,
  shell = false,
  valueSlot,
  onStepUp,
  onStepDown,
  disableStepUp,
  disableStepDown,
  className = '',
  'aria-label': ariaLabel,
}: CounterProps) {
  const min = resolveCounterMin(minProp, allowNegative)
  const displayValue = formatDisplay ? formatDisplay(value) : String(value)

  const { atMin, atMax, stepUp, stepDown } = useMemo(() => {
    if (onStepUp || onStepDown) {
      return {
        atMin: disableStepDown ?? false,
        atMax: disableStepUp ?? false,
        stepUp: onStepUp ?? (() => {}),
        stepDown: onStepDown ?? (() => {}),
      }
    }

    if (steps && steps.length > 0) {
      const index = steps.indexOf(value)
      const resolvedIndex = index >= 0 ? index : 0
      return {
        atMin: resolvedIndex <= 0,
        atMax: resolvedIndex >= steps.length - 1,
        stepUp: () => {
          if (resolvedIndex < steps.length - 1) onValueChange(steps[resolvedIndex + 1])
        },
        stepDown: () => {
          if (resolvedIndex > 0) onValueChange(steps[resolvedIndex - 1])
        },
      }
    }

    const nextMin = min !== undefined ? value - step < min : false
    const nextMax = max !== undefined ? value + step > max : false

    return {
      atMin: nextMin,
      atMax: nextMax,
      stepUp: () => onValueChange(clampNumber(value + step, min, max)),
      stepDown: () => onValueChange(clampNumber(value - step, min, max)),
    }
  }, [
    disableStepDown,
    disableStepUp,
    max,
    min,
    onStepDown,
    onStepUp,
    onValueChange,
    step,
    steps,
    value,
  ])

  const handleStepUp = useCallback(() => {
    if (disabled) return
    stepUp()
  }, [disabled, stepUp])

  const handleStepDown = useCallback(() => {
    if (disabled) return
    stepDown()
  }, [disabled, stepDown])

  const control = (
    <div
      className={[
        'theme-counter',
        `theme-counter--${size}`,
        shell ? 'theme-counter--in-shell' : '',
        disabled ? 'theme-counter--disabled' : '',
        label || shell ? '' : className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="group"
      aria-label={ariaLabel ?? label ?? 'Counter'}
    >
      {valueSlot ?? (
        <span className="theme-counter__value type-caption tabular-nums" aria-live="polite" aria-atomic="true">
          {displayValue}
        </span>
      )}
      <span className="theme-counter__stepper">
        <button
          type="button"
          className="theme-counter__step"
          aria-label="Increase value"
          disabled={disabled || atMax}
          onClick={handleStepUp}
        >
          <ChevronUp strokeWidth={2.5} aria-hidden />
        </button>
        <button
          type="button"
          className="theme-counter__step"
          aria-label="Decrease value"
          disabled={disabled || atMin}
          onClick={handleStepDown}
        >
          <ChevronDown strokeWidth={2.5} aria-hidden />
        </button>
      </span>
    </div>
  )

  const wrappedControl = shell ? <FieldControlShell>{control}</FieldControlShell> : control

  if (!label) {
    if (shell) {
      return (
        <Field variant={variant} size={counterFieldSize(size)} className={className}>
          {wrappedControl}
        </Field>
      )
    }
    return control
  }

  return (
    <Field label={label} hint={hint} variant={variant} size={counterFieldSize(size)} className={className}>
      {wrappedControl}
    </Field>
  )
}
