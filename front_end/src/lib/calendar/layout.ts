import type { CalOccurrence, TimedLayoutItem } from './types'
import { minutesBetween, parseCalendarDate, startOfDay } from './time'

const DAY_MINUTES = 24 * 60

function dayOffsetMinutes(iso: string, day: Date): number {
  const start = parseCalendarDate(iso)
  const base = startOfDay(day)
  return Math.max(0, Math.min(DAY_MINUTES, (start.getTime() - base.getTime()) / 60000))
}

/** Pack overlapping timed events into columns for a single day. */
export function packTimedDay(occurrences: readonly CalOccurrence[], day: Date): TimedLayoutItem[] {
  const timed = occurrences
    .filter((o) => !o.allDay)
    .map((o) => {
      const startMin = dayOffsetMinutes(o.start, day)
      const duration = Math.max(15, minutesBetween(o.start, o.end))
      const endMin = Math.min(DAY_MINUTES, startMin + duration)
      return { occurrence: o, startMin, endMin }
    })
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin)

  type Active = { endMin: number; column: number }
  const active: Active[] = []
  const assigned: Array<{ occurrence: CalOccurrence; startMin: number; endMin: number; column: number }> =
    []

  for (const item of timed) {
    for (let i = active.length - 1; i >= 0; i -= 1) {
      if (active[i]!.endMin <= item.startMin) active.splice(i, 1)
    }
    const used = new Set(active.map((a) => a.column))
    let column = 0
    while (used.has(column)) column += 1
    active.push({ endMin: item.endMin, column })
    assigned.push({ ...item, column })
  }

  // Determine cluster column counts
  const result: TimedLayoutItem[] = []
  for (let i = 0; i < assigned.length; i += 1) {
    const item = assigned[i]!
    let clusterMax = item.column + 1
    for (const other of assigned) {
      const overlaps = other.startMin < item.endMin && other.endMin > item.startMin
      if (overlaps) clusterMax = Math.max(clusterMax, other.column + 1)
    }
    result.push({
      occurrence: item.occurrence,
      column: item.column,
      columnCount: clusterMax,
      topPct: (item.startMin / DAY_MINUTES) * 100,
      heightPct: Math.max(1.2, ((item.endMin - item.startMin) / DAY_MINUTES) * 100),
    })
  }
  return result
}

export function monthCellCap<T>(items: readonly T[], cap = 3): { visible: T[]; overflow: number } {
  if (items.length <= cap) return { visible: [...items], overflow: 0 }
  return { visible: items.slice(0, cap), overflow: items.length - cap }
}
