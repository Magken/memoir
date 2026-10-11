import type {
  CalEvent,
  CalEventException,
  CalReminder,
  CalTag,
  CalTask,
  CalViewState,
  CalendarEditorPayload,
  CalendarStoreSnapshot,
  CreateEventInput,
  CreateTaskInput,
  DeleteOccurrenceScope,
  RecurrenceRule,
} from './types'
import { createId } from './recurrence'
import { createCalendarSeed } from './seedCalendar'
import { todayDateOnly, parseCalendarDate, toDateOnly, toIsoInstant } from './time'
import { validateEventInput, validateTaskInput, validateTagName } from './validation'

function cloneSeed(): CalendarStoreSnapshot {
  const seed = createCalendarSeed()
  return structuredClone(seed)
}

function defaultView(): CalViewState {
  return {
    view: 'week',
    anchorDate: todayDateOnly(),
    weekStartsOn: 0,
    density: 'comfortable',
    showWeekends: true,
    searchQuery: '',
    activeTagIds: [],
  }
}

export function createCalendarFixtureStore() {
  let state: CalendarStoreSnapshot = cloneSeed()
  let snapshot: CalendarStoreSnapshot = state
  const listeners = new Set<() => void>()

  const rebuildSnapshot = () => {
    snapshot = state
  }

  const emit = () => {
    rebuildSnapshot()
    for (const l of listeners) l()
  }

  const getCalendar = (id: string) => state.calendars.find((c) => c.id === id)

  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot(): CalendarStoreSnapshot {
      return snapshot
    },
    reset() {
      state = cloneSeed()
      emit()
    },
    loadPayload(payload: CalendarEditorPayload) {
      const view = { ...defaultView(), ...payload.view }
      const calendars = structuredClone(payload.calendars)
      if (payload.activeCalendarIds?.length) {
        const set = new Set(payload.activeCalendarIds)
        for (const c of calendars) c.visible = set.has(c.id)
      }
      state = {
        title: payload.title,
        timeZone: payload.timeZone,
        calendars,
        tags: structuredClone(payload.tags),
        events: structuredClone(payload.events),
        exceptions: structuredClone(payload.exceptions ?? []),
        tasks: structuredClone(payload.tasks),
        taskLists: structuredClone(payload.taskLists ?? [{ id: 'list_default', name: 'My tasks' }]),
        view,
        selectedEventId: null,
        selectedTaskId: null,
        selectedOccurrenceKey: null,
      }
      emit()
    },
    toPayload(): CalendarEditorPayload {
      return {
        title: state.title,
        timeZone: state.timeZone,
        calendars: structuredClone(state.calendars),
        tags: structuredClone(state.tags),
        events: structuredClone(state.events),
        exceptions: structuredClone(state.exceptions),
        tasks: structuredClone(state.tasks),
        taskLists: structuredClone(state.taskLists),
        view: structuredClone(state.view),
        activeCalendarIds: state.calendars.filter((c) => c.visible).map((c) => c.id),
      }
    },
    patchView(patch: Partial<CalViewState>) {
      state = { ...state, view: { ...state.view, ...patch } }
      emit()
    },
    selectEvent(id: string | null, occurrenceKey: string | null = null) {
      state = {
        ...state,
        selectedEventId: id,
        selectedOccurrenceKey: occurrenceKey,
        selectedTaskId: id ? null : state.selectedTaskId,
      }
      emit()
    },
    selectTask(id: string | null) {
      state = {
        ...state,
        selectedTaskId: id,
        selectedEventId: id ? null : state.selectedEventId,
        selectedOccurrenceKey: id ? null : state.selectedOccurrenceKey,
      }
      emit()
    },
    toggleCalendarVisible(id: string, visible?: boolean) {
      state = {
        ...state,
        calendars: state.calendars.map((c) =>
          c.id === id ? { ...c, visible: visible ?? !c.visible } : c,
        ),
      }
      emit()
      return true
    },
    setActiveCalendars(ids: string[]) {
      const set = new Set(ids)
      state = {
        ...state,
        calendars: state.calendars.map((c) => ({ ...c, visible: set.has(c.id) })),
      }
      emit()
      return true
    },
    toggleTagFilter(tagId: string) {
      const active = new Set(state.view.activeTagIds ?? [])
      if (active.has(tagId)) active.delete(tagId)
      else active.add(tagId)
      state = { ...state, view: { ...state.view, activeTagIds: [...active] } }
      emit()
      return true
    },
    createEvent(input: CreateEventInput): { ok: true; event: CalEvent } | { ok: false; error: string } {
      const cal = getCalendar(input.calendarId)
      const check = validateEventInput(input, { writable: cal?.writable })
      if (!check.ok) return check
      const event: CalEvent = {
        id: createId('evt'),
        calendarId: input.calendarId,
        title: input.title.trim(),
        start: input.start,
        end: input.end,
        allDay: Boolean(input.allDay),
        description: input.description,
        location: input.location,
        tagIds: input.tagIds ?? [],
        recurrence: input.recurrence ?? null,
        reminders: input.reminders ?? [{ id: createId('rem'), minutesBefore: 10, channel: 'popup' }],
        isRecurringMaster: Boolean(input.recurrence),
      }
      state = { ...state, events: [...state.events, event], selectedEventId: event.id }
      emit()
      return { ok: true, event }
    },
    updateEvent(
      id: string,
      patch: Partial<CreateEventInput>,
    ): { ok: true } | { ok: false; error: string } {
      const existing = state.events.find((e) => e.id === id)
      if (!existing) return { ok: false, error: 'Event not found' }
      const cal = getCalendar(patch.calendarId ?? existing.calendarId)
      const next: CreateEventInput = {
        calendarId: patch.calendarId ?? existing.calendarId,
        title: patch.title ?? existing.title,
        start: patch.start ?? existing.start,
        end: patch.end ?? existing.end,
        allDay: patch.allDay ?? existing.allDay,
        description: patch.description ?? existing.description,
        location: patch.location ?? existing.location,
        tagIds: patch.tagIds ?? existing.tagIds,
        recurrence: patch.recurrence === undefined ? existing.recurrence : patch.recurrence,
        reminders: patch.reminders ?? existing.reminders,
      }
      const check = validateEventInput(next, { writable: cal?.writable })
      if (!check.ok) return check
      state = {
        ...state,
        events: state.events.map((e) =>
          e.id === id
            ? {
                ...e,
                ...next,
                title: next.title.trim(),
                isRecurringMaster: Boolean(next.recurrence),
              }
            : e,
        ),
      }
      emit()
      return { ok: true }
    },
    deleteEvent(id: string) {
      if (!state.events.some((e) => e.id === id)) return false
      state = {
        ...state,
        events: state.events.filter((e) => e.id !== id),
        exceptions: state.exceptions.filter((ex) => ex.recurringEventId !== id),
        selectedEventId: state.selectedEventId === id ? null : state.selectedEventId,
      }
      emit()
      return true
    },
    duplicateEvent(id: string) {
      const existing = state.events.find((e) => e.id === id)
      if (!existing) return null
      const copy: CalEvent = {
        ...structuredClone(existing),
        id: createId('evt'),
        title: `${existing.title} (copy)`,
      }
      state = { ...state, events: [...state.events, copy], selectedEventId: copy.id }
      emit()
      return copy
    },
    moveEvent(id: string, start: string, end: string) {
      return this.updateEvent(id, { start, end })
    },
    resizeEvent(id: string, end: string) {
      const existing = state.events.find((e) => e.id === id)
      if (!existing) return { ok: false as const, error: 'Event not found' }
      return this.updateEvent(id, { end })
    },
    setRecurrence(id: string, recurrence: RecurrenceRule | null) {
      return this.updateEvent(id, { recurrence })
    },
    updateOccurrence(
      recurringEventId: string,
      originalStart: string,
      patch: Partial<CreateEventInput>,
    ) {
      const existing = state.exceptions.find(
        (ex) => ex.recurringEventId === recurringEventId && ex.originalStart === originalStart,
      )
      const next: CalEventException = existing
        ? {
            ...existing,
            exceptionType: 'modified',
            patch: { ...existing.patch, ...patch },
          }
        : {
            id: createId('ex'),
            recurringEventId,
            originalStart,
            exceptionType: 'modified',
            patch,
          }
      state = {
        ...state,
        exceptions: existing
          ? state.exceptions.map((ex) => (ex.id === existing.id ? next : ex))
          : [...state.exceptions, next],
      }
      emit()
      return true
    },
    deleteOccurrence(
      recurringEventId: string,
      originalStart: string,
      scope: DeleteOccurrenceScope,
    ) {
      const master = state.events.find((e) => e.id === recurringEventId)
      if (!master) return false
      if (scope === 'all') return this.deleteEvent(recurringEventId)
      if (scope === 'this') {
        const cancelled: CalEventException = {
          id: createId('ex'),
          recurringEventId,
          originalStart,
          exceptionType: 'cancelled',
        }
        state = {
          ...state,
          exceptions: [
            ...state.exceptions.filter(
              (ex) => !(ex.recurringEventId === recurringEventId && ex.originalStart === originalStart),
            ),
            cancelled,
          ],
        }
        emit()
        return true
      }
      // following — truncate series until day before originalStart
      const untilDate = parseCalendarDate(originalStart)
      untilDate.setDate(untilDate.getDate() - 1)
      const until = master.allDay ? toDateOnly(untilDate) : toIsoInstant(untilDate)
      return this.setRecurrence(recurringEventId, {
        ...(master.recurrence ?? { freq: 'DAILY' }),
        until,
        count: undefined,
      }).ok
    },
    createTask(input: CreateTaskInput) {
      const check = validateTaskInput(input)
      if (!check.ok) return check
      const now = new Date().toISOString()
      const task: CalTask = {
        id: createId('task'),
        title: input.title.trim(),
        completed: false,
        dueAt: input.dueAt ?? null,
        calendarId: input.calendarId,
        listId: input.listId ?? state.taskLists[0]?.id,
        tagIds: input.tagIds ?? [],
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      }
      state = { ...state, tasks: [...state.tasks, task], selectedTaskId: task.id }
      emit()
      return { ok: true as const, task }
    },
    updateTask(id: string, patch: Partial<CreateTaskInput> & { completed?: boolean }) {
      const existing = state.tasks.find((t) => t.id === id)
      if (!existing) return { ok: false as const, error: 'Task not found' }
      const next = {
        title: patch.title ?? existing.title,
        dueAt: patch.dueAt === undefined ? existing.dueAt : patch.dueAt,
        calendarId: patch.calendarId ?? existing.calendarId,
        listId: patch.listId ?? existing.listId,
        tagIds: patch.tagIds ?? existing.tagIds,
        notes: patch.notes ?? existing.notes,
      }
      const check = validateTaskInput(next)
      if (!check.ok) return check
      state = {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                ...next,
                title: next.title.trim(),
                completed: patch.completed ?? t.completed,
                updatedAt: new Date().toISOString(),
              }
            : t,
        ),
      }
      emit()
      return { ok: true as const }
    },
    completeTask(id: string, completed = true) {
      return this.updateTask(id, { completed })
    },
    deleteTask(id: string) {
      if (!state.tasks.some((t) => t.id === id)) return false
      state = {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== id),
        selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
      }
      emit()
      return true
    },
    moveTaskDue(id: string, dueAt: string | null) {
      return this.updateTask(id, { dueAt })
    },
    setReminders(eventId: string, reminders: CalReminder[]) {
      const existing = state.events.find((e) => e.id === eventId)
      if (!existing) return false
      state = {
        ...state,
        events: state.events.map((e) => (e.id === eventId ? { ...e, reminders } : e)),
      }
      emit()
      return true
    },
    addTag(name: string, color: string) {
      const check = validateTagName(name, state.tags.map((t) => t.name))
      if (!check.ok) return check
      const tag: CalTag = { id: createId('tag'), name: name.trim(), color }
      state = { ...state, tags: [...state.tags, tag] }
      emit()
      return { ok: true as const, tag }
    },
  }
}

export type CalendarFixtureStore = ReturnType<typeof createCalendarFixtureStore>
