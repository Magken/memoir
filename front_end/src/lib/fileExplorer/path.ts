import type { DriveEntry } from './types'

export function splitName(name: string): { base: string; ext: string } {
  const trimmed = name.trim()
  const i = trimmed.lastIndexOf('.')
  if (i <= 0 || i === trimmed.length - 1) return { base: trimmed, ext: '' }
  return { base: trimmed.slice(0, i), ext: trimmed.slice(i) }
}

export function uniqueChildName(
  siblings: readonly DriveEntry[],
  desired: string,
): string {
  const taken = new Set(siblings.map((s) => s.name.toLowerCase()))
  if (!taken.has(desired.toLowerCase())) return desired
  const { base, ext } = splitName(desired)
  let n = 1
  while (n < 10_000) {
    const candidate = `${base} (${n})${ext}`
    if (!taken.has(candidate.toLowerCase())) return candidate
    n += 1
  }
  return `${base}-${Date.now()}${ext}`
}

/** `report.md` → `report copy.md` (collision-safe via uniqueChildName). */
export function copySiblingName(name: string): string {
  const { base, ext } = splitName(name)
  return `${base} copy${ext}`
}

export function entryById(
  entries: readonly DriveEntry[],
  id: string | null | undefined,
): DriveEntry | undefined {
  if (!id) return undefined
  return entries.find((e) => e.id === id)
}

export function childrenOf(
  entries: readonly DriveEntry[],
  parentId: string | null,
): DriveEntry[] {
  return entries.filter((e) => e.parentId === parentId)
}

export function ancestorsOf(
  entries: readonly DriveEntry[],
  id: string | null,
): DriveEntry[] {
  const chain: DriveEntry[] = []
  let current = entryById(entries, id)
  const guard = new Set<string>()
  while (current && !guard.has(current.id)) {
    guard.add(current.id)
    chain.unshift(current)
    current = entryById(entries, current.parentId)
  }
  return chain
}

export function pathLabels(
  entries: readonly DriveEntry[],
  folderId: string | null,
): { id: string | null; name: string }[] {
  const root = { id: null as string | null, name: 'My files' }
  if (!folderId) return [root]
  return [root, ...ancestorsOf(entries, folderId).map((e) => ({ id: e.id, name: e.name }))]
}

export function pathString(
  entries: readonly DriveEntry[],
  entryId: string,
): string {
  const entry = entryById(entries, entryId)
  if (!entry) return ''
  const parts = ancestorsOf(entries, entry.parentId).map((e) => e.name)
  parts.push(entry.name)
  return parts.join('/')
}

export function isDescendantOf(
  entries: readonly DriveEntry[],
  entryId: string,
  possibleAncestorId: string,
): boolean {
  let current = entryById(entries, entryId)
  const guard = new Set<string>()
  while (current?.parentId && !guard.has(current.id)) {
    guard.add(current.id)
    if (current.parentId === possibleAncestorId) return true
    current = entryById(entries, current.parentId)
  }
  return false
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 10)}`
}
