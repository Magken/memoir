/**
 * Password strength 0–100 from AUTH_SIGNUP_POLICY checks (length + character classes).
 * Used by signup strength BarLoader — not a substitute for validation.
 */
import { AUTH_SIGNUP_POLICY } from '../authValidation'
import { batteryChargeTone, type ProgressLoaderTone } from '../loaders/progressLoaders'

const HAS_UPPERCASE = /[A-Z]/
const HAS_LOWERCASE = /[a-z]/
const HAS_NUMBER = /[0-9]/
const HAS_SYMBOL = /[^A-Za-z0-9]/

export function passwordStrengthScore(password: string): number {
  if (!password) return 0
  const policy = AUTH_SIGNUP_POLICY.password
  const checks = [
    password.length >= policy.minLength,
    !policy.requireUppercase || HAS_UPPERCASE.test(password),
    !policy.requireLowercase || HAS_LOWERCASE.test(password),
    !policy.requireDigit || HAS_NUMBER.test(password),
    !policy.requireSymbol || HAS_SYMBOL.test(password),
  ]
  const passed = checks.filter(Boolean).length
  return Math.round((passed / checks.length) * 100)
}

export function passwordStrengthTone(score: number): ProgressLoaderTone {
  return batteryChargeTone(score)
}
