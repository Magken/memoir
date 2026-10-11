import type { LucideIcon } from 'lucide-react'
import { useCallback, useState, type CSSProperties } from 'react'
import {
  choiceIndex,
  clampChoiceIndex,
  type ChoiceOption,
  type ChoiceSize,
} from '../lib/forms/choiceControls'

export type ToggleGroupOption = ChoiceOption & {
  icon?: LucideIcon
}

export type ToggleGroupVariant = 'default' | 'vurify'

type ToggleGroupProps = {
  options: readonly ToggleGroupOption[]
  mode?: 'single' | 'multiple'
  /**
   * `default` — sliding pill / multi fill ·
   * `vurify` — underline housing (single mode only; 2+ options)
   */
  variant?: ToggleGroupVariant
  value?: string | string[]
  defaultValue?: string | string[]
  onChange?: (value: string | string[]) => void
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

function normalizeMultiple(value: string | string[] | undefined, fallback: string[]): string[] {
  if (value === undefined) return fallback
  return Array.isArray(value) ? value : [value]
}

export function ToggleGroup({
  options,
  mode = 'single',
  variant = 'default',
  value: valueProp,
  defaultValue,
  onChange,
  size = 'md',
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
  debug = false,
}: ToggleGroupProps) {
  const firstValue = options[0]?.value ?? ''
  const defaultSingle = typeof defaultValue === 'string' ? defaultValue : firstValue
  const defaultMulti = normalizeMultiple(defaultValue, [])

  const [internalSingle, setInternalSingle] = useState(defaultSingle)
  const [internalMulti, setInternalMulti] = useState<string[]>(defaultMulti)

  const isSingle = mode === 'single'
  const singleValue = isSingle
    ? valueProp !== undefined
      ? typeof valueProp === 'string'
        ? valueProp
        : (valueProp[0] ?? firstValue)
      : internalSingle
    : firstValue

  const multiValue = !isSingle
    ? normalizeMultiple(valueProp, internalMulti)
    : []

  const selectedIndex = isSingle
    ? clampChoiceIndex(choiceIndex(singleValue, options), options.length)
    : 0

  const setSingle = useCallback(
    (next: string) => {
      if (valueProp === undefined) {
        setInternalSingle(next)
      }
      onChange?.(next)
    },
    [onChange, valueProp],
  )

  const toggleMulti = useCallback(
    (optionValue: string) => {
      const current = normalizeMultiple(valueProp, internalMulti)
      const next = current.includes(optionValue)
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue]

      if (valueProp === undefined) {
        setInternalMulti(next)
      }
      onChange?.(next)
    },
    [internalMulti, onChange, valueProp],
  )

  if (debug) {
    console.debug('[ToggleGroup]', { mode, variant, singleValue, multiValue, size, disabled })
  }

  if (options.length === 0) {
    return null
  }

  if (variant === 'vurify') {
    if (!isSingle || options.length < 2) return null

    const rootClass = [
      'theme-choice',
      'theme-toggle-group',
      'theme-toggle-group--vurify',
      sizeClass[size],
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div
        role="group"
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        className={rootClass}
      >
        <div className="theme-vurify">
          {options.map((option) => {
            const pressed = option.value === singleValue
            const Icon = option.icon
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={pressed}
                disabled={disabled}
                className="theme-vurify__option"
                onClick={() => setSingle(option.value)}
              >
                <span className="theme-vurify__label">
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

  const rootClass = [
    'theme-choice',
    'theme-toggle-group',
    isSingle ? 'theme-toggle-group--single' : 'theme-toggle-group--multiple',
    sizeClass[size],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const rootStyle = isSingle
    ? ({
        ['--choice-count' as string]: String(options.length),
        ['--choice-index' as string]: String(selectedIndex),
      } as CSSProperties)
    : undefined

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      className={rootClass}
      style={rootStyle}
    >
      <div className="theme-choice-track">
        {isSingle ? <span className="theme-choice-indicator" aria-hidden /> : null}
        {options.map((option) => {
          const pressed = isSingle
            ? option.value === singleValue
            : multiValue.includes(option.value)
          const Icon = option.icon

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={pressed}
              disabled={disabled}
              className="theme-choice-option theme-toggle-option"
              onClick={() =>
                isSingle ? setSingle(option.value) : toggleMulti(option.value)
              }
            >
              {!isSingle ? <span className="theme-choice-option__fill" aria-hidden /> : null}
              <span className="theme-choice-option__inner type-label">
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
