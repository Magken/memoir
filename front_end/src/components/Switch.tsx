import { useCallback, useId, useState } from 'react'
import type { ChoiceSize } from '../lib/forms/choiceControls'

type SwitchProps = {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  label?: string
  labelPosition?: 'left' | 'right'
  size?: ChoiceSize
  disabled?: boolean
  className?: string
  id?: string
  debug?: boolean
}

const sizeClass: Record<ChoiceSize, string> = {
  xs: 'theme-switch--xs',
  sm: 'theme-switch--sm',
  md: 'theme-switch--md',
  lg: 'theme-switch--lg',
}

export function Switch({
  checked: checkedProp,
  defaultChecked = false,
  onChange,
  label,
  labelPosition = 'right',
  size = 'md',
  disabled = false,
  className = '',
  id: idProp,
  debug = false,
}: SwitchProps) {
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
    console.debug('[Switch]', { checked, size, disabled })
  }

  const track = (
    <span className="theme-switch__track" aria-hidden>
      <span className="theme-switch__fill" />
      <span className="theme-switch__thumb" />
    </span>
  )

  const labelNode = label ? (
    <span className="theme-switch__label type-label" id={`${id}-label`}>
      {label}
    </span>
  ) : null

  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked ? 'true' : 'false'}
      aria-labelledby={label ? `${id}-label` : undefined}
      disabled={disabled}
      className={[
        'theme-switch',
        sizeClass[size],
        checked ? 'theme-switch--on' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => setChecked(!checked)}
    >
      {labelPosition === 'left' ? labelNode : null}
      {track}
      {labelPosition === 'right' ? labelNode : null}
    </button>
  )
}
