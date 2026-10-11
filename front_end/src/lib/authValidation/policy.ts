/**
 * Auth signup policy — keep in lockstep with GoTrue / BE app_validate_*.
 * Password: min 8 + lower + upper + digit + symbol.
 * Username: ^[a-z0-9_]{3,30}$ (normalized to lowercase).
 */
export type AuthPasswordPolicy = {
  minLength: number
  maxLength: number
  requireLowercase: boolean
  requireUppercase: boolean
  requireDigit: boolean
  requireSymbol: boolean
}

export type AuthUsernamePolicy = {
  minLength: number
  maxLength: number
  /** Full-string pattern after normalize (trim + lower). */
  pattern: RegExp
  patternSource: string
}

export type AuthEmailPolicy = {
  maxLength: number
  pattern: RegExp
}

export type AuthOrgPolicy = {
  nameMinLength: number
  nameMaxLength: number
  slugMaxLength: number
  slugPattern: RegExp
}

export type AuthDisplayNamePolicy = {
  maxLength: number
}

export type AuthPhonePolicy = {
  /** Full-string E.164 after normalize (`+` + digits). Empty allowed when optional. */
  pattern: RegExp
  patternSource: string
}

export type AuthSignupPolicy = {
  password: AuthPasswordPolicy
  username: AuthUsernamePolicy
  email: AuthEmailPolicy
  org: AuthOrgPolicy
  displayName: AuthDisplayNamePolicy
  phone: AuthPhonePolicy
}

export const AUTH_SIGNUP_POLICY: AuthSignupPolicy = {
  password: {
    minLength: 8,
    maxLength: 128,
    requireLowercase: true,
    requireUppercase: true,
    requireDigit: true,
    requireSymbol: true,
  },
  username: {
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-z0-9_]{3,30}$/,
    patternSource: '^[a-z0-9_]{3,30}$',
  },
  email: {
    maxLength: 254,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  org: {
    nameMinLength: 1,
    nameMaxLength: 160,
    slugMaxLength: 80,
    slugPattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  },
  displayName: {
    maxLength: 120,
  },
  phone: {
    pattern: /^\+[1-9]\d{7,14}$/,
    patternSource: '^\\+[1-9]\\d{7,14}$',
  },
}

export const USERNAME_PATTERN = AUTH_SIGNUP_POLICY.username.pattern
export const PASSWORD_MIN_LENGTH = AUTH_SIGNUP_POLICY.password.minLength
export const PHONE_E164_PATTERN = AUTH_SIGNUP_POLICY.phone.pattern
