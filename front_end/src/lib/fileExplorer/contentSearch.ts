import type { DriveEntry } from './types'

export type DriveContentHit = {
  entryId: string
  entryName: string
  line: number
  preview: string
}

const HIT_CAP = 80

export function searchDriveNames(
  entries: readonly DriveEntry[],
  query: string,
): DriveEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return entries.filter((e) => {
    if (e.name.toLowerCase().includes(q)) return true
    return e.tags?.some((t) => t.toLowerCase().includes(q)) ?? false
  })
}

export function searchDriveContent(
  entries: readonly DriveEntry[],
  query: string,
): DriveContentHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const hits: DriveContentHit[] = []
  for (const entry of entries) {
    if (entry.kind !== 'file' || entry.content == null) continue
    const lines = entry.content.split(/\r?\n/)
    for (let i = 0; i < lines.length; i += 1) {
      if (!lines[i].toLowerCase().includes(q)) continue
      hits.push({
        entryId: entry.id,
        entryName: entry.name,
        line: i + 1,
        preview: lines[i].trim().slice(0, 120),
      })
      if (hits.length >= HIT_CAP) return hits
    }
  }
  return hits
}
