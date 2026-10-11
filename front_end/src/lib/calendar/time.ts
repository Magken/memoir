import {
  addDays,
  addMinutes,
  addMonths,
  addWeeks,
  addYears,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  differenceInMinutes,
} from 'date-fns'
import type { WeekStartsOn } from './types'

export const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

export function isDateOnly(value: string): boolean {
  return DATE_ONLY_RE.test(value)
}

export function toDateOnly(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function parseCalendarDate(value: string): Date {
  if (isDateOnly(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d, 0, 0, 0, 0)
  }
  const parsed = parseISO(value)
  if (!isValid(parsed)) throw new Error(`Invalid calendar date: ${value}`)
  return parsed
}

export function toIsoInstant(date: Date): string {
  return date.toISOString()
}

export function startOfViewDay(value: string | Date): Date {
  const d = typeof value === 'string' ? parseCalendarDate(value) : value
  return startOfDay(d)
}

export function endOfViewDay(value: string | Date): Date {
  const d = typeof value === 'string' ? parseCalendarDate(value) : value
  return endOfDay(d)
}

export function todayDateOnly(): string {
  return toDateOnly(new Date())
}

export function addDaysDateOnly(dateOnly: string, amount: number): string {
  return toDateOnly(addDays(parseCalendarDate(dateOnly), amount))
}

export function monthGridDays(anchorDate: string, weekStartsOn: WeekStartsOn): Date[] {
  const monthStart = startOfMonth(parseCalendarDate(anchorDate))
  const monthEnd = endOfMonth(monthStart)
  const gridStart = startOfWeek(monthStart, { weekStartsOn })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn })
  return eachDayOfInterval({ start: gridStart, end: gridEnd })
}

export function weekDays(anchorDate: string, weekStartsOn: WeekStartsOn, showWeekends: boolean): Date[] {
  const start = startOfWeek(parseCalendarDate(anchorDate), { weekStartsOn })
  const end = endOfWeek(parseCalendarDate(anchorDate), { weekStartsOn })
  const days = eachDayOfInterval({ start, end })
  if (showWeekends) return days
  return days.filter((d) => d.getDay() !== 0 && d.getDay() !== 6)
}

export function visibleRangeForView(
  view: 'month' | 'week' | 'day' | 'agenda' | 'tasks',
  anchorDate: string,
  weekStartsOn: WeekStartsOn,
): { start: Date; end: Date } {
  const anchor = parseCalendarDate(anchorDate)
  if (view === 'month') {
    const days = monthGridDays(anchorDate, weekStartsOn)
    return { start: startOfDay(days[0]!), end: endOfDay(days[days.length - 1]!) }
  }
  if (view === 'week') {
    return {
      start: startOfWeek(anchor, { weekStartsOn }),
      end: endOfWeek(anchor, { weekStartsOn }),
    }
  }
  if (view === 'day') {
    return { start: startOfDay(anchor), end: endOfDay(anchor) }
  }
  // agenda / tasks — look ahead ~30 days with a small past buffer
  return { start: addDays(startOfDay(anchor), -7), end: addDays(endOfDay(anchor), 30) }
}

export function shiftAnchor(
  anchorDate: string,
  view: 'month' | 'week' | 'day' | 'agenda' | 'tasks',
  direction: -1 | 1,
): string {
  const d = parseCalendarDate(anchorDate)
  if (view === 'month') return toDateOnly(addMonths(d, direction))
  if (view === 'week') return toDateOnly(addWeeks(d, direction))
  return toDateOnly(addDays(d, direction))
}

export function minutesBetween(start: string, end: string): number {
  return Math.max(0, differenceInMinutes(parseCalendarDate(end), parseCalendarDate(start)))
}

export function addMinutesIso(start: string, minutes: number): string {
  if (isDateOnly(start)) return addDaysDateOnly(start, Math.round(minutes / (60 * 24)))
  return toIsoInstant(addMinutes(parseCalendarDate(start), minutes))
}

export function sameCalendarDay(a: string, b: string): boolean {
  return isSameDay(parseCalendarDate(a), parseCalendarDate(b))
}

export function formatDayHeading(date: Date): string {
  return format(date, 'EEE MMM d')
}

export function formatTimeLabel(date: Date): string {
  return format(date, 'h:mm a')
}

export function formatMonthTitle(anchorDate: string): string {
  return format(parseCalendarDate(anchorDate), 'MMMM yyyy')
}

export function formatRangeTitle(
  view: 'month' | 'week' | 'day' | 'agenda' | 'tasks',
  anchorDate: string,
  weekStartsOn: WeekStartsOn,
): string {
  if (view === 'month' || view === 'agenda' || view === 'tasks') return formatMonthTitle(anchorDate)
  if (view === 'day') return format(parseCalendarDate(anchorDate), 'EEEE, MMM d, yyyy')
  const { start, end } = visibleRangeForView('week', anchorDate, weekStartsOn)
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
}

export function defaultTimedEnd(startIso: string, durationMinutes = 60): string {
  return toIsoInstant(addMinutes(parseCalendarDate(startIso), durationMinutes))
}

export function defaultTimedFromDateOnly(dateOnly: string, hour = 9, durationMinutes = 60): {
  start: string
  end: string
} {
  const start = new Date(parseCalendarDate(dateOnly))
  start.setHours(hour, 0, 0, 0)
  const end = addMinutes(start, durationMinutes)
  return { start: toIsoInstant(start), end: toIsoInstant(end) }
}

export function allDaySpan(startDateOnly: string, endDateOnlyInclusive: string): { start: string; end: string } {
  // Store exclusive end as next day for interval math consistency with Google-like all-day
  return { start: startDateOnly, end: addDaysDateOnly(endDateOnlyInclusive, 1) }
}

export function iterateDays(start: Date, end: Date): Date[] {
  if (end < start) return []
  return eachDayOfInterval({ start: startOfDay(start), end: startOfDay(end) })
}

export { addDays, addMonths, addWeeks, addYears, format, startOfDay, endOfDay }
