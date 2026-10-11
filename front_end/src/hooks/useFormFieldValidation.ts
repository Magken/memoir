import { useCallback, useMemo, useState } from 'react'
import { normalizeFieldMessages } from '../lib/forms/formControls'
import {
  DEFAULT_VALIDATION_SUCCESS_MESSAGE,
  validateValue,
  validationIssueMessages,
  type ValidateOn,
  type ValidationResult,
  type ValidationRule,
} from '../lib/forms/formValidation'

type UseFormFieldValidationOptions = {
  value: string
  rules?: readonly ValidationRule[]
  validateOn?: ValidateOn | readonly ValidateOn[]
  /** Manual error from parent — shown when set regardless of rules */
  error?: string | readonly string[]
  success?: string
  warning?: string
  /** Shown when rules pass after validation — default `Looks good` */
  successMessage?: string
  /** Auto success tint when rules pass — default `true` when `rules` non-empty */
  showSuccessWhenValid?: boolean
  debug?: boolean
}

type UseFormFieldValidationResult = {
  validation: ValidationResult
  error?: string | readonly string[]
  success?: string
  warning?: string
  touched: boolean
  submitted: boolean
  onBlur: () => void
  notifyChange: () => void
  markSubmitted: () => void
  resetValidation: () => void
}

function normalizeValidateOn(validateOn: ValidateOn | readonly ValidateOn[]): ValidateOn[] {
  return typeof validateOn === 'string' ? [validateOn] : [...validateOn]
}

export function useFormFieldValidation({
  value,
  rules = [],
  validateOn = 'blur',
  error: errorProp,
  success: successProp,
  warning: warningProp,
  successMessage = DEFAULT_VALIDATION_SUCCESS_MESSAGE,
  showSuccessWhenValid = true,
  debug = false,
}: UseFormFieldValidationOptions): UseFormFieldValidationResult {
  const [touched, setTouched] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [dirty, setDirty] = useState(false)
  const modes = normalizeValidateOn(validateOn)

  const validation = useMemo(() => validateValue(value, rules), [rules, value])

  const shouldValidate =
    modes.includes('change') && dirty
      ? true
      : modes.includes('blur') && touched
        ? true
        : modes.includes('submit') && submitted

  const manualErrors = normalizeFieldMessages(errorProp)
  const ruleErrors =
    shouldValidate && rules.length > 0 && !validation.valid
      ? validationIssueMessages(validation)
      : []
  const error =
    manualErrors.length > 0
      ? manualErrors
      : ruleErrors.length > 0
        ? ruleErrors
        : undefined

  const ruleSuccess =
    showSuccessWhenValid &&
    shouldValidate &&
    rules.length > 0 &&
    validation.valid &&
    value.trim().length > 0
      ? successMessage
      : undefined

  const success = successProp ?? ruleSuccess

  const onBlur = useCallback(() => {
    setTouched(true)
  }, [])

  const notifyChange = useCallback(() => {
    setDirty(true)
    if (modes.includes('change')) {
      setTouched(true)
    }
  }, [modes])

  const markSubmitted = useCallback(() => {
    setSubmitted(true)
    setTouched(true)
  }, [])

  const resetValidation = useCallback(() => {
    setTouched(false)
    setSubmitted(false)
    setDirty(false)
  }, [])

  if (debug) {
    console.debug('[useFormFieldValidation]', {
      valueLength: value.length,
      ruleCount: rules.length,
      shouldValidate,
      valid: validation.valid,
      issueCount: validation.issues.length,
      errorCount: normalizeFieldMessages(error).length,
      touched,
      submitted,
      dirty,
      modes,
    })
  }

  return {
    validation,
    error,
    success,
    warning: warningProp,
    touched,
    submitted,
    onBlur,
    notifyChange,
    markSubmitted,
    resetValidation,
  }
}

export type { ValidateOn, ValidationResult, ValidationRule }
