import {
  useCallback,
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
} from 'react'
import { formatDateInputText } from '../lib/forms/dateTimePicker'
import { VurifyInput } from './VurifyInput'

type VurifyDateInputProps = {
  label: string
  value: string
  onValueChange: (value: string) => void
  className?: string
  name?: string
  id?: string
  required?: boolean
  disabled?: boolean
  autoFocus?: boolean
  autoComplete?: string
  /** Defaults to `YYYY-MM-DD` — shown when the floating label has risen. */
  placeholder?: string
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
  | 'placeholder'
>

/**
 * Product Vurify date line field — digits only, auto `YYYY-MM-DD` dashes while typing.
 * Pair with `validators.date()` / `validators.required` via Field + useFormFieldValidation.
 */
export function VurifyDateInput({
  label,
  value,
  onValueChange,
  className = '',
  name,
  id,
  required,
  disabled,
  autoFocus,
  autoComplete = 'off',
  placeholder = 'YYYY-MM-DD',
  onBlur,
  onFocus,
  debug = false,
  ...rest
}: VurifyDateInputProps) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onValueChange(formatDateInputText(event.target.value))
    },
    [onValueChange],
  )

  if (debug) {
    console.debug('[VurifyDateInput]', { id, name, value, required, disabled })
  }

  return (
    <VurifyInput
      label={label}
      className={['theme-vurify-input--date', className].filter(Boolean).join(' ')}
      name={name}
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete={autoComplete}
      placeholder={placeholder}
      spellCheck={false}
      required={required}
      disabled={disabled}
      autoFocus={autoFocus}
      value={value}
      {...rest}
      onChange={handleChange}
      onBlur={onBlur}
      onFocus={onFocus}
    />
  )
}
