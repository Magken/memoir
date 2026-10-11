import type { CalOccurrence, CalTask, CalTag } from './types'
import { parseCalendarDate } from './time'

export function filterOccurrences(
  occurrences: readonly CalOccurrence[],
  opts: { searchQuery?: string; activeTagIds?: string[]; tags?: readonly CalTag[] },
): CalOccurrence[] {
  const q = opts.searchQuery?.trim().toLowerCase() ?? ''
  const tags = new Set(opts.activeTagIds ?? [])
  return occurrences.filter((o) => {
    if (tags.size > 0 && !o.tagIds.some((id) => tags.has(id))) return false
    if (!q) return true
    const hay = `${o.title} ${o.description ?? ''} ${o.location ?? ''}`.toLowerCase()
    return hay.includes(q)
  })
}

export function filterTasks(
  tasks: readonly CalTask[],
  opts: { searchQuery?: string; activeTagIds?: string[]; listId?: string | null },
): CalTask[] {
  const q = opts.searchQuery?.trim().toLowerCase() ?? ''
  const tags = new Set(opts.activeTagIds ?? [])
  return tasks.filter((t) => {
    if (opts.listId && t.listId !== opts.listId) return false
    if (tags.size > 0 && !(t.tagIds ?? []).some((id) => tags.has(id))) return false
    if (!q) return true
    return `${t.title} ${t.notes ?? ''}`.toLowerCase().includes(q)
  })
}

export function groupTasks(tasks: readonly CalTask[], today: string) {
  const overdue: CalTask[] = []
  const todayList: CalTask[] = []
  const upcoming: CalTask[] = []
  const completed: CalTask[] = []
  const todayTime = parseCalendarDate(today).getTime()
  for (const task of tasks) {
    if (task.completed) {
      completed.push(task)
      continue
    }
    if (!task.dueAt) {
      upcoming.push(task)
      continue
    }
    const due = parseCalendarDate(task.dueAt).getTime()
    if (due < todayTime) overdue.push(task)
    else if (due === todayTime || task.dueAt.startsWith(today)) todayList.push(task)
    else upcoming.push(task)
  }
  return { overdue, today: todayList, upcoming, completed }
}

export function searchJumpTargets(
  occurrences: readonly CalOccurrence[],
  tasks: readonly CalTask[],
  query: string,
): Array<{ kind: 'event' | 'task'; id: string; label: string; anchorDate: string }> {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const hits: Array<{ kind: 'event' | 'task'; id: string; label: string; anchorDate: string }> = []
  for (const o of occurrences) {
    if (o.title.toLowerCase().includes(q)) {
      hits.push({
        kind: 'event',
        id: o.eventId,
        label: o.title,
        anchorDate: o.start.slice(0, 10),
      })
    }
  }
  for (const t of tasks) {
    if (t.title.toLowerCase().includes(q)) {
      hits.push({
        kind: 'task',
        id: t.id,
        label: t.title,
        anchorDate: (t.dueAt ?? '').slice(0, 10) || new Date().toISOString().slice(0, 10),
      })
    }
  }
  return hits.slice(0, 20)
}
