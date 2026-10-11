import { useCallback, useId, useState, type ChangeEvent, type FocusEvent } from 'react'
import type { FieldSize, FieldVariant } from '../lib/forms/formControls'
import type { ValidateOn, ValidationRule } from '../lib/forms/formValidation'
import { useFormFieldValidation } from '../hooks/useFormFieldValidation'
import { Field } from './Field'
import { StickyNoteBlock } from './StickyNoteBlock'

type StickyNoteFieldProps = {
  label?: string
  hint?: string
  error?: string | readonly string[]
  success?: string
  warning?: string
  variant?: FieldVariant
  size?: FieldSize
  className?: string
  rules?: readonly ValidationRule[]
  validateOn?: ValidateOn | readonly ValidateOn[]
  successMessage?: string
  showSuccessWhenValid?: boolean
  placeholder?: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  required?: boolean
  rows?: number
  debug?: boolean
}

export function StickyNoteField({
  label = 'Sticky note',
  hint = 'Short reminder or annotation text.',
  error: errorProp,
  success,
  warning,
  variant = 'flat',
  size = 'md',
  className = '',
  rules,
  validateOn = 'blur',
  successMessage,
  showSuccessWhenValid,
  placeholder = 'Write a note…',
  value: valueProp,
  defaultValue = '',
  onChange,
  required,
  rows = 4,
  debug = false,
}: StickyNoteFieldProps) {
  const autoId = useId()
  const id = autoId.replace(/:/g, '')
  const [internalValue, setInternalValue] = useState(defaultValue)
  const displayValue = valueProp !== undefined ? valueProp : internalValue

  const { error, success: resolvedSuccess, warning: resolvedWarning, onBlur, notifyChange } =
    useFormFieldValidation({
      value: displayValue,
      rules,
      validateOn,
      error: errorProp,
      success,
      warning,
      successMessage,
      showSuccessWhenValid,
      debug,
    })

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      notifyChange()
      const next = event.target.value
      if (valueProp === undefined) setInternalValue(next)
      onChange?.(next)
    },
    [notifyChange, onChange, valueProp],
  )

  const handleBlur = useCallback(
    (_event: FocusEvent<HTMLTextAreaElement>) => {
      onBlur()
    },
    [onBlur],
  )

  if (debug) {
    console.debug('[StickyNoteField]', { id, size, variant, error: Boolean(error) })
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
      <StickyNoteBlock>
        <textarea
          id={id}
          required={required}
          className="theme-sticky-note-field__input"
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          rows={rows}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </StickyNoteBlock>
    </Field>
  )
}

export type { ValidateOn, ValidationRule }
