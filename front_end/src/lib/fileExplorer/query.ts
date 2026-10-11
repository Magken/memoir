import { childrenOf } from './path'
import type {
  DriveEntry,
  DriveLocation,
  DriveMimeGroup,
  DriveSortDir,
  DriveSortKey,
} from './types'

export type DriveQuery = {
  location: DriveLocation
  search: string
  mimeFilters: readonly DriveMimeGroup[]
  starredOnly: boolean
  sortKey: DriveSortKey
  sortDir: DriveSortDir
}

function matchesSearch(entry: DriveEntry, search: string): boolean {
  const q = search.trim().toLowerCase()
  if (!q) return true
  if (entry.name.toLowerCase().includes(q)) return true
  if (entry.tags?.some((t) => t.toLowerCase().includes(q))) return true
  return false
}

function baseEntries(
  entries: readonly DriveEntry[],
  location: DriveLocation,
): DriveEntry[] {
  if (location.type === 'starred') {
    return entries.filter((e) => e.starred)
  }
  if (location.type === 'recent') {
    return [...entries]
      .filter((e) => e.kind === 'file')
      .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
      .slice(0, 40)
  }
  if (location.type === 'shared') {
    return entries.filter((e) => e.tags?.includes('__shared'))
  }
  if (location.type === 'trash') {
    return entries.filter((e) => e.tags?.includes('__trash'))
  }
  return childrenOf(entries, location.folderId)
}

export function queryEntries(
  entries: readonly DriveEntry[],
  query: DriveQuery,
): DriveEntry[] {
  const searching = query.search.trim().length > 0
  let list = searching
    ? entries.filter((e) => matchesSearch(e, query.search))
    : baseEntries(entries, query.location)

  if (query.starredOnly) {
    list = list.filter((e) => e.starred)
  }
  if (query.mimeFilters.length > 0) {
    list = list.filter(
      (e) => e.kind === 'folder' || query.mimeFilters.includes(e.mimeGroup),
    )
  }

  const dir = query.sortDir === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
    switch (query.sortKey) {
      case 'modified':
        return a.modifiedAt.localeCompare(b.modifiedAt) * dir
      case 'size':
        return ((a.sizeBytes ?? 0) - (b.sizeBytes ?? 0)) * dir
      case 'type':
        return a.mimeGroup.localeCompare(b.mimeGroup) * dir || a.name.localeCompare(b.name) * dir
      case 'name':
      default:
        return a.name.localeCompare(b.name) * dir
    }
  })
}

export function formatBytes(size?: number): string {
  if (size == null || !Number.isFinite(size)) return '—'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function formatModified(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}
