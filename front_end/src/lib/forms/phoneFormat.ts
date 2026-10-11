/**
 * E.164 phone normalize + soft display spacing.
 * Dial catalog is used only for longest-prefix spacing — not as a country Select.
 */

import { COUNTRY_DIAL_CODES } from './countryDialCodes'

/** Stored / validated form: `+` + 8–15 digits, first digit 1–9. */
export const PHONE_E164_PATTERN = /^\+[1-9]\d{7,14}$/

const DIAL_PREFIXES = [...new Set(COUNTRY_DIAL_CODES.map((entry) => entry.dial))].sort(
  (a, b) => b.length - a.length,
)

function groupDigits(digits: string, size = 3): string {
  if (!digits) return ''
  const parts: string[] = []
  for (let i = 0; i < digits.length; i += size) {
    parts.push(digits.slice(i, i + size))
  }
  return parts.join(' ')
}

/**
 * Strip to `+` + digits. Empty / whitespace-only → `''`.
 * Digits typed without `+` get a leading `+`.
 */
export function normalizePhoneE164(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return trimmed.startsWith('+') ? '+' : ''
  return `+${digits}`
}

function matchDialPrefix(digits: string): { dial: string; rest: string } | null {
  for (const dial of DIAL_PREFIXES) {
    if (digits.startsWith(dial) && digits.length > dial.length) {
      return { dial, rest: digits.slice(dial.length) }
    }
    if (digits === dial) {
      return { dial, rest: '' }
    }
  }
  return null
}

/**
 * Soft mask for typing: keep leading `+`, insert spaces after country code
 * (longest known dial match) then groups of 3. Incomplete input stays editable.
 */
export function formatPhoneDisplay(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const wantsPlus = trimmed.startsWith('+') || /\d/.test(trimmed)
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return wantsPlus ? '+' : ''

  const matched = matchDialPrefix(digits)
  if (matched) {
    const rest = groupDigits(matched.rest)
    return rest ? `+${matched.dial} ${rest}` : `+${matched.dial}`
  }

  // Unknown country: NANP uses 1 digit; otherwise prefer 2–3 while typing.
  const ccLen =
    digits[0] === '1'
      ? 1
      : digits.length <= 3
        ? digits.length
        : Math.min(3, Math.max(2, digits.length >= 11 ? 3 : 2))
  const dial = digits.slice(0, ccLen)
  const rest = groupDigits(digits.slice(ccLen))
  return rest ? `+${dial} ${rest}` : `+${dial}`
}

export function isValidPhoneE164(raw: string): boolean {
  const normalized = normalizePhoneE164(raw)
  if (!normalized) return true
  return PHONE_E164_PATTERN.test(normalized)
}
