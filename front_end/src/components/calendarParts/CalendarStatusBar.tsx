type CalendarStatusBarProps = {
  rangeLabel: string
  eventCount: number
  taskCount: number
  fixtureLabel?: string
}

export function CalendarStatusBar({
  rangeLabel,
  eventCount,
  taskCount,
  fixtureLabel = 'Fixture source',
}: CalendarStatusBarProps) {
  return (
    <footer className="theme-calendar__status">
      <span>{rangeLabel}</span>
      <span>
        {eventCount} events · {taskCount} tasks
      </span>
      <span>{fixtureLabel}</span>
    </footer>
  )
}
