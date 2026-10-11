/**
 * Calendar workbench model — fixture-backed Google Calendar–style events + tasks.
 */

export type CalendarViewId = 'month' | 'week' | 'day' | 'agenda' | 'tasks'

export type WeekStartsOn = 0 | 1 | 6

export type CalendarDensity = 'comfortable' | 'compact'

export type RecurrenceFreq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

export type RecurrenceRule = {
  freq: RecurrenceFreq
  interval?: number
  count?: number
  until?: string
  byDay?: Array<'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'>
}

export type CalReminder = {
  id: string
  minutesBefore: number
  channel: 'popup' | 'email'
}

export type CalendarAccount = {
  id: string
  name: string
  color: string
  visible: boolean
  writable: boolean
  kind?: 'personal' | 'work' | 'holiday' | 'shared'
}

export type CalTag = {
  id: string
  name: string
  color: string
}

export type CalEventBase = {
  id: string
  calendarId: string
  title: string
  description?: string
  location?: string
  /** ISO instant when timed; YYYY-MM-DD when allDay */
  start: string
  /** ISO instant when timed; YYYY-MM-DD exclusive or inclusive end day when allDay */
  end: string
  allDay: boolean
  tagIds?: string[]
  recurrence?: RecurrenceRule | null
  reminders?: CalReminder[]
  attendees?: Array<{ id: string; displayName: string; email?: string }>
  url?: string
}

export type CalEvent = CalEventBase & {
  /** Present when this row is a series master */
  isRecurringMaster?: boolean
}

export type CalEventException = {
  id: string
  recurringEventId: string
  /** Original occurrence start (ISO or date-only matching series) */
  originalStart: string
  exceptionType: 'cancelled' | 'modified'
  /** Replacement fields when modified */
  patch?: Partial<Omit<CalEventBase, 'id' | 'recurrence'>>
}

/** Expanded occurrence used by views / layout (not persisted separately). */
export type CalOccurrence = {
  id: string
  eventId: string
  recurringEventId?: string
  originalStart?: string
  calendarId: string
  title: string
  description?: string
  location?: string
  start: string
  end: string
  allDay: boolean
  tagIds: string[]
  color: string
  isException?: boolean
  cancelled?: boolean
  reminders?: CalReminder[]
}

export type CalTask = {
  id: string
  title: string
  completed: boolean
  /** ISO instant or YYYY-MM-DD */
  dueAt?: string | null
  calendarId?: string
  listId?: string
  tagIds?: string[]
  notes?: string
  eventLinkId?: string
  createdAt: string
  updatedAt: string
}

export type CalTaskList = {
  id: string
  name: string
}

export type CalViewState = {
  view: CalendarViewId
  /** YYYY-MM-DD anchor for navigation */
  anchorDate: string
  weekStartsOn: WeekStartsOn
  density: CalendarDensity
  showWeekends: boolean
  showDeclined?: boolean
  searchQuery?: string
  activeTagIds?: string[]
}

export type CalendarStoreSnapshot = {
  title?: string
  timeZone?: string
  calendars: CalendarAccount[]
  tags: CalTag[]
  events: CalEvent[]
  exceptions: CalEventException[]
  tasks: CalTask[]
  taskLists: CalTaskList[]
  view: CalViewState
  selectedEventId: string | null
  selectedTaskId: string | null
  selectedOccurrenceKey: string | null
}

export type CalendarEditorPayload = {
  title?: string
  timeZone?: string
  calendars: CalendarAccount[]
  tags: CalTag[]
  events: CalEvent[]
  exceptions?: CalEventException[]
  tasks: CalTask[]
  taskLists?: CalTaskList[]
  view?: Partial<CalViewState>
  activeCalendarIds?: string[]
}

export type CreateEventInput = {
  calendarId: string
  title: string
  start: string
  end: string
  allDay?: boolean
  description?: string
  location?: string
  tagIds?: string[]
  recurrence?: RecurrenceRule | null
  reminders?: CalReminder[]
}

export type CreateTaskInput = {
  title: string
  dueAt?: string | null
  calendarId?: string
  listId?: string
  tagIds?: string[]
  notes?: string
}

export type DeleteOccurrenceScope = 'this' | 'following' | 'all'

export type TimedLayoutItem = {
  occurrence: CalOccurrence
  column: number
  columnCount: number
  topPct: number
  heightPct: number
}

export type MonthCellItem = {
  occurrence: CalOccurrence
  kind: 'event' | 'task'
}
