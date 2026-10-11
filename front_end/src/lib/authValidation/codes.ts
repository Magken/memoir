/**
 * Shared signup / auth validation error codes — FE ↔ BE parity.
 * Prefer these string ids in Theme, authApi, and app_signup_validate issue mapping.
 */
export const AUTH_VALIDATION_CODES = [
  'email_invalid',
  'email_required',
  'email_taken',
  'password_too_short',
  'password_complexity',
  'password_required',
  'username_invalid',
  'username_required',
  'username_taken',
  'org_name_required',
  'org_name_taken',
  'org_slug_invalid',
  'org_slug_taken',
  'display_name_invalid',
  'phone_invalid',
  'validation_failed',
] as const

export type AuthValidationCode = (typeof AUTH_VALIDATION_CODES)[number]

export type AuthValidationIssue = {
  field: string
  code: AuthValidationCode
  message?: string
  detail?: string
}

export class AuthValidationError extends Error {
  readonly code: AuthValidationCode
  readonly issues: AuthValidationIssue[]

  constructor(code: AuthValidationCode, message?: string, issues: AuthValidationIssue[] = []) {
    super(message ?? code)
    this.name = 'AuthValidationError'
    this.code = code
    this.issues = issues.length ? issues : [{ field: '_', code, message }]
  }
}

export function isAuthValidationCode(value: string): value is AuthValidationCode {
  return (AUTH_VALIDATION_CODES as readonly string[]).includes(value)
}
