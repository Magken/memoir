import { childrenOf, isDescendantOf, newId, uniqueChildName } from './path'
import { collectSubtreeIds } from './tree'
import type { DriveClipboard, DriveEntry, DriveLibrary } from './types'

export function setClipboard(
  mode: DriveClipboard['mode'],
  entryIds: string[],
): DriveClipboard {
  return { mode, entryIds: [...new Set(entryIds)] }
}

export function pasteClipboard(
  library: DriveLibrary,
  clipboard: DriveClipboard | null,
  targetParentId: string | null,
): { library: DriveLibrary; clipboard: DriveClipboard | null } | null {
  if (!clipboard || clipboard.entryIds.length === 0) return null

  let entries = [...library.entries]
  const siblings = childrenOf(entries, targetParentId)
  const now = new Date().toISOString()

  if (clipboard.mode === 'cut') {
    for (const id of clipboard.entryIds) {
      const entry = entries.find((e) => e.id === id)
      if (!entry) continue
      if (targetParentId && (id === targetParentId || isDescendantOf(entries, targetParentId, id))) {
        continue
      }
      const name = uniqueChildName(
        siblings.filter((s) => s.id !== id),
        entry.name,
      )
      entries = entries.map((e) =>
        e.id === id
          ? { ...e, parentId: targetParentId, name, modifiedAt: now }
          : e,
      )
    }
    return { library: { entries }, clipboard: null }
  }

  const idMap = new Map<string, string>()
  const roots = clipboard.entryIds
    .map((id) => entries.find((e) => e.id === id))
    .filter(Boolean) as DriveEntry[]

  for (const root of roots) {
    const subtree = collectSubtreeIds(entries, root.id)
    for (const oldId of subtree) {
      idMap.set(oldId, newId(oldId.startsWith('folder') ? 'folder' : 'file'))
    }
  }

  const clones: DriveEntry[] = []
  for (const root of roots) {
    const subtree = collectSubtreeIds(entries, root.id)
    for (const oldId of subtree) {
      const src = entries.find((e) => e.id === oldId)
      if (!src) continue
      const isRoot = roots.some((r) => r.id === oldId)
      const parentId = isRoot
        ? targetParentId
        : src.parentId
          ? (idMap.get(src.parentId) ?? targetParentId)
          : targetParentId
      const name = isRoot ? uniqueChildName(siblings.concat(clones.filter((c) => c.parentId === targetParentId)), src.name) : src.name
      clones.push({
        ...src,
        id: idMap.get(oldId)!,
        parentId,
        name,
        modifiedAt: now,
        tags: src.tags ? [...src.tags] : undefined,
      })
    }
  }

  return {
    library: { entries: [...entries, ...clones] },
    clipboard,
  }
}
