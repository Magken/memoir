import { useCallback, useId, useState, type ChangeEvent, type FocusEvent, type TextareaHTMLAttributes } from 'react'
import type { FieldSize, FieldVariant } from '../lib/forms/formControls'
import type { ValidateOn, ValidationRule } from '../lib/forms/formValidation'
import { useFormFieldValidation } from '../hooks/useFormFieldValidation'
import { Field, type FieldCounter } from './Field'
import { FieldControlShell } from './FieldControlShell'

type TextareaProps = {
  label?: string
  hint?: string
  error?: string | readonly string[]
  success?: string
  warning?: string
  showCounter?: boolean
  variant?: FieldVariant
  size?: FieldSize
  shadowless?: boolean
  className?: string
  rules?: readonly ValidationRule[]
  validateOn?: ValidateOn | readonly ValidateOn[]
  successMessage?: string
  showSuccessWhenValid?: boolean
  debug?: boolean
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>

function resolveMaxLength(
  maxLengthProp: number | undefined,
  rules: readonly ValidationRule[] | undefined,
): number | undefined {
  if (maxLengthProp !== undefined) return maxLengthProp
  const rule = rules?.find((item) => item.type === 'maxLength')
  return rule?.type === 'maxLength' ? rule.max : undefined
}

export function Textarea({
  label,
  hint,
  error: errorProp,
  success,
  warning,
  showCounter = true,
  variant = 'flat',
  size = 'md',
  shadowless = false,
  className = '',
  rules,
  validateOn = 'blur',
  successMessage,
  showSuccessWhenValid,
  debug = false,
  id: idProp,
  value: valueProp,
  defaultValue,
  required,
  maxLength: maxLengthProp,
  onChange: onChangeProp,
  onBlur: onBlurProp,
  ...rest
}: TextareaProps) {
  const autoId = useId()
  const id = idProp ?? autoId.replace(/:/g, '')
  const [internalValue, setInternalValue] = useState(defaultValue?.toString() ?? '')
  const displayValue = valueProp !== undefined ? String(valueProp) : internalValue
  const maxLength = resolveMaxLength(maxLengthProp, rules)

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

  const counter: FieldCounter | undefined =
    showCounter && maxLength !== undefined
      ? { value: displayValue.length, max: maxLength }
      : undefined

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      notifyChange()
      if (valueProp === undefined) {
        setInternalValue(event.target.value)
      }
      onChangeProp?.(event)
    },
    [notifyChange, onChangeProp, valueProp],
  )

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLTextAreaElement>) => {
      onBlur()
      onBlurProp?.(event)
    },
    [onBlur, onBlurProp],
  )

  if (debug) {
    console.debug('[Textarea]', { id, size, variant, error: Boolean(error), maxLength })
  }

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      success={resolvedSuccess}
      warning={resolvedWarning}
      required={required}
      counter={counter}
      variant={variant}
      size={size}
      shadowless={shadowless}
      htmlFor={id}
      className={className}
    >
      <FieldControlShell layout="block">
        <textarea
          id={id}
          required={required}
          maxLength={maxLength}
          className="theme-field__textarea"
          aria-invalid={error ? true : undefined}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          {...rest}
        />
      </FieldControlShell>
    </Field>
  )
}

export type { ValidateOn, ValidationRule }
