import { useCallback, useMemo, useRef, useState } from 'react'
import { Calendar, CalendarEmbed, type CalendarHandle } from '../Calendar'
import { EditorContextDemoBar } from '../editorContextParts/EditorContextDemoBar'
import { createCalendarSeed, createCalendarStressSeed } from '../../lib/calendar'
import { CALENDAR_IMPLEMENTED_ACTION_IDS } from '../../lib/editorCatalog/calendar/actions'
import { EditorActionSpineLab } from './EditorActionSpineLab'
import { EditorFeatureTable } from './EditorFeatureTable'

const SCENARIOS = [
  { id: 'week', label: 'Dense week' },
  { id: 'month', label: 'Month' },
  { id: 'tasks', label: 'Tasks view' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'stress', label: 'Stress 200+' },
] as const

export function CalendarShowcase() {
  const runtimeRef = useRef<CalendarHandle>(null)
  const [scenario, setScenario] = useState<string>('week')
  const [compact, setCompact] = useState(false)
  const seed = useMemo(() => createCalendarSeed(), [])
  const stress = useMemo(() => createCalendarStressSeed(220), [])

  const loadScenario = useCallback(
    (id: string) => {
      setScenario(id)
      const base = id === 'stress' ? stress : seed
      const view =
        id === 'month'
          ? 'month'
          : id === 'tasks'
            ? 'tasks'
            : id === 'agenda'
              ? 'agenda'
              : 'week'
      void runtimeRef.current?.loadContext({
        title: base.title,
        timeZone: base.timeZone,
        calendars: base.calendars,
        tags: base.tags,
        events: base.events,
        exceptions: base.exceptions,
        tasks: base.tasks,
        taskLists: base.taskLists,
        view: { ...base.view, view },
        activeCalendarIds: base.calendars.filter((c) => c.visible).map((c) => c.id),
      })
    },
    [seed, stress],
  )

  return (
    <div className="space-y-8">
      <p className="type-body-sm type-muted prose-measure">
        Fixture-only Calendar — Google-like month/week/day/agenda/tasks with drag/resize, recurrence
        exceptions, multi-calendar tags, and a live M-link action spine. No backend. Implemented actions:{' '}
        {CALENDAR_IMPLEMENTED_ACTION_IDS.length}.
      </p>

      <EditorFeatureTable kind="calendar" />
      <EditorContextDemoBar targetKind="calendar" runtimeRef={runtimeRef} />
      <EditorActionSpineLab kind="calendar" runtimeRef={runtimeRef} />

      <div className="space-y-3">
        <p className="type-label">Workbench scenarios</p>
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={[
                'rounded-full border border-[var(--theme-border)] px-3 py-1 type-caption',
                scenario === s.id ? 'bg-[var(--theme-surface-raised)]' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => loadScenario(s.id)}
            >
              {s.label}
            </button>
          ))}
          <button
            type="button"
            className="rounded-full border border-[var(--theme-border)] px-3 py-1 type-caption"
            onClick={() => setCompact((v) => !v)}
          >
            {compact ? 'Full width' : 'Compact'}
          </button>
        </div>
        <Calendar
          ref={runtimeRef}
          variant="showcase"
          compact={compact}
          initialTitle="Showcase calendar"
        />
      </div>

      <div className="space-y-3">
        <p className="type-label">Keyboard / a11y notes</p>
        <ul className="type-caption type-muted list-disc pl-5 space-y-1">
          <li>
            <kbd>t</kbd> Today · <kbd>c</kbd> Create · arrows shift range · Esc closes modals · Delete
            removes selection
          </li>
          <li>Month/week/day grids expose ARIA grid roles; chips are keyboard-activatable</li>
          <li>Resize/move also available via action spine for assistive flows</li>
        </ul>
      </div>

      <div className="space-y-3">
        <p className="type-label">Embed</p>
        <CalendarEmbed className="max-w-xl" />
      </div>
    </div>
  )
}
