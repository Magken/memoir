import { Eye, EyeOff } from 'lucide-react'
import { useCallback, useId, useState, type ChangeEvent, type FocusEvent, type InputHTMLAttributes } from 'react'
import type { ButtonSize } from '../lib/ui/buttonStyles'
import type { FieldSize, FieldVariant } from '../lib/forms/formControls'
import {
  passwordPolicyRules,
  type PasswordPolicy,
  type ValidationRule,
  type ValidateOn,
} from '../lib/forms/formValidation'
import { useFormFieldValidation } from '../hooks/useFormFieldValidation'
import { Button } from './Button'
import { Field } from './Field'
import { FieldControlShell, fieldControlRowClass } from './FieldControlShell'

const trailingButtonSize: Record<FieldSize, ButtonSize> = {
  xs: 'xs',
  sm: 'xs',
  md: 'sm',
  lg: 'md',
}

type PasswordInputProps = {
  label?: string
  hint?: string
  error?: string | readonly string[]
  success?: string
  warning?: string
  variant?: FieldVariant
  size?: FieldSize
  shadowless?: boolean
  className?: string
  rules?: readonly ValidationRule[]
  policy?: Partial<PasswordPolicy>
  validateOn?: ValidateOn | readonly ValidateOn[]
  successMessage?: string
  showSuccessWhenValid?: boolean
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  debug?: boolean
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type' | 'value' | 'defaultValue' | 'onChange'
>

export function PasswordInput({
  label,
  hint,
  error: errorProp,
  success,
  warning,
  variant = 'flat',
  size = 'md',
  shadowless = false,
  className = '',
  rules: rulesProp,
  policy,
  validateOn = 'blur',
  successMessage = 'Password meets requirements',
  showSuccessWhenValid,
  value: valueProp,
  defaultValue = '',
  onValueChange,
  debug = false,
  id: idProp,
  disabled = false,
  required,
  onBlur: onBlurProp,
  ...rest
}: PasswordInputProps) {
  const autoId = useId()
  const id = idProp ?? autoId.replace(/:/g, '')
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [visible, setVisible] = useState(false)
  const value = valueProp ?? internalValue
  const rules = rulesProp ?? passwordPolicyRules(policy)

  const { error, success: resolvedSuccess, warning: resolvedWarning, onBlur, notifyChange } =
    useFormFieldValidation({
      value,
      rules,
      validateOn,
      error: errorProp,
      success,
      warning,
      successMessage,
      showSuccessWhenValid,
      debug,
    })

  const setValue = useCallback(
    (next: string) => {
      if (valueProp === undefined) {
        setInternalValue(next)
      }
      onValueChange?.(next)
    },
    [onValueChange, valueProp],
  )

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      notifyChange()
      setValue(event.target.value)
    },
    [notifyChange, setValue],
  )

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      onBlur()
      onBlurProp?.(event)
    },
    [onBlur, onBlurProp],
  )

  const toggleVisible = useCallback(() => {
    setVisible((current) => !current)
  }, [])

  if (debug) {
    console.debug('[PasswordInput]', {
      id,
      visible,
      valueLength: value.length,
      ruleCount: rules.length,
      error: Boolean(error),
    })
  }

  const toggleLabel = visible ? 'Hide password' : 'Show password'

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
      shadowless={shadowless}
      htmlFor={id}
      className={className}
    >
      <FieldControlShell rowClassName={fieldControlRowClass({ trailing: true })}>
        <input
          {...rest}
          id={id}
          type={visible ? 'text' : 'password'}
          disabled={disabled}
          value={value}
          autoComplete={rest.autoComplete ?? 'new-password'}
          className="theme-field__control"
          aria-invalid={error ? true : undefined}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        <Button
          type="button"
          variant="ghost"
          size={trailingButtonSize[size]}
          disabled={disabled}
          className="theme-field__control-trailing"
          aria-label={toggleLabel}
          aria-pressed={visible}
          iconNode={
            <span className="theme-field__visibility" data-revealed={visible ? 'true' : 'false'}>
              <Eye
                className="theme-field__visibility-icon theme-field__visibility-icon--show"
                aria-hidden
                strokeWidth={2.25}
              />
              <EyeOff
                className="theme-field__visibility-icon theme-field__visibility-icon--hide"
                aria-hidden
                strokeWidth={2.25}
              />
            </span>
          }
          onClick={toggleVisible}
        />
      </FieldControlShell>
    </Field>
  )
}

export type { PasswordPolicy, ValidateOn, ValidationRule }
