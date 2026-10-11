import type { LucideIcon } from 'lucide-react'
import { useCallback, useId, useState, type CSSProperties } from 'react'
import {
  choiceIndex,
  clampChoiceIndex,
  type ChoiceOption,
  type ChoiceSize,
} from '../lib/forms/choiceControls'

export type RadioGroupVariant =
  | 'classic'
  | 'segmented'
  | 'tiered'
  | 'vurify'
  | 'vurify-tiered'

export type RadioGroupOption = ChoiceOption & {
  icon?: LucideIcon
  description?: string
}

type RadioGroupProps = {
  options: readonly RadioGroupOption[]
  /**
   * `classic` — round radios · `segmented` — sliding pill · `tiered` — Free + Premium morph pill ·
   * `vurify` — underline housing toggle (2+ options; Solo/Team-style chrome) ·
   * `vurify-tiered` — Free · Premium Solo/Team morph in Vurify border / underline chrome
   */
  variant?: RadioGroupVariant
  /** `tiered` / `vurify-tiered` — label above premium sub-options (default `Premium`) */
  tierLabel?: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  name?: string
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

export function RadioGroup({
  options,
  variant = 'classic',
  tierLabel = 'Premium',
  value: valueProp,
  defaultValue,
  onChange,
  name: nameProp,
  size = 'md',
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
  debug = false,
}: RadioGroupProps) {
  const autoName = useId()
  const name = nameProp ?? autoName.replace(/:/g, '')
  const firstValue = options[0]?.value ?? ''

  const [internalValue, setInternalValue] = useState(
    defaultValue ?? (valueProp !== undefined ? valueProp : firstValue),
  )

  // Prefer explicit value (including "") so parents can show "none selected".
  // `valueProp ?? internal` wrongly fell through on undefined and showed the first option
  // selected without ever calling onChange — questionnaire Continue then sent {}.
  const value = valueProp !== undefined ? valueProp : internalValue
  const selectedIndex = clampChoiceIndex(choiceIndex(value, options), options.length)

  const setValue = useCallback(
    (next: string) => {
      if (valueProp === undefined) {
        setInternalValue(next)
      }
      onChange?.(next)
    },
    [onChange, valueProp],
  )

  if (debug) {
    console.debug('[RadioGroup]', { variant, value, selectedIndex, size, disabled })
  }

  if (options.length === 0) {
    return null
  }

  const variantClass =
    variant === 'classic'
      ? 'theme-radio-group--classic'
      : variant === 'tiered'
        ? 'theme-radio-group--tiered'
        : variant === 'vurify-tiered'
          ? 'theme-radio-group--vurify-tiered'
          : variant === 'vurify'
            ? 'theme-radio-group--vurify'
            : 'theme-radio-group--segmented'

  const rootClass = ['theme-choice', 'theme-radio-group', variantClass, sizeClass[size], className]
    .filter(Boolean)
    .join(' ')

  if (variant === 'vurify') {
    if (options.length < 2) return null

    return (
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        className={rootClass}
      >
        <div className="theme-vurify">
          {options.map((option) => {
            const checked = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                name={name}
                value={option.value}
                aria-checked={checked}
                disabled={disabled}
                className="theme-vurify__option"
                onClick={() => setValue(option.value)}
              >
                <span className="theme-vurify__label">{option.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (variant === 'tiered' || variant === 'vurify-tiered') {
    const primary = options[0]
    const premiumOptions = options.slice(1)

    if (!primary || premiumOptions.length === 0) {
      return null
    }

    const isPrimary = value === primary.value
    const premiumActive = !isPrimary
    const subIndex = clampChoiceIndex(choiceIndex(value, premiumOptions), premiumOptions.length)
    const vurify = variant === 'vurify-tiered'
    const shell = vurify ? 'theme-vurify-tiered' : 'theme-tiered'
    const freeClass = vurify ? 'theme-vurify-tiered__free' : 'theme-tiered__free font-semibold'
    const premiumClass = vurify ? 'theme-vurify-tiered__premium' : 'theme-tiered__premium'
    const planClass = vurify ? 'theme-vurify-tiered__plan' : 'theme-tiered__plan'
    const planLabelClass = vurify ? 'theme-vurify-tiered__plan-label' : 'theme-tiered__plan-label'
    const capClass = vurify ? 'theme-vurify-tiered__cap' : 'theme-tiered__cap'
    const subFillClass = vurify ? 'theme-vurify-tiered__sub-outline' : 'theme-tiered__sub-fill'

    return (
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        className={rootClass}
      >
        <div
          className={[shell, premiumActive ? `${shell}--premium` : `${shell}--free`]
            .filter(Boolean)
            .join(' ')}
          style={
            {
              ['--tier-sub-count' as string]: String(premiumOptions.length),
              ['--tier-sub-index' as string]: String(subIndex),
            } as CSSProperties
          }
        >
          <button
            type="button"
            role="radio"
            name={name}
            value={primary.value}
            aria-checked={isPrimary}
            disabled={disabled}
            className={freeClass}
            onClick={() => setValue(primary.value)}
          >
            {vurify ? (
              <span className="theme-vurify-tiered__label">{primary.label}</span>
            ) : (
              <span>{primary.label}</span>
            )}
          </button>
          <div className={premiumClass}>
            <span className={subFillClass} aria-hidden />
            {premiumOptions.map((option) => {
              const checked = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  name={name}
                  value={option.value}
                  aria-checked={checked}
                  aria-label={`${tierLabel} ${option.label}`}
                  disabled={disabled}
                  className={planClass}
                  onClick={() => setValue(option.value)}
                >
                  <span className={planLabelClass}>{option.label}</span>
                </button>
              )
            })}
            <span className={capClass} aria-hidden>
              {tierLabel}
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'classic') {
    return (
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        className={rootClass}
      >
        {options.map((option) => {
          const checked = option.value === value
          const Icon = option.icon

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              name={name}
              value={option.value}
              aria-checked={checked}
              disabled={disabled}
              className="theme-radio-option"
              onClick={() => setValue(option.value)}
            >
              <span className="theme-radio__control" aria-hidden>
                <span className="theme-radio__ring" />
                <span className="theme-radio__fill" />
                <span className="theme-radio__dot" />
              </span>
              <span className="theme-radio__text">
                <span className="theme-radio__label type-label">
                  {Icon ? <Icon aria-hidden strokeWidth={2} /> : null}
                  {option.label}
                </span>
                {option.description ? (
                  <span className="theme-radio__desc type-caption type-muted">{option.description}</span>
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
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      className={rootClass}
      style={
        {
          ['--choice-count' as string]: String(options.length),
          ['--choice-index' as string]: String(selectedIndex),
        } as CSSProperties
      }
    >
      <div className="theme-choice-track">
        <span className="theme-choice-indicator" aria-hidden />
        {options.map((option) => {
          const checked = option.value === value
          const Icon = option.icon

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              name={name}
              value={option.value}
              aria-checked={checked}
              disabled={disabled}
              className="theme-choice-option theme-radio-option"
              onClick={() => setValue(option.value)}
            >
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
