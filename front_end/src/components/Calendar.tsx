import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Search,
  Settings2,
} from 'lucide-react'
import { addMonths } from 'date-fns'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  createCalendarFixtureStore,
  defaultTimedEnd,
  defaultTimedFromDateOnly,
  expandEvents,
  filterOccurrences,
  filterTasks,
  formatRangeTitle,
  parseCalendarDate,
  shiftAnchor,
  toDateOnly,
  todayDateOnly,
  visibleRangeForView,
  type CalOccurrence,
  type CalendarEditorPayload,
  type CalendarViewId,
  type CreateEventInput,
  type DeleteOccurrenceScope,
  type WeekStartsOn,
} from '../lib/calendar'
import { downloadExportedContext } from '../lib/editorContext/importExportManager'
import type {
  EditorActionRequest,
  EditorActionResult,
  EditorRuntimeHandle,
} from '../lib/editorContext/types'
import type { CascadeMenuItem } from '../lib/menus/cascadeMenu'
import { Button } from './Button'
import { CascadeMenuButton } from './CascadeMenuButton'
import { IconButton } from './IconButton'
import { Input } from './Input'
import { ToolbarModeGroup } from './ToolbarModeGroup'
import { Tooltip } from './Tooltip'
import { EditorExportMenu } from './editorContextParts/EditorExportMenu'
import { EditorTitleField } from './editorContextParts/EditorTitleField'
import { EditorTitlebar } from './editorContextParts/EditorTitlebar'
import { CalendarAgendaView } from './calendarParts/CalendarAgendaView'
import {
  CalendarEventModal,
  CalendarTaskModal,
  eventToInput,
} from './calendarParts/CalendarEventModal'
import { CalendarMiniMonth } from './calendarParts/CalendarMiniMonth'
import { CalendarMonthView } from './calendarParts/CalendarMonthView'
import { CalendarSidebar } from './calendarParts/CalendarSidebar'
import { CalendarStatusBar } from './calendarParts/CalendarStatusBar'
import { CalendarTasksView } from './calendarParts/CalendarTasksView'
import { CalendarTimedGrid } from './calendarParts/CalendarTimedGrid'

export type CalendarVariant = 'workbench' | 'showcase' | 'embed'

type CalendarProps = {
  className?: string
  variant?: CalendarVariant
  initialTitle?: string
  compact?: boolean
}

export type CalendarHandle = EditorRuntimeHandle

const VIEW_ICONS: Record<CalendarViewId, typeof CalendarDays> = {
  month: CalendarDays,
  week: CalendarRange,
  day: CalendarDays,
  agenda: Search,
  tasks: ListTodo,
}

export const Calendar = forwardRef<CalendarHandle, CalendarProps>(function Calendar(
  { className = '', variant = 'workbench', initialTitle = 'Calendar', compact = false },
  ref,
) {
  const storeRef = useRef(createCalendarFixtureStore())
  const store = storeRef.current
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const rootRef = useRef<HTMLDivElement>(null)

  const [title, setTitle] = useState(initialTitle)
  const [sidebarOpen, setSidebarOpen] = useState(variant !== 'embed')
  const [eventModal, setEventModal] = useState<{
    open: boolean
    mode: 'create' | 'edit'
    initial?: CreateEventInput & { id?: string }
    occurrence?: CalOccurrence | null
  }>({ open: false, mode: 'create' })
  const [taskModal, setTaskModal] = useState<{ open: boolean; taskId?: string | null }>({
    open: false,
  })
  const [remindersOpen, setRemindersOpen] = useState(false)

  const view = snapshot.view
  const range = useMemo(
    () => visibleRangeForView(view.view, view.anchorDate, view.weekStartsOn),
    [view.view, view.anchorDate, view.weekStartsOn],
  )

  const occurrences = useMemo(() => {
    const expanded = expandEvents(
      snapshot.events,
      snapshot.exceptions,
      snapshot.calendars,
      range.start,
      range.end,
    )
    return filterOccurrences(expanded, {
      searchQuery: view.searchQuery,
      activeTagIds: view.activeTagIds,
    })
  }, [
    snapshot.events,
    snapshot.exceptions,
    snapshot.calendars,
    range.start,
    range.end,
    view.searchQuery,
    view.activeTagIds,
  ])

  const tasks = useMemo(
    () =>
      filterTasks(snapshot.tasks, {
        searchQuery: view.searchQuery,
        activeTagIds: view.activeTagIds,
      }),
    [snapshot.tasks, view.searchQuery, view.activeTagIds],
  )

  const getContext = useCallback((): CalendarEditorPayload => {
    return { ...store.toPayload(), title }
  }, [store, title])

  const loadContext = useCallback(
    async (payload: unknown) => {
      store.loadPayload(payload as CalendarEditorPayload)
      const p = payload as CalendarEditorPayload
      if (p.title) setTitle(p.title)
    },
    [store],
  )

  const openCreateEvent = useCallback(
    (partial?: Partial<CreateEventInput>) => {
      const today = todayDateOnly()
      const timed = defaultTimedFromDateOnly(partial?.start?.slice(0, 10) ?? today)
      setEventModal({
        open: true,
        mode: 'create',
        initial: {
          calendarId: store.getSnapshot().calendars.find((c) => c.writable)?.id ?? 'cal_personal',
          title: '',
          start: partial?.start ?? timed.start,
          end: partial?.end ?? timed.end,
          allDay: partial?.allDay ?? false,
          ...partial,
        },
        occurrence: null,
      })
    },
    [store],
  )

  const openOccurrence = useCallback(
    (occ: CalOccurrence) => {
      const master = snapshot.events.find((e) => e.id === occ.eventId)
      store.selectEvent(occ.eventId, occ.id)
      setEventModal({
        open: true,
        mode: 'edit',
        initial: master
          ? {
              ...eventToInput(master),
              start: occ.start,
              end: occ.end,
              title: occ.title,
            }
          : {
              calendarId: occ.calendarId,
              title: occ.title,
              start: occ.start,
              end: occ.end,
              allDay: occ.allDay,
            },
        occurrence: occ,
      })
    },
    [snapshot.events, store],
  )

  const invokeAction = useCallback(
    (request: EditorActionRequest): EditorActionResult => {
      const { actionId, value, targetId, payload } = request
      const snap = store.getSnapshot()

      switch (actionId) {
        case 'calendar.action.set-view': {
          const next = (value ?? (payload as { view?: CalendarViewId })?.view) as CalendarViewId
          if (!next) return { ok: false, actionId, error: 'Missing view' }
          store.patchView({ view: next })
          return { ok: true, actionId }
        }
        case 'calendar.action.set-anchor': {
          if (!value) return { ok: false, actionId, error: 'Missing date' }
          store.patchView({ anchorDate: value.slice(0, 10) })
          return { ok: true, actionId }
        }
        case 'calendar.action.today': {
          store.patchView({ anchorDate: todayDateOnly() })
          return { ok: true, actionId }
        }
        case 'calendar.action.prev': {
          store.patchView({
            anchorDate: shiftAnchor(snap.view.anchorDate, snap.view.view, -1),
          })
          return { ok: true, actionId }
        }
        case 'calendar.action.next': {
          store.patchView({
            anchorDate: shiftAnchor(snap.view.anchorDate, snap.view.view, 1),
          })
          return { ok: true, actionId }
        }
        case 'calendar.action.toggle-sidebar': {
          setSidebarOpen((v) => !v)
          return { ok: true, actionId }
        }
        case 'calendar.action.toggle-weekends': {
          store.patchView({ showWeekends: !snap.view.showWeekends })
          return { ok: true, actionId }
        }
        case 'calendar.action.set-week-start': {
          const n = Number(value) as WeekStartsOn
          if (![0, 1, 6].includes(n)) return { ok: false, actionId, error: 'Invalid week start' }
          store.patchView({ weekStartsOn: n })
          return { ok: true, actionId }
        }
        case 'calendar.action.search': {
          store.patchView({ searchQuery: value ?? '' })
          return { ok: true, actionId }
        }
        case 'calendar.action.focus-create': {
          openCreateEvent()
          return { ok: true, actionId }
        }
        case 'calendar.action.toggle-calendar-visible': {
          if (!targetId) return { ok: false, actionId, error: 'Missing calendar id' }
          store.toggleCalendarVisible(targetId, value === undefined ? undefined : value === 'true')
          return { ok: true, actionId }
        }
        case 'calendar.action.set-active-calendars': {
          const ids = (payload as { ids?: string[] })?.ids ?? (value ? value.split(',') : [])
          store.setActiveCalendars(ids)
          return { ok: true, actionId }
        }
        case 'calendar.action.toggle-tag-filter': {
          if (!targetId) return { ok: false, actionId, error: 'Missing tag id' }
          store.toggleTagFilter(targetId)
          return { ok: true, actionId }
        }
        case 'calendar.action.create-event': {
          const input = (payload as CreateEventInput) ?? {
            calendarId: snap.calendars.find((c) => c.writable)?.id ?? 'cal_personal',
            title: value ?? 'New event',
            start: defaultTimedFromDateOnly(snap.view.anchorDate).start,
            end: defaultTimedFromDateOnly(snap.view.anchorDate).end,
            allDay: false,
          }
          const result = store.createEvent(input)
          if (!result.ok) return { ok: false, actionId, error: result.error }
          return { ok: true, actionId, data: { eventId: result.event.id } }
        }
        case 'calendar.action.update-event': {
          if (!targetId) return { ok: false, actionId, error: 'Missing event id' }
          const result = store.updateEvent(targetId, (payload as Partial<CreateEventInput>) ?? {})
          if (!result.ok) return { ok: false, actionId, error: result.error }
          return { ok: true, actionId }
        }
        case 'calendar.action.delete-event': {
          if (!targetId) return { ok: false, actionId, error: 'Missing event id' }
          return { ok: store.deleteEvent(targetId), actionId }
        }
        case 'calendar.action.duplicate-event': {
          if (!targetId) return { ok: false, actionId, error: 'Missing event id' }
          const copy = store.duplicateEvent(targetId)
          return copy
            ? { ok: true, actionId, data: { eventId: copy.id } }
            : { ok: false, actionId, error: 'Event not found' }
        }
        case 'calendar.action.move-event': {
          if (!targetId) return { ok: false, actionId, error: 'Missing event id' }
          const body = payload as { start: string; end: string }
          if (!body?.start || !body?.end) return { ok: false, actionId, error: 'Missing start/end' }
          const result = store.moveEvent(targetId, body.start, body.end)
          if (!result.ok) return { ok: false, actionId, error: result.error }
          return { ok: true, actionId }
        }
        case 'calendar.action.resize-event': {
          if (!targetId) return { ok: false, actionId, error: 'Missing event id' }
          const end = (payload as { end?: string })?.end ?? value
          if (!end) return { ok: false, actionId, error: 'Missing end' }
          const result = store.resizeEvent(targetId, end)
          if (!result.ok) return { ok: false, actionId, error: result.error }
          return { ok: true, actionId }
        }
        case 'calendar.action.open-event': {
          if (!targetId) return { ok: false, actionId, error: 'Missing event id' }
          const occ =
            occurrences.find((o) => o.eventId === targetId || o.id === targetId) ??
            (() => {
              const ev = snap.events.find((e) => e.id === targetId)
              if (!ev) return null
              return {
                id: ev.id,
                eventId: ev.id,
                calendarId: ev.calendarId,
                title: ev.title,
                start: ev.start,
                end: ev.end,
                allDay: ev.allDay,
                tagIds: ev.tagIds ?? [],
                color: snap.calendars.find((c) => c.id === ev.calendarId)?.color ?? '#4285f4',
              } satisfies CalOccurrence
            })()
          if (!occ) return { ok: false, actionId, error: 'Event not found' }
          openOccurrence(occ)
          return { ok: true, actionId }
        }
        case 'calendar.action.select-event': {
          store.selectEvent(targetId ?? null, value ?? null)
          return { ok: true, actionId }
        }
        case 'calendar.action.set-recurrence': {
          if (!targetId) return { ok: false, actionId, error: 'Missing event id' }
          const result = store.setRecurrence(
            targetId,
            (payload as { recurrence?: CreateEventInput['recurrence'] })?.recurrence ?? null,
          )
          if (!result.ok) return { ok: false, actionId, error: result.error }
          return { ok: true, actionId }
        }
        case 'calendar.action.update-occurrence': {
          const body = payload as {
            recurringEventId: string
            originalStart: string
            patch: Partial<CreateEventInput>
          }
          if (!body?.recurringEventId || !body.originalStart) {
            return { ok: false, actionId, error: 'Missing occurrence identity' }
          }
          store.updateOccurrence(body.recurringEventId, body.originalStart, body.patch ?? {})
          return { ok: true, actionId }
        }
        case 'calendar.action.delete-occurrence': {
          const body = payload as {
            recurringEventId?: string
            originalStart?: string
            scope?: DeleteOccurrenceScope
          }
          const recurringEventId = body?.recurringEventId ?? targetId
          const originalStart = body?.originalStart ?? value
          const scope = body?.scope ?? 'this'
          if (!recurringEventId || !originalStart) {
            return { ok: false, actionId, error: 'Missing occurrence identity' }
          }
          return {
            ok: store.deleteOccurrence(recurringEventId, originalStart, scope),
            actionId,
          }
        }
        case 'calendar.action.create-task': {
          const result = store.createTask({
            title: value ?? (payload as { title?: string })?.title ?? 'New task',
            dueAt: (payload as { dueAt?: string })?.dueAt ?? snap.view.anchorDate,
          })
          if (!result.ok) return { ok: false, actionId, error: result.error }
          return { ok: true, actionId, data: { taskId: result.task.id } }
        }
        case 'calendar.action.update-task': {
          if (!targetId) return { ok: false, actionId, error: 'Missing task id' }
          const result = store.updateTask(targetId, (payload as object) ?? {})
          if (!result.ok) return { ok: false, actionId, error: result.error }
          return { ok: true, actionId }
        }
        case 'calendar.action.complete-task': {
          if (!targetId) return { ok: false, actionId, error: 'Missing task id' }
          const completed = value === undefined ? true : value === 'true'
          const result = store.completeTask(targetId, completed)
          if (!result.ok) return { ok: false, actionId, error: result.error }
          return { ok: true, actionId }
        }
        case 'calendar.action.delete-task': {
          if (!targetId) return { ok: false, actionId, error: 'Missing task id' }
          return { ok: store.deleteTask(targetId), actionId }
        }
        case 'calendar.action.open-task': {
          if (!targetId) return { ok: false, actionId, error: 'Missing task id' }
          store.selectTask(targetId)
          setTaskModal({ open: true, taskId: targetId })
          return { ok: true, actionId }
        }
        case 'calendar.action.move-task-due': {
          if (!targetId) return { ok: false, actionId, error: 'Missing task id' }
          const dueAt = value ?? null
          const result = store.moveTaskDue(targetId, dueAt)
          if (!result.ok) return { ok: false, actionId, error: result.error }
          return { ok: true, actionId }
        }
        case 'calendar.action.open-settings': {
          return { ok: true, actionId, data: { opened: 'settings' } }
        }
        case 'calendar.action.open-create-menu': {
          openCreateEvent()
          return { ok: true, actionId }
        }
        case 'calendar.action.open-reminders': {
          setRemindersOpen(true)
          if (targetId) store.selectEvent(targetId)
          return { ok: true, actionId }
        }
        default:
          return { ok: false, actionId, error: `Unhandled action: ${actionId}` }
      }
    },
    [occurrences, openCreateEvent, openOccurrence, store],
  )

  const runtimeHandle = useMemo<EditorRuntimeHandle>(
    () => ({ getContext, loadContext, invokeAction }),
    [getContext, loadContext, invokeAction],
  )

  useImperativeHandle(ref, () => runtimeHandle, [runtimeHandle])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (e.key === 't') store.patchView({ anchorDate: todayDateOnly() })
      else if (e.key === 'c') openCreateEvent()
      else if (e.key === 'Escape') {
        setEventModal((m) => ({ ...m, open: false }))
        setTaskModal({ open: false })
        setRemindersOpen(false)
      } else if (e.key === 'Delete' && snapshot.selectedEventId) {
        store.deleteEvent(snapshot.selectedEventId)
      } else if (e.key === 'ArrowLeft') {
        store.patchView({ anchorDate: shiftAnchor(view.anchorDate, view.view, -1) })
      } else if (e.key === 'ArrowRight') {
        store.patchView({ anchorDate: shiftAnchor(view.anchorDate, view.view, 1) })
      }
    }
    const el = rootRef.current
    el?.addEventListener('keydown', onKey)
    return () => el?.removeEventListener('keydown', onKey)
  }, [openCreateEvent, snapshot.selectedEventId, store, view.anchorDate, view.view])

  const settingsItems: CascadeMenuItem[] = [
    { id: 'weekends', label: view.showWeekends ? 'Hide weekends' : 'Show weekends' },
    { id: 'week-sun', label: 'Week starts Sunday' },
    { id: 'week-mon', label: 'Week starts Monday' },
    { id: 'density', label: view.density === 'compact' ? 'Comfortable density' : 'Compact density' },
  ]

  const createItems: CascadeMenuItem[] = [
    { id: 'event', label: 'Event' },
    { id: 'task', label: 'Task' },
  ]

  const selectedTask = snapshot.tasks.find((t) => t.id === (taskModal.taskId ?? snapshot.selectedTaskId))
  const isCompact = compact || variant === 'embed'
  const selectedEvent = snapshot.events.find((e) => e.id === snapshot.selectedEventId)

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      className={[
        'theme-calendar',
        variant === 'showcase' ? 'theme-calendar--showcase' : '',
        variant === 'embed' ? 'theme-calendar--embed' : '',
        isCompact ? 'theme-calendar--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {variant !== 'embed' ? (
        <EditorTitlebar
          fileMenu={
            <div className="flex items-center gap-1">
              <Tooltip content={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}>
                <IconButton
                  type="button"
                  size="xs"
                  variant="ghost"
                  icon={sidebarOpen ? PanelLeftClose : PanelLeft}
                  aria-label="Toggle sidebar"
                  onClick={() => setSidebarOpen((v) => !v)}
                />
              </Tooltip>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => store.patchView({ anchorDate: todayDateOnly() })}
              >
                Today
              </Button>
              <IconButton
                type="button"
                size="xs"
                variant="ghost"
                icon={ChevronLeft}
                aria-label="Previous"
                onClick={() =>
                  store.patchView({
                    anchorDate: shiftAnchor(view.anchorDate, view.view, -1),
                  })
                }
              />
              <IconButton
                type="button"
                size="xs"
                variant="ghost"
                icon={ChevronRight}
                aria-label="Next"
                onClick={() =>
                  store.patchView({
                    anchorDate: shiftAnchor(view.anchorDate, view.view, 1),
                  })
                }
              />
            </div>
          }
          titleBlock={
            <EditorTitleField value={title} onChange={setTitle} aria-label="Calendar title" />
          }
          saveTray={
            <div className="flex items-center gap-1">
              <div className="w-40">
                <Input
                  value={view.searchQuery ?? ''}
                  onChange={(e) => store.patchView({ searchQuery: e.target.value })}
                  placeholder="Search"
                  shadowless
                  size="xs"
                  aria-label="Search calendar"
                />
              </div>
              <CascadeMenuButton
                variant="tray"
                size="xs"
                label="Create"
                icon={Plus}
                items={createItems}
                onSelect={(id) => {
                  if (id === 'event') openCreateEvent()
                  if (id === 'task') setTaskModal({ open: true, taskId: null })
                }}
              />
              <CascadeMenuButton
                variant="ghost"
                size="xs"
                icon={Settings2}
                iconOnly
                label="Settings"
                items={settingsItems}
                onSelect={(id) => {
                  if (id === 'weekends') store.patchView({ showWeekends: !view.showWeekends })
                  if (id === 'week-sun') store.patchView({ weekStartsOn: 0 })
                  if (id === 'week-mon') store.patchView({ weekStartsOn: 1 })
                  if (id === 'density') {
                    store.patchView({
                      density: view.density === 'compact' ? 'comfortable' : 'compact',
                    })
                  }
                }}
              />
            </div>
          }
          exportMenu={
            <EditorExportMenu
              kind="calendar"
              onExport={(formatId) =>
                downloadExportedContext('calendar', runtimeHandle, formatId as 'envelope-json', title)
              }
            />
          }
        />
      ) : null}

      <div className="theme-calendar__tools">
        <ToolbarModeGroup aria-label="Calendar view">
          {(['month', 'week', 'day', 'agenda', 'tasks'] as CalendarViewId[]).map((id) => {
            const Icon = VIEW_ICONS[id]
            return (
              <IconButton
                key={id}
                type="button"
                size="xs"
                variant="tray"
                icon={Icon}
                aria-label={id}
                aria-pressed={view.view === id}
                active={view.view === id}
                onClick={() => store.patchView({ view: id })}
              />
            )
          })}
        </ToolbarModeGroup>
        <p className="type-body-sm">
          {formatRangeTitle(view.view, view.anchorDate, view.weekStartsOn)}
        </p>
      </div>

      <div className="theme-calendar__body relative">
        {sidebarOpen && isCompact ? (
          <button
            type="button"
            className="theme-calendar-drawer-backdrop"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}
        {sidebarOpen && variant !== 'embed' ? (
          <CalendarSidebar
            calendars={snapshot.calendars}
            tags={snapshot.tags}
            activeTagIds={view.activeTagIds ?? []}
            tasks={snapshot.tasks}
            onToggleCalendar={(id) => store.toggleCalendarVisible(id)}
            onToggleTag={(id) => store.toggleTagFilter(id)}
            onOpenTask={(id) => {
              store.selectTask(id)
              setTaskModal({ open: true, taskId: id })
            }}
            onCompleteTask={(id, completed) => store.completeTask(id, completed)}
            onAddTask={() => setTaskModal({ open: true, taskId: null })}
            miniMonth={
              <CalendarMiniMonth
                anchorDate={view.anchorDate}
                weekStartsOn={view.weekStartsOn}
                onSelectDate={(dateOnly) => store.patchView({ anchorDate: dateOnly })}
                onShiftMonth={(dir) =>
                  store.patchView({
                    anchorDate: toDateOnly(addMonths(parseCalendarDate(view.anchorDate), dir)),
                  })
                }
              />
            }
          />
        ) : null}

        <div className="theme-calendar__main">
          <div className="theme-calendar__stage">
            {view.view === 'month' ? (
              <CalendarMonthView
                anchorDate={view.anchorDate}
                weekStartsOn={view.weekStartsOn}
                occurrences={occurrences}
                tasks={tasks}
                selectedOccurrenceKey={snapshot.selectedOccurrenceKey}
                onSelectDay={(dateOnly) => store.patchView({ anchorDate: dateOnly })}
                onCreateAt={(dateOnly) =>
                  openCreateEvent({
                    ...defaultTimedFromDateOnly(dateOnly),
                    allDay: false,
                  })
                }
                onOpenOccurrence={openOccurrence}
                onOpenTask={(task) => {
                  store.selectTask(task.id)
                  setTaskModal({ open: true, taskId: task.id })
                }}
              />
            ) : null}
            {view.view === 'week' || view.view === 'day' ? (
              <CalendarTimedGrid
                anchorDate={view.anchorDate}
                weekStartsOn={view.weekStartsOn}
                showWeekends={view.showWeekends}
                dayCount={view.view === 'day' ? 'day' : 'week'}
                occurrences={occurrences}
                selectedOccurrenceKey={snapshot.selectedOccurrenceKey}
                onOpenOccurrence={openOccurrence}
                onCreateAt={(startIso) =>
                  openCreateEvent({ start: startIso, end: defaultTimedEnd(startIso), allDay: false })
                }
                onMoveOccurrence={(occ, start, end) => {
                  if (occ.recurringEventId && occ.originalStart) {
                    store.updateOccurrence(occ.recurringEventId, occ.originalStart, { start, end })
                  } else {
                    store.moveEvent(occ.eventId, start, end)
                  }
                }}
                onResizeOccurrence={(occ, end) => {
                  if (occ.recurringEventId && occ.originalStart) {
                    store.updateOccurrence(occ.recurringEventId, occ.originalStart, { end })
                  } else {
                    store.resizeEvent(occ.eventId, end)
                  }
                }}
              />
            ) : null}
            {view.view === 'agenda' ? (
              <CalendarAgendaView
                occurrences={occurrences}
                tasks={tasks}
                onOpenOccurrence={openOccurrence}
                onOpenTask={(task) => {
                  store.selectTask(task.id)
                  setTaskModal({ open: true, taskId: task.id })
                }}
              />
            ) : null}
            {view.view === 'tasks' ? (
              <CalendarTasksView
                tasks={tasks}
                onOpenTask={(task) => {
                  store.selectTask(task.id)
                  setTaskModal({ open: true, taskId: task.id })
                }}
                onCompleteTask={(id, completed) => store.completeTask(id, completed)}
              />
            ) : null}
          </div>
          <CalendarStatusBar
            rangeLabel={formatRangeTitle(view.view, view.anchorDate, view.weekStartsOn)}
            eventCount={occurrences.length}
            taskCount={tasks.filter((t) => !t.completed).length}
          />
        </div>
      </div>

      <CalendarEventModal
        open={eventModal.open}
        mode={eventModal.mode}
        calendars={snapshot.calendars}
        tags={snapshot.tags}
        initial={eventModal.initial}
        occurrence={eventModal.occurrence}
        onClose={() => setEventModal((m) => ({ ...m, open: false }))}
        onSave={(input) => {
          if (eventModal.mode === 'create') store.createEvent(input)
          else if (eventModal.initial?.id) store.updateEvent(eventModal.initial.id, input)
          setEventModal((m) => ({ ...m, open: false }))
        }}
        onUpdateOccurrence={(patch) => {
          const occ = eventModal.occurrence
          if (occ?.recurringEventId && occ.originalStart) {
            store.updateOccurrence(occ.recurringEventId, occ.originalStart, patch)
          }
          setEventModal((m) => ({ ...m, open: false }))
        }}
        onDelete={(scope) => {
          const occ = eventModal.occurrence
          if (occ?.recurringEventId && occ.originalStart) {
            store.deleteOccurrence(occ.recurringEventId, occ.originalStart, scope ?? 'this')
          } else if (eventModal.initial?.id) {
            store.deleteEvent(eventModal.initial.id)
          }
          setEventModal((m) => ({ ...m, open: false }))
        }}
      />

      <CalendarTaskModal
        open={taskModal.open}
        initial={selectedTask}
        onClose={() => setTaskModal({ open: false })}
        onSave={(input) => {
          if (selectedTask) store.updateTask(selectedTask.id, input)
          else store.createTask(input)
          setTaskModal({ open: false })
        }}
        onDelete={
          selectedTask
            ? () => {
                store.deleteTask(selectedTask.id)
                setTaskModal({ open: false })
              }
            : undefined
        }
      />

      {remindersOpen && selectedEvent ? (
        <CalendarEventModal
          open={remindersOpen}
          mode="edit"
          calendars={snapshot.calendars}
          tags={snapshot.tags}
          initial={eventToInput(selectedEvent)}
          onClose={() => setRemindersOpen(false)}
          onSave={(input) => {
            store.updateEvent(selectedEvent.id, input)
            setRemindersOpen(false)
          }}
        />
      ) : null}
    </div>
  )
})

export function CalendarEmbed({ className = '' }: { className?: string }) {
  return <Calendar className={className} variant="embed" />
}
