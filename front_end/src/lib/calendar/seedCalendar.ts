import type { CalendarStoreSnapshot } from './types'
import { todayDateOnly, addDaysDateOnly, defaultTimedFromDateOnly, toIsoInstant, parseCalendarDate } from './time'

function atHour(dateOnly: string, hour: number, minute = 0): string {
  const d = parseCalendarDate(dateOnly)
  d.setHours(hour, minute, 0, 0)
  return toIsoInstant(d)
}

export function createCalendarSeed(): CalendarStoreSnapshot {
  const today = todayDateOnly()
  const tomorrow = addDaysDateOnly(today, 1)
  const yesterday = addDaysDateOnly(today, -1)
  const nextWeek = addDaysDateOnly(today, 7)

  return {
    title: 'Team calendar',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    calendars: [
      { id: 'cal_personal', name: 'Personal', color: '#4285f4', visible: true, writable: true, kind: 'personal' },
      { id: 'cal_work', name: 'Work', color: '#0b8043', visible: true, writable: true, kind: 'work' },
      { id: 'cal_holidays', name: 'Holidays', color: '#d50000', visible: true, writable: false, kind: 'holiday' },
    ],
    tags: [
      { id: 'tag_focus', name: 'Focus', color: '#a142f4' },
      { id: 'tag_meet', name: 'Meeting', color: '#f4511e' },
      { id: 'tag_travel', name: 'Travel', color: '#33b679' },
    ],
    taskLists: [
      { id: 'list_default', name: 'My tasks' },
      { id: 'list_work', name: 'Work' },
    ],
    events: [
      {
        id: 'evt_standup',
        calendarId: 'cal_work',
        title: 'Standup',
        start: atHour(today, 9, 30),
        end: atHour(today, 10, 0),
        allDay: false,
        tagIds: ['tag_meet'],
        recurrence: { freq: 'WEEKLY', interval: 1, byDay: ['MO', 'TU', 'WE', 'TH', 'FR'] },
        isRecurringMaster: true,
        reminders: [{ id: 'rem1', minutesBefore: 5, channel: 'popup' }],
        description: 'Daily sync',
      },
      {
        id: 'evt_overlap_a',
        calendarId: 'cal_work',
        title: 'Design review',
        start: atHour(today, 11, 0),
        end: atHour(today, 12, 30),
        allDay: false,
        tagIds: ['tag_meet'],
        location: 'Room B',
      },
      {
        id: 'evt_overlap_b',
        calendarId: 'cal_personal',
        title: 'Doctor',
        start: atHour(today, 11, 30),
        end: atHour(today, 12, 0),
        allDay: false,
        tagIds: ['tag_focus'],
      },
      {
        id: 'evt_focus',
        calendarId: 'cal_personal',
        title: 'Deep work',
        start: atHour(today, 14, 0),
        end: atHour(today, 16, 0),
        allDay: false,
        tagIds: ['tag_focus'],
      },
      {
        id: 'evt_allday',
        calendarId: 'cal_personal',
        title: 'Company offsite',
        start: tomorrow,
        end: addDaysDateOnly(tomorrow, 2),
        allDay: true,
        tagIds: ['tag_travel'],
        location: 'HQ',
      },
      {
        id: 'evt_holiday',
        calendarId: 'cal_holidays',
        title: 'Local holiday',
        start: nextWeek,
        end: addDaysDateOnly(nextWeek, 1),
        allDay: true,
      },
      {
        id: 'evt_midnight',
        calendarId: 'cal_work',
        title: 'Release window',
        start: atHour(yesterday, 22, 0),
        end: atHour(today, 2, 0),
        allDay: false,
        description: 'Cross-midnight timed event',
      },
      {
        id: 'evt_monthly',
        calendarId: 'cal_work',
        title: 'Monthly planning',
        start: atHour(today, 15, 0),
        end: atHour(today, 16, 0),
        allDay: false,
        recurrence: { freq: 'MONTHLY', interval: 1, count: 12 },
        isRecurringMaster: true,
      },
    ],
    exceptions: [
      {
        id: 'ex_standup_skip',
        recurringEventId: 'evt_standup',
        originalStart: atHour(addDaysDateOnly(today, 1), 9, 30),
        exceptionType: 'cancelled',
      },
      {
        id: 'ex_standup_move',
        recurringEventId: 'evt_standup',
        originalStart: atHour(addDaysDateOnly(today, 2), 9, 30),
        exceptionType: 'modified',
        patch: {
          title: 'Standup (moved)',
          start: atHour(addDaysDateOnly(today, 2), 10, 0),
          end: atHour(addDaysDateOnly(today, 2), 10, 30),
        },
      },
    ],
    tasks: [
      {
        id: 'task_overdue',
        title: 'File expense report',
        completed: false,
        dueAt: yesterday,
        listId: 'list_work',
        calendarId: 'cal_work',
        tagIds: ['tag_focus'],
        createdAt: atHour(yesterday, 8),
        updatedAt: atHour(yesterday, 8),
      },
      {
        id: 'task_today',
        title: 'Ship calendar demo notes',
        completed: false,
        dueAt: today,
        listId: 'list_default',
        calendarId: 'cal_personal',
        createdAt: atHour(today, 8),
        updatedAt: atHour(today, 8),
      },
      {
        id: 'task_upcoming',
        title: 'Book travel',
        completed: false,
        dueAt: nextWeek,
        listId: 'list_default',
        tagIds: ['tag_travel'],
        createdAt: atHour(today, 8),
        updatedAt: atHour(today, 8),
      },
      {
        id: 'task_done',
        title: 'Review PR',
        completed: true,
        dueAt: yesterday,
        listId: 'list_work',
        createdAt: atHour(yesterday, 9),
        updatedAt: atHour(today, 9),
      },
    ],
    view: {
      view: 'week',
      anchorDate: today,
      weekStartsOn: 0,
      density: 'comfortable',
      showWeekends: true,
      searchQuery: '',
      activeTagIds: [],
    },
    selectedEventId: null,
    selectedTaskId: null,
    selectedOccurrenceKey: null,
  }
}

/** Dense stress fixture for Theme acceptance. */
export function createCalendarStressSeed(count = 220): CalendarStoreSnapshot {
  const base = createCalendarSeed()
  const today = todayDateOnly()
  const events = [...base.events]
  const tasks = [...base.tasks]
  for (let i = 0; i < count; i += 1) {
    const day = addDaysDateOnly(today, (i % 40) - 10)
    const hour = 8 + (i % 10)
    const timed = defaultTimedFromDateOnly(day, hour, 30)
    events.push({
      id: `evt_stress_${i}`,
      calendarId: i % 2 === 0 ? 'cal_work' : 'cal_personal',
      title: `Stress event ${i + 1}`,
      start: timed.start,
      end: timed.end,
      allDay: false,
      tagIds: i % 3 === 0 ? ['tag_meet'] : [],
    })
    if (i % 4 === 0) {
      tasks.push({
        id: `task_stress_${i}`,
        title: `Stress task ${i + 1}`,
        completed: i % 8 === 0,
        dueAt: day,
        listId: 'list_default',
        createdAt: timed.start,
        updatedAt: timed.start,
      })
    }
  }
  return { ...base, title: 'Stress calendar', events, tasks }
}
