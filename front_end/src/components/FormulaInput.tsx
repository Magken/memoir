import { useCallback, useId, useState, type ChangeEvent, type FocusEvent } from 'react'
import type { FieldSize, FieldVariant } from '../lib/forms/formControls'
import type { ValidateOn, ValidationRule } from '../lib/forms/formValidation'
import { useFormFieldValidation } from '../hooks/useFormFieldValidation'
import { EquationBlock } from './EquationBlock'
import { Field } from './Field'
import { FieldControlShell } from './FieldControlShell'

type FormulaInputProps = {
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
  onChange?: (latex: string) => void
  required?: boolean
  debug?: boolean
}

export function FormulaInput({
  label = 'Formula',
  hint = 'LaTeX syntax — preview updates as you type.',
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
  placeholder = 'E=mc^2',
  value: valueProp,
  defaultValue = '',
  onChange,
  required,
  debug = false,
}: FormulaInputProps) {
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
    console.debug('[FormulaInput]', { id, size, variant, error: Boolean(error) })
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
      <FieldControlShell layout="block">
        <textarea
          id={id}
          required={required}
          className="theme-field__textarea theme-formula-input__source"
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={displayValue ? `${id}-preview` : undefined}
          rows={3}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </FieldControlShell>
      {displayValue.trim() ? (
        <div id={`${id}-preview`} className="theme-formula-input__preview" aria-live="polite">
          <EquationBlock latex={displayValue} />
        </div>
      ) : null}
    </Field>
  )
}

export type { ValidateOn, ValidationRule }
