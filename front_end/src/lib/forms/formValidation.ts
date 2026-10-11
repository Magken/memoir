import { isoDateComparable, isValidIsoDate, parseIsoDate } from './dateTimePicker'
import { formatFileSize } from './fileUpload'
import { isValidPhoneE164 } from './phoneFormat'

export type ValidationIssue = {
  id: string
  message: string
}

export type ValidationResult = {
  valid: boolean
  issues: ValidationIssue[]
  /** First issue message — convenient for [Field](../components/Field.tsx) `error` */
  message?: string
}

export const DEFAULT_VALIDATION_SUCCESS_MESSAGE = 'Looks good'

export type ValidateOn = 'change' | 'blur' | 'submit'

export type ValidationRule =
  | {
      type: 'required'
      message?: string
      id?: string
    }
  | {
      type: 'minLength'
      min: number
      message?: string
      id?: string
    }
  | {
      type: 'maxLength'
      max: number
      message?: string
      id?: string
    }
  | {
      type: 'pattern'
      pattern: RegExp
      message: string
      id?: string
    }
  | {
      type: 'email'
      message?: string
      id?: string
    }
  | {
      type: 'custom'
      id?: string
      message: string
      validate: (value: string) => boolean
    }

export type PasswordPolicy = {
  minLength: number
  maxLength?: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumber: boolean
  requireSymbol: boolean
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: true,
}

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const HAS_UPPERCASE = /[A-Z]/
const HAS_LOWERCASE = /[a-z]/
const HAS_NUMBER = /\d/
const HAS_SYMBOL = /[^A-Za-z0-9]/

export function isEmptyValue(value: string): boolean {
  return value.trim().length === 0
}

/** Whitespace-separated word count (empty → 0). */
export function wordCount(value: string): number {
  const trimmed = value.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export function validationIssueMessages(result: ValidationResult): string[] {
  return result.issues.map((issue) => issue.message)
}

export function firstValidationMessage(result: ValidationResult): string | undefined {
  return result.message ?? result.issues[0]?.message
}

export function summarizeValidationIssues(issues: readonly ValidationIssue[]): string {
  if (issues.length === 0) {
    return ''
  }
  if (issues.length === 1) {
    return issues[0].message
  }
  return issues.map((issue) => issue.message).join(' · ')
}

export const validators = {
  required(message = 'This field is required', id = 'required'): ValidationRule {
    return { type: 'required', message, id }
  },

  minLength(min: number, message?: string, id = 'minLength'): ValidationRule {
    return {
      type: 'minLength',
      min,
      message: message ?? `Use at least ${min} characters`,
      id,
    }
  },

  maxLength(max: number, message?: string, id = 'maxLength'): ValidationRule {
    return {
      type: 'maxLength',
      max,
      message: message ?? `Use at most ${max} characters`,
      id,
    }
  },

  pattern(pattern: RegExp, message: string, id = 'pattern'): ValidationRule {
    return { type: 'pattern', pattern, message, id }
  },

  email(message = 'Enter a valid email address', id = 'email'): ValidationRule {
    return { type: 'email', message, id }
  },

  /**
   * Optional international phone — E.164 after normalize (`+[1-9]` + 7–14 more digits).
   * Country code is typed in the field (`+1`, `+36`, `+250`, …); empty is allowed.
   */
  phone(message = 'Enter a valid phone number with country code (e.g. +1 555 123 4567)', id = 'phone'): ValidationRule {
    return {
      type: 'custom',
      id,
      message,
      validate: (value) => isValidPhoneE164(value),
    }
  },

  maxWords(max: number, message?: string, id = 'maxWords'): ValidationRule {
    return {
      type: 'custom',
      id,
      message: message ?? `Use at most ${max} words`,
      validate: (value) => wordCount(value) <= max,
    }
  },

  custom(
    validate: (value: string) => boolean,
    message: string,
    id = 'custom',
  ): ValidationRule {
    return { type: 'custom', validate, message, id }
  },

  minItems(
    min: number,
    message?: string,
    id = 'minItems',
  ): ValidationRule {
    return {
      type: 'custom',
      id,
      message: message ?? `Select at least ${min} item${min === 1 ? '' : 's'}`,
      validate: (value) => {
        if (!value) return min === 0
        return value.split('\0').filter(Boolean).length >= min
      },
    }
  },

  maxItems(
    max: number,
    message?: string,
    id = 'maxItems',
  ): ValidationRule {
    return {
      type: 'custom',
      id,
      message: message ?? `Select at most ${max} item${max === 1 ? '' : 's'}`,
      validate: (value) => {
        if (!value) return true
        return value.split('\0').filter(Boolean).length <= max
      },
    }
  },

  maxFileSize(
    maxBytes: number,
    message?: string,
    id = 'maxFileSize',
  ): ValidationRule {
    return {
      type: 'custom',
      id,
      message: message ?? `Each file must be ${formatFileSize(maxBytes)} or smaller`,
      validate: (value) => {
        if (!value) return true
        return value.split('\0').filter(Boolean).every((entry) => {
          const lastColon = entry.lastIndexOf(':')
          if (lastColon <= 0) return true
          const size = Number(entry.slice(lastColon + 1))
          return Number.isFinite(size) && size <= maxBytes
        })
      },
    }
  },

  maxTotalSize(
    maxBytes: number,
    message?: string,
    id = 'maxTotalSize',
  ): ValidationRule {
    return {
      type: 'custom',
      id,
      message: message ?? `Total upload size must be ${formatFileSize(maxBytes)} or less`,
      validate: (value) => {
        if (!value) return true
        const total = value
          .split('\0')
          .filter(Boolean)
          .reduce((sum, entry) => {
            const lastColon = entry.lastIndexOf(':')
            if (lastColon <= 0) return sum
            const size = Number(entry.slice(lastColon + 1))
            return sum + (Number.isFinite(size) ? size : 0)
          }, 0)
        return total <= maxBytes
      },
    }
  },

  /** Whole number ≥ 1 — empty passes (pair with `required` when needed). */
  positiveInteger(
    message = 'Enter a positive whole number',
    id = 'positiveInteger',
  ): ValidationRule {
    return {
      type: 'custom',
      id,
      message,
      validate: (value) => isEmptyValue(value) || /^[1-9]\d*$/.test(value.trim()),
    }
  },

  /** Whole number ≥ 0 — empty passes (pair with `required` when needed). */
  nonNegativeInteger(
    message = 'Enter a whole number (0 or more)',
    id = 'nonNegativeInteger',
  ): ValidationRule {
    return {
      type: 'custom',
      id,
      message,
      validate: (value) => isEmptyValue(value) || /^(0|[1-9]\d*)$/.test(value.trim()),
    }
  },

  date(message = 'Enter a valid date (YYYY-MM-DD)', id = 'date'): ValidationRule {
    return {
      type: 'custom',
      id,
      message,
      validate: (value) => isEmptyValue(value) || isValidIsoDate(value.trim()),
    }
  },

  minDate(min: string, message?: string, id = 'minDate'): ValidationRule {
    const minParsed = parseIsoDate(min)
    return {
      type: 'custom',
      id,
      message: message ?? `Date must be on or after ${min}`,
      validate: (value) => {
        if (isEmptyValue(value)) return true
        const parsed = parseIsoDate(value.trim())
        if (!parsed || !minParsed) return false
        return isoDateComparable(parsed) >= isoDateComparable(minParsed)
      },
    }
  },

  maxDate(max: string, message?: string, id = 'maxDate'): ValidationRule {
    const maxParsed = parseIsoDate(max)
    return {
      type: 'custom',
      id,
      message: message ?? `Date must be on or before ${max}`,
      validate: (value) => {
        if (isEmptyValue(value)) return true
        const parsed = parseIsoDate(value.trim())
        if (!parsed || !maxParsed) return false
        return isoDateComparable(parsed) <= isoDateComparable(maxParsed)
      },
    }
  },

  dateRange(min: string, max: string, message?: string, id = 'dateRange'): ValidationRule {
    const minParsed = parseIsoDate(min)
    const maxParsed = parseIsoDate(max)
    return {
      type: 'custom',
      id,
      message: message ?? `Date must be between ${min} and ${max}`,
      validate: (value) => {
        if (isEmptyValue(value)) return true
        const parsed = parseIsoDate(value.trim())
        if (!parsed || !minParsed || !maxParsed) return false
        const left = isoDateComparable(parsed)
        return left >= isoDateComparable(minParsed) && left <= isoDateComparable(maxParsed)
      },
    }
  },
} as const

export function passwordPolicyRules(policy: Partial<PasswordPolicy> = {}): ValidationRule[] {
  const resolved: PasswordPolicy = { ...DEFAULT_PASSWORD_POLICY, ...policy }
  const rules: ValidationRule[] = [
    validators.required('Password is required', 'password-required'),
    validators.minLength(
      resolved.minLength,
      `Password must be at least ${resolved.minLength} characters`,
      'password-min-length',
    ),
  ]

  if (resolved.maxLength !== undefined) {
    rules.push(
      validators.maxLength(
        resolved.maxLength,
        `Password must be at most ${resolved.maxLength} characters`,
        'password-max-length',
      ),
    )
  }

  if (resolved.requireUppercase) {
    rules.push(
      validators.pattern(
        HAS_UPPERCASE,
        'Include at least one uppercase letter',
        'password-uppercase',
      ),
    )
  }

  if (resolved.requireLowercase) {
    rules.push(
      validators.pattern(
        HAS_LOWERCASE,
        'Include at least one lowercase letter',
        'password-lowercase',
      ),
    )
  }

  if (resolved.requireNumber) {
    rules.push(
      validators.pattern(HAS_NUMBER, 'Include at least one number', 'password-number'),
    )
  }

  if (resolved.requireSymbol) {
    rules.push(
      validators.pattern(
        HAS_SYMBOL,
        'Include at least one symbol',
        'password-symbol',
      ),
    )
  }

  return rules
}

export function validateRule(value: string, rule: ValidationRule): ValidationIssue | null {
  switch (rule.type) {
    case 'required':
      if (isEmptyValue(value)) {
        return {
          id: rule.id ?? 'required',
          message: rule.message ?? 'This field is required',
        }
      }
      return null

    case 'minLength':
      if (value.length < rule.min) {
        return {
          id: rule.id ?? 'minLength',
          message: rule.message ?? `Use at least ${rule.min} characters`,
        }
      }
      return null

    case 'maxLength':
      if (value.length > rule.max) {
        return {
          id: rule.id ?? 'maxLength',
          message: rule.message ?? `Use at most ${rule.max} characters`,
        }
      }
      return null

    case 'pattern':
      if (!rule.pattern.test(value)) {
        return { id: rule.id ?? 'pattern', message: rule.message }
      }
      return null

    case 'email':
      if (isEmptyValue(value)) {
        return null
      }
      if (!EMAIL_PATTERN.test(value)) {
        return {
          id: rule.id ?? 'email',
          message: rule.message ?? 'Enter a valid email address',
        }
      }
      return null

    case 'custom':
      if (rule.validate(value)) {
        return null
      }
      return { id: rule.id ?? 'custom', message: rule.message }

    default:
      return null
  }
}

export function validateValue(
  value: string,
  rules: readonly ValidationRule[],
): ValidationResult {
  if (rules.length === 0) {
    return { valid: true, issues: [] }
  }

  const hasRequired = rules.some((rule) => rule.type === 'required')
  if (hasRequired && isEmptyValue(value)) {
    const requiredRule = rules.find((rule) => rule.type === 'required')
    if (requiredRule) {
      const issue = validateRule(value, requiredRule)
      if (issue) {
        return {
          valid: false,
          issues: [issue],
          message: issue.message,
        }
      }
    }
    return { valid: true, issues: [] }
  }

  if (!hasRequired && isEmptyValue(value)) {
    return { valid: true, issues: [] }
  }

  const issues: ValidationIssue[] = []

  for (const rule of rules) {
    const issue = validateRule(value, rule)
    if (issue) {
      issues.push(issue)
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    message: issues[0]?.message,
  }
}

/** Common presets — compose with spread or pass to field `rules` */
export const validationPresets = {
  username: [
    validators.required(),
    validators.minLength(3, 'Username must be at least 3 characters'),
    validators.maxLength(24, 'Username must be at most 24 characters'),
    validators.pattern(
      /^[a-zA-Z0-9._-]+$/,
      'Use letters, numbers, dots, underscores, or hyphens only',
      'username-format',
    ),
  ] satisfies ValidationRule[],

  email: [validators.required(), validators.email()] satisfies ValidationRule[],

  phone: [
    validators.required('Phone number is required'),
    validators.phone(),
  ] satisfies ValidationRule[],

  password: passwordPolicyRules(),
} as const
