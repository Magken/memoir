import { useCallback, useId, useState, type ChangeEvent, type FocusEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import type { FieldSize, FieldVariant } from '../lib/forms/formControls'
import type { ValidateOn, ValidationRule } from '../lib/forms/formValidation'
import { useFormFieldValidation } from '../hooks/useFormFieldValidation'
import { Field } from './Field'
import { FieldControlShell, fieldControlRowClass } from './FieldControlShell'

type InputProps = {
  label?: string
  hint?: string
  error?: string | readonly string[]
  success?: string
  warning?: string
  optional?: boolean
  prefix?: ReactNode
  suffix?: ReactNode
  /** Widen leading inset for text prefixes such as `https://` — default `icon` */
  prefixLayout?: 'icon' | 'wide'
  variant?: FieldVariant
  size?: FieldSize
  /** Strip card brutal shadow + focus lift from the control shell. */
  shadowless?: boolean
  className?: string
  /** Extra classes on the `<input>` (not the Field wrapper). */
  controlClassName?: string
  rules?: readonly ValidationRule[]
  validateOn?: ValidateOn | readonly ValidateOn[]
  successMessage?: string
  showSuccessWhenValid?: boolean
  debug?: boolean
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'>

export function Input({
  label,
  hint,
  error: errorProp,
  success,
  warning,
  optional,
  prefix,
  suffix,
  prefixLayout = 'icon',
  variant = 'flat',
  size = 'md',
  shadowless = false,
  className = '',
  controlClassName = '',
  rules,
  validateOn = 'blur',
  successMessage,
  showSuccessWhenValid,
  debug = false,
  id: idProp,
  value: valueProp,
  defaultValue,
  required,
  onChange: onChangeProp,
  onBlur: onBlurProp,
  ...rest
}: InputProps) {
  const autoId = useId()
  const id = idProp ?? autoId.replace(/:/g, '')
  const [internalValue, setInternalValue] = useState(defaultValue?.toString() ?? '')
  const displayValue = valueProp !== undefined ? String(valueProp) : internalValue
  const hasAddons = Boolean(prefix || suffix)

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
    (event: ChangeEvent<HTMLInputElement>) => {
      notifyChange()
      if (valueProp === undefined) {
        setInternalValue(event.target.value)
      }
      onChangeProp?.(event)
    },
    [notifyChange, onChangeProp, valueProp],
  )

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      onBlur()
      onBlurProp?.(event)
    },
    [onBlur, onBlurProp],
  )

  if (debug) {
    console.debug('[Input]', {
      id,
      size,
      variant,
      error: Boolean(error),
      success: Boolean(success),
      ruleCount: rules?.length ?? 0,
    })
  }

  const input = (
    <input
      id={id}
      required={required}
      className={['theme-field__control', controlClassName].filter(Boolean).join(' ')}
      aria-invalid={error ? true : undefined}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      {...rest}
    />
  )

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      success={resolvedSuccess}
      warning={resolvedWarning}
      required={required}
      optional={optional}
      variant={variant}
      size={size}
      shadowless={shadowless}
      htmlFor={id}
      className={className}
    >
      {hasAddons ? (
        <FieldControlShell
          rowClassName={fieldControlRowClass({
            leading: Boolean(prefix),
            leadingWide: Boolean(prefix && prefixLayout === 'wide'),
            trailing: Boolean(suffix),
          })}
        >
          {prefix ? (
            <span
              className={[
                'theme-field__control-leading',
                prefixLayout === 'wide' ? 'theme-field__control-leading--wide' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {prefix}
            </span>
          ) : null}
          {input}
          {suffix ? <span className="theme-field__control-trailing-slot">{suffix}</span> : null}
        </FieldControlShell>
      ) : (
        <FieldControlShell>{input}</FieldControlShell>
      )}
    </Field>
  )
}

export type { ValidateOn, ValidationRule }
