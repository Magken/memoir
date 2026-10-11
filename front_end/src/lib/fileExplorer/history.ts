import type { DriveLibrary } from './types'

export type DriveHistory = {
  past: DriveLibrary[]
  present: DriveLibrary
  future: DriveLibrary[]
}

function cloneLibrary(lib: DriveLibrary): DriveLibrary {
  return {
    entries: lib.entries.map((e) => ({
      ...e,
      tags: e.tags ? [...e.tags] : undefined,
    })),
  }
}

export function createHistory(present: DriveLibrary): DriveHistory {
  return { past: [], present: cloneLibrary(present), future: [] }
}

export function pushHistory(history: DriveHistory, next: DriveLibrary): DriveHistory {
  return {
    past: [...history.past, cloneLibrary(history.present)].slice(-40),
    present: cloneLibrary(next),
    future: [],
  }
}

export function undoHistory(history: DriveHistory): DriveHistory {
  if (history.past.length === 0) return history
  const past = [...history.past]
  const previous = past.pop()!
  return {
    past,
    present: previous,
    future: [cloneLibrary(history.present), ...history.future],
  }
}

export function redoHistory(history: DriveHistory): DriveHistory {
  if (history.future.length === 0) return history
  const [next, ...rest] = history.future
  return {
    past: [...history.past, cloneLibrary(history.present)],
    present: next,
    future: rest,
  }
}
