import { format } from 'date-fns'
import type { CalOccurrence, CalTask } from '../../lib/calendar/types'
import { parseCalendarDate, toDateOnly } from '../../lib/calendar/time'
import { ThemeScroll } from '../ThemeScroll'

type CalendarAgendaViewProps = {
  occurrences: readonly CalOccurrence[]
  tasks: readonly CalTask[]
  onOpenOccurrence: (occ: CalOccurrence) => void
  onOpenTask: (task: CalTask) => void
}

export function CalendarAgendaView({
  occurrences,
  tasks,
  onOpenOccurrence,
  onOpenTask,
}: CalendarAgendaViewProps) {
  const byDay = new Map<string, { events: CalOccurrence[]; tasks: CalTask[] }>()
  for (const o of occurrences) {
    const key = toDateOnly(parseCalendarDate(o.start))
    const bucket = byDay.get(key) ?? { events: [], tasks: [] }
    bucket.events.push(o)
    byDay.set(key, bucket)
  }
  for (const t of tasks) {
    if (!t.dueAt) continue
    const key = t.dueAt.slice(0, 10)
    const bucket = byDay.get(key) ?? { events: [], tasks: [] }
    bucket.tasks.push(t)
    byDay.set(key, bucket)
  }
  const days = [...byDay.keys()].sort()

  return (
    <ThemeScroll rail="nano" className="theme-calendar-agenda h-full">
      {days.length === 0 ? (
        <p className="type-body-sm type-muted">No events or tasks in this range.</p>
      ) : null}
      {days.map((day) => {
        const bucket = byDay.get(day)!
        return (
          <section key={day} className="theme-calendar-agenda__day">
            <h3 className="type-label mb-2">
              {format(parseCalendarDate(day), 'EEEE, MMM d')}
            </h3>
            <ul className="space-y-1">
              {bucket.events.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    className="theme-calendar-agenda__row"
                    onClick={() => onOpenOccurrence(o)}
                  >
                    <span
                      className="theme-calendar-swatch"
                      data-cal-color={o.color}
                      aria-hidden
                    />
                    <span className="type-caption type-muted w-20 shrink-0">
                      {o.allDay ? 'All day' : format(parseCalendarDate(o.start), 'h:mm a')}
                    </span>
                    <span className="type-body-sm truncate">{o.title}</span>
                  </button>
                </li>
              ))}
              {bucket.tasks.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="theme-calendar-agenda__row"
                    onClick={() => onOpenTask(t)}
                  >
                    <span className="type-caption type-muted w-20 shrink-0">Task</span>
                    <span className={['type-body-sm truncate', t.completed ? 'line-through type-muted' : ''].filter(Boolean).join(' ')}>
                      {t.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </ThemeScroll>
  )
}
