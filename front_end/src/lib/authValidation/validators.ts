import {
  AuthValidationError,
  type AuthValidationCode,
  type AuthValidationIssue,
} from './codes'
import { AUTH_SIGNUP_POLICY } from './policy'
import { normalizePhoneE164 } from '../forms/phoneFormat'

export type SignupKind = 'personal' | 'organisation'

export type LocalSignupInput = {
  email: string
  password: string
  /** Required for personal; ignored for organisation (derived from orgName). */
  username?: string
  displayName?: string
  signupKind?: SignupKind
  orgName?: string
  orgSlug?: string
  /** Optional international phone (display or E.164). */
  phone?: string
}

export type LocalValidationResult = {
  ok: boolean
  issues: AuthValidationIssue[]
  normalized: {
    email: string
    username: string
    displayName?: string
    orgName?: string
    orgSlug?: string
    phone?: string
  }
}

const HAS_LOWER = /[a-z]/
const HAS_UPPER = /[A-Z]/
const HAS_DIGIT = /\d/
const HAS_SYMBOL = /[^A-Za-z0-9]/

function issue(field: string, code: AuthValidationCode, message?: string): AuthValidationIssue {
  return { field, code, message: message ?? code }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

export function normalizeOrgSlug(slug: string): string {
  return slug.trim().toLowerCase()
}

/**
 * Organisation signup — profile username is derived from org name
 * (`a-z0-9_`, 3–30). No separate username field in the agency form.
 */
export function usernameFromOrgName(orgName: string): string {
  const raw = orgName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
  return raw.slice(0, AUTH_SIGNUP_POLICY.username.maxLength)
}

export function validateEmail(email: string): AuthValidationIssue | null {
  const value = normalizeEmail(email)
  if (!value) return issue('email', 'email_required', 'Email is required')
  if (value.length > AUTH_SIGNUP_POLICY.email.maxLength) {
    return issue('email', 'email_invalid', 'Email is too long')
  }
  if (!AUTH_SIGNUP_POLICY.email.pattern.test(value)) {
    return issue('email', 'email_invalid', 'Enter a valid email address')
  }
  return null
}

export function validatePassword(password: string): AuthValidationIssue | null {
  const policy = AUTH_SIGNUP_POLICY.password
  if (!password) return issue('password', 'password_required', 'Password is required')
  if (password.length < policy.minLength) {
    return issue(
      'password',
      'password_too_short',
      `Password must be at least ${policy.minLength} characters`,
    )
  }
  if (password.length > policy.maxLength) {
    return issue('password', 'password_complexity', 'Password is too long')
  }
  const missing: string[] = []
  if (policy.requireLowercase && !HAS_LOWER.test(password)) missing.push('lowercase')
  if (policy.requireUppercase && !HAS_UPPER.test(password)) missing.push('uppercase')
  if (policy.requireDigit && !HAS_DIGIT.test(password)) missing.push('digit')
  if (policy.requireSymbol && !HAS_SYMBOL.test(password)) missing.push('symbol')
  if (missing.length) {
    return issue(
      'password',
      'password_complexity',
      `Password must include ${missing.join(', ')}`,
    )
  }
  return null
}

export function validateUsername(username: string, required = true): AuthValidationIssue | null {
  const value = normalizeUsername(username)
  if (!value) {
    return required
      ? issue('username', 'username_required', 'Username is required')
      : null
  }
  if (!AUTH_SIGNUP_POLICY.username.pattern.test(value)) {
    return issue(
      'username',
      'username_invalid',
      'Username must be 3–30 chars: a–z, 0–9, underscore',
    )
  }
  return null
}

export function validateDisplayName(displayName: string | undefined): AuthValidationIssue | null {
  if (displayName == null || displayName.trim() === '') return null
  if (displayName.trim().length > AUTH_SIGNUP_POLICY.displayName.maxLength) {
    return issue('display_name', 'display_name_invalid', 'Display name is too long')
  }
  return null
}

export function validateOrgName(orgName: string | undefined, required: boolean): AuthValidationIssue | null {
  const value = (orgName ?? '').trim()
  if (!value) {
    return required ? issue('org_name', 'org_name_required', 'Organisation name is required') : null
  }
  if (
    value.length < AUTH_SIGNUP_POLICY.org.nameMinLength ||
    value.length > AUTH_SIGNUP_POLICY.org.nameMaxLength
  ) {
    return issue('org_name', 'org_name_required', 'Organisation name length is invalid')
  }
  return null
}

export function validateOrgSlug(orgSlug: string | undefined): AuthValidationIssue | null {
  if (orgSlug == null || orgSlug.trim() === '') return null
  const value = normalizeOrgSlug(orgSlug)
  if (
    value.length > AUTH_SIGNUP_POLICY.org.slugMaxLength ||
    !AUTH_SIGNUP_POLICY.org.slugPattern.test(value)
  ) {
    return issue('org_slug', 'org_slug_invalid', 'Org slug must be lowercase kebab-case')
  }
  return null
}

/** Optional phone — empty ok; otherwise E.164 `+[1-9]` + 7–14 more digits. */
export function validatePhone(phone: string | undefined): AuthValidationIssue | null {
  if (phone == null || phone.trim() === '') return null
  const value = normalizePhoneE164(phone)
  if (!AUTH_SIGNUP_POLICY.phone.pattern.test(value)) {
    return issue(
      'phone',
      'phone_invalid',
      'Enter a valid phone with country code (e.g. +1 555 123 4567)',
    )
  }
  return null
}

/** Local-only signup validation (instant). Does not hit the network. */
export function validateSignupLocal(input: LocalSignupInput): LocalValidationResult {
  const signupKind = input.signupKind ?? 'personal'
  const email = normalizeEmail(input.email)
  const displayName = input.displayName?.trim() || undefined
  const orgName = input.orgName?.trim() || undefined
  const orgSlug = input.orgSlug ? normalizeOrgSlug(input.orgSlug) : undefined
  const phoneRaw = input.phone?.trim() || undefined
  const phone = phoneRaw ? normalizePhoneE164(phoneRaw) || undefined : undefined

  const issues: AuthValidationIssue[] = []
  const push = (i: AuthValidationIssue | null) => {
    if (i) issues.push(i)
  }

  push(validateEmail(email))
  push(validatePassword(input.password))
  push(validateDisplayName(displayName))
  push(validateOrgName(orgName, signupKind === 'organisation'))
  push(validateOrgSlug(orgSlug))
  push(validatePhone(phoneRaw))

  let username = normalizeUsername(input.username ?? '')
  if (signupKind === 'organisation') {
    username = usernameFromOrgName(orgName ?? '')
    const handleIssue = validateUsername(username, true)
    if (handleIssue) {
      push(
        issue(
          'org_name',
          'org_name_required',
          'Organisation name needs letters or numbers (used as your public handle)',
        ),
      )
    }
  } else {
    push(validateUsername(username, true))
  }

  return {
    ok: issues.length === 0,
    issues,
    normalized: { email, username, displayName, orgName, orgSlug, phone },
  }
}

export function formatAuthIssues(issues: AuthValidationIssue[]): string {
  return issues
    .map((i) => i.message ?? ISSUE_DEFAULT_MESSAGE[i.code] ?? i.code)
    .filter(Boolean)
    .join('\n')
}

export function assertSignupLocal(input: LocalSignupInput): LocalValidationResult['normalized'] {
  const result = validateSignupLocal(input)
  if (!result.ok) {
    throw new AuthValidationError(
      result.issues[0]?.code ?? 'validation_failed',
      formatAuthIssues(result.issues),
      result.issues,
    )
  }
  return result.normalized
}

const ISSUE_DEFAULT_MESSAGE: Partial<Record<AuthValidationCode, string>> = {
  email_taken: 'An account with this email already exists',
  email_required: 'Email is required',
  email_invalid: 'Enter a valid email address',
  username_taken: 'This username is already taken',
  username_required: 'Username is required',
  username_invalid: 'Username must be 3–30 chars: a–z, 0–9, underscore',
  org_name_taken: 'An organisation with this name already exists',
  org_name_required: 'Organisation name is required',
  phone_invalid: 'Enter a valid phone with country code (e.g. +1 555 123 4567)',
  validation_failed: 'Check the highlighted fields',
}

/** Remap username uniqueness to org-name copy for organisation signup (handle = org name). */
export function remapOrgSignupIssues(
  issues: AuthValidationIssue[],
  signupKind: SignupKind,
): AuthValidationIssue[] {
  if (signupKind !== 'organisation') return issues
  return issues.map((i) => {
    if (i.code !== 'username_taken' && i.field !== 'username') return i
    if (i.code === 'username_taken' || i.field === 'username') {
      return {
        ...i,
        field: 'org_name',
        code: 'org_name_taken',
        message: ISSUE_DEFAULT_MESSAGE.org_name_taken,
      }
    }
    return i
  })
}

/** Map BE app_signup_validate issue rows → shared codes. */
export function mapSignupValidateIssues(
  raw: unknown,
): AuthValidationIssue[] {
  if (!Array.isArray(raw)) return []
  const out: AuthValidationIssue[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const field = String((row as { field?: unknown }).field ?? '_')
    const beCode = String((row as { code?: unknown }).code ?? '')
    const detail = (row as { detail?: unknown }).detail
    const detailText = detail == null ? undefined : String(detail)
    const code = mapBeFieldCode(field, beCode, detailText)
    out.push({
      field,
      code,
      message: detailText || ISSUE_DEFAULT_MESSAGE[code],
      detail: detailText,
    })
  }
  return out
}

function mapBeFieldCode(field: string, beCode: string, detail?: string): AuthValidationCode {
  if (field === 'email') {
    if (beCode === 'required') return 'email_required'
    if (beCode === 'taken') return 'email_taken'
    return 'email_invalid'
  }
  if (field === 'password') {
    if (beCode === 'required') return 'password_required'
    if (detail && /at least|too short|characters/i.test(detail)) return 'password_too_short'
    return 'password_complexity'
  }
  if (field === 'username') {
    if (beCode === 'taken') return 'username_taken'
    if (beCode === 'required') return 'username_required'
    return 'username_invalid'
  }
  if (field === 'org_name') {
    if (beCode === 'taken') return 'org_name_taken'
    return 'org_name_required'
  }
  if (field === 'org_slug') {
    if (beCode === 'taken') return 'org_slug_taken'
    return 'org_slug_invalid'
  }
  if (field === 'phone') return 'phone_invalid'
  return 'validation_failed'
}

/** Map GoTrue Auth.signUp failures (422 / opaque 500) to shared validation errors. */
export function mapAuthSignupError(error: {
  message?: string
  code?: string
  status?: number
}): AuthValidationError | null {
  const code = error.code ?? ''
  const message = error.message ?? ''
  if (code === 'user_already_exists' || /already registered|already been registered/i.test(message)) {
    return new AuthValidationError(
      'email_taken',
      ISSUE_DEFAULT_MESSAGE.email_taken,
      [{ field: 'email', code: 'email_taken', message: ISSUE_DEFAULT_MESSAGE.email_taken }],
    )
  }
  if (/username already taken/i.test(message)) {
    return new AuthValidationError(
      'username_taken',
      ISSUE_DEFAULT_MESSAGE.username_taken,
      [{ field: 'username', code: 'username_taken', message: ISSUE_DEFAULT_MESSAGE.username_taken }],
    )
  }
  if (/organisation name already taken|org_name already taken/i.test(message)) {
    return new AuthValidationError(
      'org_name_taken',
      ISSUE_DEFAULT_MESSAGE.org_name_taken,
      [{ field: 'org_name', code: 'org_name_taken', message: ISSUE_DEFAULT_MESSAGE.org_name_taken }],
    )
  }
  if (/Database error saving new user/i.test(message)) {
    return new AuthValidationError(
      'validation_failed',
      'Could not create account — this username or organisation name may already be in use',
      [{ field: 'username', code: 'username_taken', message: ISSUE_DEFAULT_MESSAGE.username_taken }],
    )
  }
  return null
}

/** Map GoTrue sign-in / password / reset failures to shared validation errors. */
export function mapAuthClientError(error: {
  message?: string
  code?: string
  status?: number
}): AuthValidationError | null {
  const signupMapped = mapAuthSignupError(error)
  if (signupMapped) return signupMapped

  const code = error.code ?? ''
  const message = error.message ?? ''

  if (
    code === 'invalid_credentials' ||
    /invalid login credentials|invalid_credentials/i.test(message)
  ) {
    return new AuthValidationError(
      'validation_failed',
      'Email or password is incorrect',
      [{ field: '_', code: 'validation_failed', message: 'Email or password is incorrect' }],
    )
  }
  if (/email not confirmed/i.test(message)) {
    return new AuthValidationError(
      'validation_failed',
      'Confirm your email before signing in',
    )
  }
  if (/user not found/i.test(message)) {
    return new AuthValidationError(
      'validation_failed',
      'Email or password is incorrect',
    )
  }
  if (/same password|should be different/i.test(message)) {
    return new AuthValidationError(
      'password_complexity',
      'Choose a password you have not used before',
    )
  }
  if (/rate limit|too many requests/i.test(message)) {
    return new AuthValidationError(
      'validation_failed',
      'Too many attempts. Wait a moment and try again',
    )
  }
  return null
}
