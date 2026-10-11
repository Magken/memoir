import { format, isSameDay, isSameMonth } from 'date-fns'
import type { CalOccurrence, CalTask, WeekStartsOn } from '../../lib/calendar/types'
import { monthCellCap } from '../../lib/calendar/layout'
import { monthGridDays, parseCalendarDate, toDateOnly, todayDateOnly } from '../../lib/calendar/time'

type CalendarMonthViewProps = {
  anchorDate: string
  weekStartsOn: WeekStartsOn
  occurrences: readonly CalOccurrence[]
  tasks: readonly CalTask[]
  selectedOccurrenceKey: string | null
  onSelectDay: (dateOnly: string) => void
  onCreateAt: (dateOnly: string) => void
  onOpenOccurrence: (occ: CalOccurrence) => void
  onOpenTask: (task: CalTask) => void
}

export function CalendarMonthView({
  anchorDate,
  weekStartsOn,
  occurrences,
  tasks,
  selectedOccurrenceKey,
  onSelectDay,
  onCreateAt,
  onOpenOccurrence,
  onOpenTask,
}: CalendarMonthViewProps) {
  const anchor = parseCalendarDate(anchorDate)
  const days = monthGridDays(anchorDate, weekStartsOn)
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const rotated = [...labels.slice(weekStartsOn), ...labels.slice(0, weekStartsOn)]
  const today = todayDateOnly()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="theme-calendar-month__head" role="row">
        {rotated.map((label) => (
          <div key={label} className="theme-calendar-month__head-cell px-2 py-1 type-caption type-muted">
            {label}
          </div>
        ))}
      </div>
      <div className="theme-calendar-month min-h-0 flex-1" role="grid" aria-label="Month view">
        {days.map((day) => {
          const dateOnly = toDateOnly(day)
          const dayOcc = occurrences.filter((o) => {
            if (o.allDay) {
              return o.start <= dateOnly && o.end > dateOnly
            }
            return o.start.slice(0, 10) === dateOnly || toDateOnly(parseCalendarDate(o.start)) === dateOnly
          })
          const dayTasks = tasks.filter((t) => t.dueAt && t.dueAt.slice(0, 10) === dateOnly && !t.completed)
          const mixed = [
            ...dayOcc.map((o) => ({ kind: 'event' as const, occurrence: o })),
            ...dayTasks.map((t) => ({ kind: 'task' as const, task: t })),
          ]
          const { visible, overflow } = monthCellCap(mixed, 3)
          return (
            <div
              key={dateOnly}
              role="gridcell"
              tabIndex={0}
              aria-label={format(day, 'EEEE, MMM d')}
              className={[
                'theme-calendar-month__cell',
                !isSameMonth(day, anchor) ? 'theme-calendar-month__cell--outside' : '',
                isSameDay(day, parseCalendarDate(today)) ? 'theme-calendar-month__cell--today' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelectDay(dateOnly)}
              onDoubleClick={() => onCreateAt(dateOnly)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onCreateAt(dateOnly)
              }}
            >
              <span className="theme-calendar-month__daynum">{format(day, 'd')}</span>
              {visible.map((item) =>
                item.kind === 'event' ? (
                  <button
                    key={item.occurrence.id}
                    type="button"
                    className={[
                      'theme-calendar-chip',
                      selectedOccurrenceKey === item.occurrence.id ? 'theme-calendar-chip--selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    data-cal-color={item.occurrence.color}
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenOccurrence(item.occurrence)
                    }}
                  >
                    {item.occurrence.title}
                  </button>
                ) : (
                  <button
                    key={item.task.id}
                    type="button"
                    className="theme-calendar-chip theme-calendar-chip--task"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenTask(item.task)
                    }}
                  >
                    ☐ {item.task.title}
                  </button>
                ),
              )}
              {overflow > 0 ? (
                <span className="type-caption type-muted">+{overflow} more</span>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
