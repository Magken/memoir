import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, isSameDay, isSameMonth } from 'date-fns'
import type { WeekStartsOn } from '../../lib/calendar/types'
import { monthGridDays, parseCalendarDate, toDateOnly } from '../../lib/calendar/time'
import { IconButton } from '../IconButton'

type CalendarMiniMonthProps = {
  anchorDate: string
  weekStartsOn: WeekStartsOn
  onSelectDate: (dateOnly: string) => void
  onShiftMonth: (dir: -1 | 1) => void
}

export function CalendarMiniMonth({
  anchorDate,
  weekStartsOn,
  onSelectDate,
  onShiftMonth,
}: CalendarMiniMonthProps) {
  const anchor = parseCalendarDate(anchorDate)
  const days = monthGridDays(anchorDate, weekStartsOn)
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const rotated = [...labels.slice(weekStartsOn), ...labels.slice(0, weekStartsOn)]

  return (
    <div className="theme-calendar-mini">
      <div className="mb-2 flex items-center justify-between gap-2">
        <IconButton
          type="button"
          size="xxs"
          variant="ghost"
          icon={ChevronLeft}
          aria-label="Previous month"
          onClick={() => onShiftMonth(-1)}
        />
        <p className="type-caption">{format(anchor, 'MMM yyyy')}</p>
        <IconButton
          type="button"
          size="xxs"
          variant="ghost"
          icon={ChevronRight}
          aria-label="Next month"
          onClick={() => onShiftMonth(1)}
        />
      </div>
      <div className="theme-calendar-mini__grid mb-1">
        {rotated.map((d, i) => (
          <span key={`${d}-${i}`} className="type-caption type-muted text-center">
            {d}
          </span>
        ))}
      </div>
      <div className="theme-calendar-mini__grid" role="grid" aria-label="Mini month">
        {days.map((day) => {
          const dateOnly = toDateOnly(day)
          const outside = !isSameMonth(day, anchor)
          const selected = isSameDay(day, anchor)
          const today = isSameDay(day, new Date())
          return (
            <button
              key={dateOnly}
              type="button"
              role="gridcell"
              aria-selected={selected}
              className={[
                'theme-calendar-mini__cell',
                outside ? 'theme-calendar-mini__cell--muted' : '',
                today ? 'theme-calendar-mini__cell--today' : '',
                selected ? 'theme-calendar-mini__cell--selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelectDate(dateOnly)}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
