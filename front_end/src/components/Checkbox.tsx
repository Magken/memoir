import { Check } from 'lucide-react'
import { useCallback, useId, useState } from 'react'
import type { FieldSize } from '../lib/forms/formControls'

const checkboxSizeClass: Record<FieldSize, string> = {
  xs: 'theme-checkbox--sm',
  sm: 'theme-checkbox--sm',
  md: 'theme-checkbox--md',
  lg: 'theme-checkbox--lg',
}

type CheckboxProps = {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  label?: string
  description?: string
  size?: FieldSize
  disabled?: boolean
  className?: string
  id?: string
  /** When `label` is omitted — accessible name for the control alone. */
  'aria-label'?: string
  debug?: boolean
}

export function Checkbox({
  checked: checkedProp,
  defaultChecked = false,
  onChange,
  label,
  description,
  size = 'md',
  disabled = false,
  className = '',
  id: idProp,
  'aria-label': ariaLabel,
  debug = false,
}: CheckboxProps) {
  const autoId = useId()
  const id = idProp ?? autoId.replace(/:/g, '')
  const [internalChecked, setInternalChecked] = useState(defaultChecked)
  const checked = checkedProp ?? internalChecked

  const setChecked = useCallback(
    (next: boolean) => {
      if (checkedProp === undefined) {
        setInternalChecked(next)
      }
      onChange?.(next)
    },
    [checkedProp, onChange],
  )

  if (debug) {
    console.debug('[Checkbox]', { checked, size, disabled })
  }

  return (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={checked ? 'true' : 'false'}
      aria-label={label ? undefined : ariaLabel}
      disabled={disabled}
      className={[
        'theme-checkbox',
        checkboxSizeClass[size],
        checked ? 'theme-checkbox--checked' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => setChecked(!checked)}
    >
      <span className="theme-checkbox__box" aria-hidden>
        <span className="theme-checkbox__fill" />
        <span className="theme-checkbox__mark">
          <Check strokeWidth={3} />
        </span>
      </span>
      {label || description ? (
        <span className="theme-checkbox__text">
          {label ? <span className="type-label">{label}</span> : null}
          {description ? <span className="type-caption type-muted">{description}</span> : null}
        </span>
      ) : null}
    </button>
  )
}
