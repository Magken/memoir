import { childrenOf, copySiblingName, newId, uniqueChildName } from './path'
import { mimeGroupFromName } from './previewKind'
import { collectSubtreeIds } from './tree'
import type { DriveEntry, DriveLibrary } from './types'

export function createFolder(
  library: DriveLibrary,
  parentId: string | null,
  name: string,
): DriveLibrary {
  const siblings = childrenOf(library.entries, parentId)
  const entry: DriveEntry = {
    id: newId('folder'),
    parentId,
    name: uniqueChildName(siblings, name.trim() || 'Untitled folder'),
    kind: 'folder',
    mimeGroup: 'folder',
    modifiedAt: new Date().toISOString(),
  }
  return { entries: [...library.entries, entry] }
}

export function renameEntry(
  library: DriveLibrary,
  id: string,
  name: string,
): DriveLibrary {
  const entry = library.entries.find((e) => e.id === id)
  if (!entry) return library
  const siblings = childrenOf(library.entries, entry.parentId).filter((e) => e.id !== id)
  const nextName = uniqueChildName(siblings, name.trim() || entry.name)
  return {
    entries: library.entries.map((e) =>
      e.id === id ? { ...e, name: nextName, modifiedAt: new Date().toISOString() } : e,
    ),
  }
}

export function deleteEntries(library: DriveLibrary, ids: readonly string[]): DriveLibrary {
  const remove = new Set<string>()
  for (const id of ids) {
    for (const sub of collectSubtreeIds(library.entries, id)) remove.add(sub)
  }
  return { entries: library.entries.filter((e) => !remove.has(e.id)) }
}

export function toggleStarred(library: DriveLibrary, ids: readonly string[]): DriveLibrary {
  const set = new Set(ids)
  return {
    entries: library.entries.map((e) =>
      set.has(e.id) ? { ...e, starred: !e.starred, modifiedAt: new Date().toISOString() } : e,
    ),
  }
}

export function moveEntries(
  library: DriveLibrary,
  ids: readonly string[],
  targetParentId: string | null,
): DriveLibrary {
  let entries = [...library.entries]
  const now = new Date().toISOString()
  for (const id of ids) {
    const entry = entries.find((e) => e.id === id)
    if (!entry) continue
    if (targetParentId === id) continue
    const siblings = childrenOf(entries, targetParentId).filter((s) => s.id !== id)
    const name = uniqueChildName(siblings, entry.name)
    entries = entries.map((e) =>
      e.id === id ? { ...e, parentId: targetParentId, name, modifiedAt: now } : e,
    )
  }
  return { entries }
}

/** Duplicate entries into the same parent folder with a ` copy` name suffix. */
export function createCopyEntries(
  library: DriveLibrary,
  ids: readonly string[],
): DriveLibrary {
  let entries = [...library.entries]
  const now = new Date().toISOString()
  const clones: DriveEntry[] = []

  for (const id of ids) {
    const src = entries.find((e) => e.id === id)
    if (!src) continue
    const siblings = childrenOf(entries, src.parentId).concat(
      clones.filter((c) => c.parentId === src.parentId),
    )
    const rootName = uniqueChildName(siblings, copySiblingName(src.name))
    const subtree = collectSubtreeIds(entries, src.id)
    const idMap = new Map<string, string>()
    for (const oldId of subtree) {
      idMap.set(oldId, newId(oldId.startsWith('folder') ? 'folder' : 'file'))
    }

    for (const oldId of subtree) {
      const node = entries.find((e) => e.id === oldId)
      if (!node) continue
      const isRoot = oldId === src.id
      const parentId = isRoot
        ? src.parentId
        : node.parentId
          ? (idMap.get(node.parentId) ?? src.parentId)
          : src.parentId
      clones.push({
        ...node,
        id: idMap.get(oldId)!,
        parentId,
        name: isRoot ? rootName : node.name,
        modifiedAt: now,
        tags: node.tags ? [...node.tags] : undefined,
      })
    }
  }

  return { entries: [...entries, ...clones] }
}

export async function importBrowserFiles(
  library: DriveLibrary,
  files: readonly File[],
  parentId: string | null,
): Promise<DriveLibrary> {
  let entries = [...library.entries]
  const now = new Date().toISOString()
  for (const file of files) {
    const siblings = childrenOf(entries, parentId)
    const name = uniqueChildName(siblings, file.name)
    const mimeGroup = mimeGroupFromName(name)
    const isText =
      mimeGroup === 'text' ||
      mimeGroup === 'markdown' ||
      mimeGroup === 'code' ||
      mimeGroup === 'csv' ||
      mimeGroup === 'json' ||
      mimeGroup === 'mermaid' ||
      mimeGroup === 'force' ||
      mimeGroup === 'draw' ||
      (file.type.startsWith('text/') ?? false)

    let content: string | undefined
    let objectUrl: string | undefined
    if (isText) {
      content = await file.text()
    } else {
      objectUrl = URL.createObjectURL(file)
    }

    entries.push({
      id: newId('file'),
      parentId,
      name,
      kind: 'file',
      mimeGroup,
      mime: file.type || undefined,
      sizeBytes: file.size,
      modifiedAt: now,
      content,
      objectUrl,
    })
  }
  return { entries }
}
