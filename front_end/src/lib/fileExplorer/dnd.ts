import { isDescendantOf } from './path'
import type { DriveEntry } from './types'

export const FILE_EXPLORER_ENTRY_MIME = 'application/x-file-explorer-entry-id'

export function encodeDragEntryIds(ids: readonly string[]): string {
  return JSON.stringify([...ids])
}

export function readDragEntryIds(dataTransfer: DataTransfer): string[] {
  const raw = dataTransfer.getData(FILE_EXPLORER_ENTRY_MIME)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) return parsed.filter((id): id is string => typeof id === 'string')
  } catch {
    if (raw) return [raw]
  }
  return []
}

export function canDropOnto(
  entries: readonly DriveEntry[],
  draggedIds: readonly string[],
  targetFolderId: string | null,
): boolean {
  if (draggedIds.length === 0) return false
  for (const id of draggedIds) {
    if (targetFolderId === id) return false
    if (targetFolderId && isDescendantOf(entries, targetFolderId, id)) return false
    const entry = entries.find((e) => e.id === id)
    if (!entry) continue
    if (entry.parentId === targetFolderId) return false
  }
  return true
}
