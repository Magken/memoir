import { Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useCallback, useState } from 'react'
import { type ChoiceOption, type ChoiceSize } from '../lib/forms/choiceControls'

export type CheckboxGroupVariant = 'classic' | 'button'

export type CheckboxGroupOption = ChoiceOption & {
  icon?: LucideIcon
  description?: string
}

type CheckboxGroupProps = {
  options: readonly CheckboxGroupOption[]
  /** `classic` — square checkboxes + fill/mark · `button` — neobrutal multi-select chips */
  variant?: CheckboxGroupVariant
  value?: string[]
  defaultValue?: string[]
  onChange?: (value: string[]) => void
  size?: ChoiceSize
  disabled?: boolean
  className?: string
  'aria-label'?: string
  debug?: boolean
}

const sizeClass: Record<ChoiceSize, string> = {
  xs: 'theme-choice--sm',
  sm: 'theme-choice--sm',
  md: 'theme-choice--md',
  lg: 'theme-choice--lg',
}

function normalizeValue(value: string[] | undefined, fallback: string[]): string[] {
  if (value === undefined) return fallback
  return value
}

function CheckboxControl() {
  return (
    <span className="theme-checkbox__box" aria-hidden>
      <span className="theme-checkbox__fill" />
      <span className="theme-checkbox__mark">
        <Check strokeWidth={3} />
      </span>
    </span>
  )
}

export function CheckboxGroup({
  options,
  variant = 'classic',
  value: valueProp,
  defaultValue = [],
  onChange,
  size = 'md',
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
  debug = false,
}: CheckboxGroupProps) {
  const [internalValue, setInternalValue] = useState<string[]>(defaultValue)
  const value = normalizeValue(valueProp, internalValue)

  const toggle = useCallback(
    (optionValue: string) => {
      const current = normalizeValue(valueProp, internalValue)
      const next = current.includes(optionValue)
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue]

      if (valueProp === undefined) {
        setInternalValue(next)
      }
      onChange?.(next)
    },
    [internalValue, onChange, valueProp],
  )

  if (debug) {
    console.debug('[CheckboxGroup]', { variant, value, size, disabled })
  }

  if (options.length === 0) {
    return null
  }

  const rootClass = [
    'theme-choice',
    'theme-checkbox-group',
    variant === 'classic' ? 'theme-checkbox-group--classic' : 'theme-checkbox-group--button',
    variant === 'button' ? 'theme-toggle-group--multiple' : '',
    sizeClass[size],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (variant === 'classic') {
    return (
      <div
        role="group"
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        className={rootClass}
      >
        {options.map((option) => {
          const checked = value.includes(option.value)
          const Icon = option.icon

          return (
            <button
              key={option.value}
              type="button"
              role="checkbox"
              aria-checked={checked}
              disabled={disabled}
              className="theme-checkbox-option"
              onClick={() => toggle(option.value)}
            >
              <CheckboxControl />
              <span className="theme-checkbox__text">
                <span className="theme-checkbox__label type-label">
                  {Icon ? <Icon aria-hidden strokeWidth={2} /> : null}
                  {option.label}
                </span>
                {option.description ? (
                  <span className="theme-checkbox__desc type-caption type-muted">
                    {option.description}
                  </span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      className={rootClass}
    >
      <div className="theme-choice-track">
        {options.map((option) => {
          const pressed = value.includes(option.value)
          const Icon = option.icon

          return (
            <button
              key={option.value}
              type="button"
              role="checkbox"
              aria-checked={pressed}
              disabled={disabled}
              className="theme-choice-option theme-checkbox-option"
              onClick={() => toggle(option.value)}
            >
              <span className="theme-choice-option__fill" aria-hidden />
              <span className="theme-choice-option__inner type-label">
                <CheckboxControl />
                {Icon ? <Icon aria-hidden strokeWidth={2} /> : null}
                {option.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
