import { addDays, addMonths, addWeeks, addYears, isBefore, isEqual } from 'date-fns'
import type {
  CalEvent,
  CalEventException,
  CalOccurrence,
  CalendarAccount,
  RecurrenceRule,
} from './types'
import { parseCalendarDate, toDateOnly, toIsoInstant } from './time'

const DOW: Record<NonNullable<RecurrenceRule['byDay']>[number], number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
}

function occurrenceKey(eventId: string, originalStart: string): string {
  return `${eventId}::${originalStart}`
}

function shiftSameOffset(baseStart: Date, baseEnd: Date, nextStart: Date): Date {
  const delta = baseEnd.getTime() - baseStart.getTime()
  return new Date(nextStart.getTime() + delta)
}

function formatOccurrenceInstant(date: Date, allDay: boolean): string {
  return allDay ? toDateOnly(date) : toIsoInstant(date)
}

function matchesByDay(date: Date, rule: RecurrenceRule): boolean {
  if (!rule.byDay?.length) return true
  const day = date.getDay()
  return rule.byDay.some((code) => DOW[code] === day)
}

function startOfWeekSunday(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  copy.setDate(copy.getDate() - copy.getDay())
  return copy
}

function expandWeeklyByDay(
  event: CalEvent,
  rule: RecurrenceRule,
  maxCount: number,
  until: Date | null,
  hardCap: number,
): Date[] {
  const start = parseCalendarDate(event.start)
  const interval = Math.max(1, rule.interval ?? 1)
  const out: Date[] = []
  let dayCursor = start
  let guard = 0
  while (out.length < maxCount && guard < hardCap) {
    guard += 1
    if (until && isBefore(until, dayCursor) && !isEqual(until, dayCursor)) break
    const weeksFromStart = Math.floor(
      (startOfWeekSunday(dayCursor).getTime() - startOfWeekSunday(start).getTime()) /
        (7 * 24 * 60 * 60 * 1000),
    )
    if (weeksFromStart % interval === 0 && matchesByDay(dayCursor, rule) && !isBefore(dayCursor, start)) {
      out.push(new Date(dayCursor))
    }
    dayCursor = addDays(dayCursor, 1)
  }
  return out
}

function seriesStarts(event: CalEvent): Date[] {
  if (!event.recurrence) return [parseCalendarDate(event.start)]
  const rule = event.recurrence
  const until = rule.until ? parseCalendarDate(rule.until) : null
  const maxCount = rule.count ?? 366
  const hardCap = 800

  if (rule.freq === 'WEEKLY' && rule.byDay?.length) {
    return expandWeeklyByDay(event, rule, maxCount, until, hardCap)
  }

  const start = parseCalendarDate(event.start)
  const out: Date[] = []
  let cursor = start
  let guard = 0
  const interval = Math.max(1, rule.interval ?? 1)
  while (out.length < maxCount && guard < hardCap) {
    guard += 1
    if (until && isBefore(until, cursor) && !isEqual(until, cursor)) break
    out.push(new Date(cursor))
    if (rule.freq === 'DAILY') cursor = addDays(cursor, interval)
    else if (rule.freq === 'WEEKLY') cursor = addWeeks(cursor, interval)
    else if (rule.freq === 'MONTHLY') cursor = addMonths(cursor, interval)
    else cursor = addYears(cursor, interval)
  }
  return out
}

function applyException(
  event: CalEvent,
  originalStart: string,
  exception: CalEventException | undefined,
  color: string,
): CalOccurrence | null {
  if (exception?.exceptionType === 'cancelled') return null
  const baseStart = parseCalendarDate(event.start)
  const baseEnd = parseCalendarDate(event.end)
  const occStart = parseCalendarDate(originalStart)
  const occEnd = shiftSameOffset(baseStart, baseEnd, occStart)
  let occurrence: CalOccurrence = {
    id: occurrenceKey(event.id, originalStart),
    eventId: event.id,
    recurringEventId: event.recurrence ? event.id : undefined,
    originalStart,
    calendarId: event.calendarId,
    title: event.title,
    description: event.description,
    location: event.location,
    start: formatOccurrenceInstant(occStart, event.allDay),
    end: formatOccurrenceInstant(occEnd, event.allDay),
    allDay: event.allDay,
    tagIds: event.tagIds ?? [],
    color,
    reminders: event.reminders,
  }
  if (exception?.exceptionType === 'modified' && exception.patch) {
    const patch = exception.patch
    occurrence = {
      ...occurrence,
      ...patch,
      id: occurrenceKey(event.id, originalStart),
      eventId: event.id,
      recurringEventId: event.id,
      originalStart,
      tagIds: patch.tagIds ?? occurrence.tagIds,
      color,
      isException: true,
    }
  }
  return occurrence
}

export function expandEvents(
  events: readonly CalEvent[],
  exceptions: readonly CalEventException[],
  calendars: readonly CalendarAccount[],
  rangeStart: Date,
  rangeEnd: Date,
): CalOccurrence[] {
  const colorByCal = new Map(calendars.map((c) => [c.id, c.color]))
  const visible = new Set(calendars.filter((c) => c.visible).map((c) => c.id))
  const bySeries = new Map<string, CalEventException[]>()
  for (const ex of exceptions) {
    const list = bySeries.get(ex.recurringEventId) ?? []
    list.push(ex)
    bySeries.set(ex.recurringEventId, list)
  }

  const out: CalOccurrence[] = []
  for (const event of events) {
    if (!visible.has(event.calendarId)) continue
    const color = colorByCal.get(event.calendarId) ?? 'var(--theme-accent)'
    const seriesExceptions = bySeries.get(event.id) ?? []

    if (!event.recurrence) {
      const start = parseCalendarDate(event.start)
      const end = parseCalendarDate(event.end)
      if (end < rangeStart || start > rangeEnd) continue
      out.push({
        id: event.id,
        eventId: event.id,
        calendarId: event.calendarId,
        title: event.title,
        description: event.description,
        location: event.location,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
        tagIds: event.tagIds ?? [],
        color,
        reminders: event.reminders,
      })
      continue
    }

    const starts = seriesStarts(event)
    for (const startDate of starts) {
      const originalStart = formatOccurrenceInstant(startDate, event.allDay)
      const baseEnd = shiftSameOffset(
        parseCalendarDate(event.start),
        parseCalendarDate(event.end),
        startDate,
      )
      if (baseEnd < rangeStart || startDate > rangeEnd) continue
      const ex = seriesExceptions.find((e) => e.originalStart === originalStart)
      const occ = applyException(event, originalStart, ex, color)
      if (occ) out.push(occ)
    }
  }

  return out.sort((a, b) => parseCalendarDate(a.start).getTime() - parseCalendarDate(b.start).getTime())
}

export function createId(prefix = 'cal'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}
