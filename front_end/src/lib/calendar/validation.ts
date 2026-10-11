import type { CreateEventInput, CreateTaskInput, RecurrenceRule } from './types'
import { isDateOnly, minutesBetween, parseCalendarDate } from './time'

export type ValidationResult = { ok: true } | { ok: false; error: string }

const MIN_TIMED_MINUTES = 15

export function validateEventInput(
  input: CreateEventInput,
  opts?: { writable?: boolean; existingTagNames?: string[] },
): ValidationResult {
  if (!input.title.trim()) return { ok: false, error: 'Title is required' }
  if (!input.calendarId) return { ok: false, error: 'Calendar is required' }
  if (opts?.writable === false) return { ok: false, error: 'Calendar is read-only' }
  try {
    const start = parseCalendarDate(input.start)
    const end = parseCalendarDate(input.end)
    if (end <= start) return { ok: false, error: 'End must be after start' }
  } catch {
    return { ok: false, error: 'Invalid start/end' }
  }
  if (!input.allDay && minutesBetween(input.start, input.end) < MIN_TIMED_MINUTES) {
    return { ok: false, error: `Minimum duration is ${MIN_TIMED_MINUTES} minutes` }
  }
  if (input.allDay && (!isDateOnly(input.start) || !isDateOnly(input.end))) {
    return { ok: false, error: 'All-day events require date-only values' }
  }
  if (input.recurrence) {
    const rr = validateRecurrence(input.recurrence, input.start)
    if (!rr.ok) return rr
  }
  return { ok: true }
}

export function validateRecurrence(rule: RecurrenceRule, seriesStart: string): ValidationResult {
  if ((rule.interval ?? 1) < 1) return { ok: false, error: 'Interval must be ≥ 1' }
  if (rule.count != null && rule.count < 1) return { ok: false, error: 'Count must be ≥ 1' }
  if (rule.until) {
    try {
      if (parseCalendarDate(rule.until) < parseCalendarDate(seriesStart)) {
        return { ok: false, error: 'Recurrence until must be on/after start' }
      }
    } catch {
      return { ok: false, error: 'Invalid recurrence until' }
    }
  }
  return { ok: true }
}

export function validateTaskInput(input: CreateTaskInput): ValidationResult {
  if (!input.title.trim()) return { ok: false, error: 'Title is required' }
  if (input.dueAt) {
    try {
      parseCalendarDate(input.dueAt)
    } catch {
      return { ok: false, error: 'Invalid due date' }
    }
  }
  return { ok: true }
}

export function validateTagName(name: string, existing: readonly string[]): ValidationResult {
  const trimmed = name.trim()
  if (!trimmed) return { ok: false, error: 'Tag name is required' }
  if (existing.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, error: 'Tag name already exists' }
  }
  return { ok: true }
}

export const MIN_EVENT_DURATION_MINUTES = MIN_TIMED_MINUTES
