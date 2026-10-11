import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import type { CalendarAccount, CalTag, CalTask } from '../../lib/calendar/types'
import { Checkbox } from '../Checkbox'
import { Chip } from '../Chip'
import { IconButton } from '../IconButton'

type CalendarSidebarProps = {
  calendars: readonly CalendarAccount[]
  tags: readonly CalTag[]
  activeTagIds: readonly string[]
  tasks: readonly CalTask[]
  onToggleCalendar: (id: string) => void
  onToggleTag: (id: string) => void
  onOpenTask: (id: string) => void
  onCompleteTask: (id: string, completed: boolean) => void
  onAddTask: () => void
  miniMonth: ReactNode
}

export function CalendarSidebar({
  calendars,
  tags,
  activeTagIds,
  tasks,
  onToggleCalendar,
  onToggleTag,
  onOpenTask,
  onCompleteTask,
  onAddTask,
  miniMonth,
}: CalendarSidebarProps) {
  const openTasks = tasks.filter((t) => !t.completed).slice(0, 8)
  return (
    <aside className="theme-calendar__sidebar theme-calendar__sidebar--force">
      {miniMonth}
      <div className="theme-calendar-cal-list">
        <p className="type-label mb-2">My calendars</p>
        {calendars.map((cal) => (
          <div key={cal.id} className="theme-calendar-cal-list__row">
            <Checkbox
              size="xs"
              checked={cal.visible}
              onChange={() => onToggleCalendar(cal.id)}
              label={cal.name}
            />
          </div>
        ))}
      </div>
      <div className="theme-calendar-tag-list">
        <p className="type-label mb-2">Tags</p>
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Chip
              key={tag.id}
              size="xs"
              selected={activeTagIds.includes(tag.id)}
              onClick={() => onToggleTag(tag.id)}
            >
              {tag.name}
            </Chip>
          ))}
        </div>
      </div>
      <div className="theme-calendar-task-panel min-h-0 flex-1 overflow-auto">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="type-label">Tasks</p>
          <IconButton
            type="button"
            size="xxs"
            variant="ghost"
            icon={Plus}
            aria-label="Add task"
            onClick={onAddTask}
          />
        </div>
        <ul className="space-y-1">
          {openTasks.map((task) => (
            <li key={task.id} className="flex items-start gap-2">
              <Checkbox
                size="xs"
                checked={task.completed}
                onChange={(checked) => onCompleteTask(task.id, checked)}
              />
              <button
                type="button"
                className="type-caption text-left truncate"
                onClick={() => onOpenTask(task.id)}
              >
                {task.title}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
