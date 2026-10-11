import { CALENDAR_IMPLEMENTED_ACTION_IDS } from '../editorCatalog/calendar/actions'

/**
 * Runtime handlers that Calendar.invokeAction must support.
 * Used by Theme acceptance and catalog↔handler parity checks.
 */
export const CALENDAR_RUNTIME_ACTION_HANDLERS = [
  'calendar.action.set-view',
  'calendar.action.set-anchor',
  'calendar.action.today',
  'calendar.action.prev',
  'calendar.action.next',
  'calendar.action.toggle-sidebar',
  'calendar.action.toggle-weekends',
  'calendar.action.set-week-start',
  'calendar.action.search',
  'calendar.action.focus-create',
  'calendar.action.toggle-calendar-visible',
  'calendar.action.set-active-calendars',
  'calendar.action.toggle-tag-filter',
  'calendar.action.create-event',
  'calendar.action.update-event',
  'calendar.action.delete-event',
  'calendar.action.duplicate-event',
  'calendar.action.move-event',
  'calendar.action.resize-event',
  'calendar.action.open-event',
  'calendar.action.select-event',
  'calendar.action.set-recurrence',
  'calendar.action.update-occurrence',
  'calendar.action.delete-occurrence',
  'calendar.action.create-task',
  'calendar.action.update-task',
  'calendar.action.complete-task',
  'calendar.action.delete-task',
  'calendar.action.open-task',
  'calendar.action.move-task-due',
  'calendar.action.open-settings',
  'calendar.action.open-create-menu',
  'calendar.action.open-reminders',
] as const

export function assertCalendarActionParity(): { ok: boolean; missingHandlers: string[]; extraHandlers: string[] } {
  const catalog = new Set(CALENDAR_IMPLEMENTED_ACTION_IDS)
  const handlers = new Set<string>(CALENDAR_RUNTIME_ACTION_HANDLERS)
  const missingHandlers = [...catalog].filter((id) => !handlers.has(id))
  const extraHandlers = [...handlers].filter((id) => !catalog.has(id))
  return {
    ok: missingHandlers.length === 0 && extraHandlers.length === 0,
    missingHandlers,
    extraHandlers,
  }
}
