import type { CalTask } from '../../lib/calendar/types'
import { groupTasks } from '../../lib/calendar/search'
import { todayDateOnly } from '../../lib/calendar/time'
import { Checkbox } from '../Checkbox'
import { ThemeScroll } from '../ThemeScroll'

type CalendarTasksViewProps = {
  tasks: readonly CalTask[]
  onOpenTask: (task: CalTask) => void
  onCompleteTask: (id: string, completed: boolean) => void
}

function Section({
  title,
  tasks,
  onOpenTask,
  onCompleteTask,
}: {
  title: string
  tasks: readonly CalTask[]
  onOpenTask: (task: CalTask) => void
  onCompleteTask: (id: string, completed: boolean) => void
}) {
  if (tasks.length === 0) return null
  return (
    <section className="mb-4">
      <h3 className="type-label mb-2">{title}</h3>
      <ul className="space-y-1">
        {tasks.map((task) => (
          <li key={task.id}>
            <div className="theme-calendar-tasks-view__row">
              <Checkbox
                size="xs"
                checked={task.completed}
                onChange={(checked) => onCompleteTask(task.id, checked)}
              />
              <button type="button" className="type-body-sm text-left truncate flex-1" onClick={() => onOpenTask(task)}>
                {task.title}
              </button>
              {task.dueAt ? (
                <span className="type-caption type-muted shrink-0">{task.dueAt.slice(0, 10)}</span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function CalendarTasksView({ tasks, onOpenTask, onCompleteTask }: CalendarTasksViewProps) {
  const groups = groupTasks(tasks, todayDateOnly())
  return (
    <ThemeScroll rail="nano" className="theme-calendar-tasks-view h-full">
      <Section title="Overdue" tasks={groups.overdue} onOpenTask={onOpenTask} onCompleteTask={onCompleteTask} />
      <Section title="Today" tasks={groups.today} onOpenTask={onOpenTask} onCompleteTask={onCompleteTask} />
      <Section title="Upcoming" tasks={groups.upcoming} onOpenTask={onOpenTask} onCompleteTask={onCompleteTask} />
      <Section title="Completed" tasks={groups.completed.slice(0, 40)} onOpenTask={onOpenTask} onCompleteTask={onCompleteTask} />
    </ThemeScroll>
  )
}
