import { format } from 'date-fns'
import type { CalOccurrence, TimedLayoutItem, WeekStartsOn } from '../../lib/calendar/types'
import { packTimedDay } from '../../lib/calendar/layout'
import { parseCalendarDate, toDateOnly, weekDays } from '../../lib/calendar/time'
import { ThemeScroll } from '../ThemeScroll'

type CalendarTimedGridProps = {
  anchorDate: string
  weekStartsOn: WeekStartsOn
  showWeekends: boolean
  dayCount: 'week' | 'day'
  occurrences: readonly CalOccurrence[]
  selectedOccurrenceKey: string | null
  onOpenOccurrence: (occ: CalOccurrence) => void
  onCreateAt: (startIso: string) => void
  onMoveOccurrence: (occ: CalOccurrence, startIso: string, endIso: string) => void
  onResizeOccurrence: (occ: CalOccurrence, endIso: string) => void
}

function allDayForDay(occurrences: readonly CalOccurrence[], dateOnly: string) {
  return occurrences.filter((o) => o.allDay && o.start <= dateOnly && o.end > dateOnly)
}

export function CalendarTimedGrid({
  anchorDate,
  weekStartsOn,
  showWeekends,
  dayCount,
  occurrences,
  selectedOccurrenceKey,
  onOpenOccurrence,
  onCreateAt,
  onMoveOccurrence,
  onResizeOccurrence,
}: CalendarTimedGridProps) {
  const days =
    dayCount === 'day'
      ? [parseCalendarDate(anchorDate)]
      : weekDays(anchorDate, weekStartsOn, showWeekends)

  return (
    <ThemeScroll rail="nano" className="h-full">
      <div
        className="theme-calendar-timed"
        style={{ ['--cal-day-count' as string]: String(days.length) }}
        role="grid"
        aria-label={dayCount === 'day' ? 'Day view' : 'Week view'}
      >
        <div className="border-b border-[var(--theme-border)] p-1 type-caption type-muted">All day</div>
        {days.map((day) => {
          const dateOnly = toDateOnly(day)
          const allDay = allDayForDay(occurrences, dateOnly)
          return (
            <div
              key={`allday-${dateOnly}`}
              className="border-b border-r border-[var(--theme-border)] p-1 min-h-[2rem]"
            >
              {allDay.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="theme-calendar-chip mb-0.5"
                  data-cal-color={o.color}
                  onClick={() => onOpenOccurrence(o)}
                >
                  {o.title}
                </button>
              ))}
            </div>
          )
        })}

        <div className="theme-calendar-timed__hours" aria-hidden>
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className="theme-calendar-timed__hour">
              {format(new Date(2000, 0, 1, hour), 'h a')}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dateOnly = toDateOnly(day)
          const packed = packTimedDay(
            occurrences.filter((o) => !o.allDay && toDateOnly(parseCalendarDate(o.start)) === dateOnly),
            day,
          )
          return (
            <div
              key={dateOnly}
              className="theme-calendar-timed__col"
              role="gridcell"
              aria-label={format(day, 'EEEE MMM d')}
              onDoubleClick={(e) => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                const y = e.clientY - rect.top
                const minutes = Math.round(((y / rect.height) * 24 * 60) / 15) * 15
                const start = new Date(day)
                start.setHours(0, 0, 0, 0)
                start.setMinutes(minutes)
                onCreateAt(start.toISOString())
              }}
            >
              {Array.from({ length: 24 }, (_, hour) => (
                <div key={hour} className="theme-calendar-timed__hour" />
              ))}
              {packed.map((item) => (
                <TimedBlock
                  key={item.occurrence.id}
                  item={item}
                  selected={selectedOccurrenceKey === item.occurrence.id}
                  onOpen={() => onOpenOccurrence(item.occurrence)}
                  onMove={(start, end) => onMoveOccurrence(item.occurrence, start, end)}
                  onResize={(end) => onResizeOccurrence(item.occurrence, end)}
                />
              ))}
            </div>
          )
        })}
      </div>
    </ThemeScroll>
  )
}

function TimedBlock({
  item,
  selected,
  onOpen,
  onMove,
  onResize,
}: {
  item: TimedLayoutItem
  selected: boolean
  onOpen: () => void
  onMove: (start: string, end: string) => void
  onResize: (end: string) => void
}) {
  const o = item.occurrence
  return (
    <button
      type="button"
      className={['theme-calendar-timed__block', selected ? 'theme-calendar-chip--selected' : '']
        .filter(Boolean)
        .join(' ')}
      style={{
        ['--cal-top' as string]: `${item.topPct}%`,
        ['--cal-height' as string]: `${item.heightPct}%`,
        ['--cal-col' as string]: String(item.column),
        ['--cal-cols' as string]: String(item.columnCount),
        background: o.color,
      }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/cal-event', o.id)
        e.dataTransfer.setData('text/cal-start', o.start)
        e.dataTransfer.setData('text/cal-end', o.end)
      }}
      onDragEnd={(e) => {
        const parent = (e.target as HTMLElement).closest('.theme-calendar-timed__col')
        if (!parent) return
        const rect = parent.getBoundingClientRect()
        const y = Math.min(Math.max(e.clientY - rect.top, 0), rect.height)
        const minutes = Math.round(((y / rect.height) * 24 * 60) / 15) * 15
        const day = parseCalendarDate(o.start)
        const start = new Date(day)
        start.setHours(0, 0, 0, 0)
        start.setMinutes(minutes)
        const duration =
          parseCalendarDate(o.end).getTime() - parseCalendarDate(o.start).getTime()
        const end = new Date(start.getTime() + Math.max(duration, 15 * 60_000))
        onMove(start.toISOString(), end.toISOString())
      }}
      onClick={onOpen}
    >
      <span className="font-medium">{o.title}</span>
      <span
        className="theme-calendar-timed__block-resize"
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          const onMoveMove = (ev: MouseEvent) => {
            const parent = (e.target as HTMLElement).closest('.theme-calendar-timed__col')
            if (!parent) return
            const rect = parent.getBoundingClientRect()
            const y = Math.min(Math.max(ev.clientY - rect.top, 0), rect.height)
            const minutes = Math.round(((y / rect.height) * 24 * 60) / 15) * 15
            const end = new Date(parseCalendarDate(o.start))
            end.setHours(0, 0, 0, 0)
            end.setMinutes(Math.max(minutes, 15))
            if (end <= parseCalendarDate(o.start)) return
            onResize(end.toISOString())
          }
          const onUp = () => {
            window.removeEventListener('mousemove', onMoveMove)
            window.removeEventListener('mouseup', onUp)
          }
          window.addEventListener('mousemove', onMoveMove)
          window.addEventListener('mouseup', onUp)
        }}
      />
    </button>
  )
}
