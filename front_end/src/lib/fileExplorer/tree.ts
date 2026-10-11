import { childrenOf, entryById } from './path'
import type { DriveEntry, DriveTreeNode } from './types'

export function buildFolderTree(
  entries: readonly DriveEntry[],
  parentId: string | null = null,
): DriveTreeNode[] {
  const folders = childrenOf(entries, parentId)
    .filter((e) => e.kind === 'folder')
    .sort((a, b) => a.name.localeCompare(b.name))
  return folders.map((entry) => ({
    entry,
    children: buildFolderTree(entries, entry.id),
  }))
}

export function collectSubtreeIds(
  entries: readonly DriveEntry[],
  rootId: string,
): string[] {
  const ids = [rootId]
  const stack = [rootId]
  while (stack.length) {
    const id = stack.pop()!
    for (const child of childrenOf(entries, id)) {
      ids.push(child.id)
      if (child.kind === 'folder') stack.push(child.id)
    }
  }
  return ids
}

export function folderOptions(
  entries: readonly DriveEntry[],
): { value: string; label: string }[] {
  const folders = entries.filter((e) => e.kind === 'folder')
  const options = [{ value: '', label: 'My files (root)' }]
  for (const folder of folders.sort((a, b) => a.name.localeCompare(b.name))) {
    const chain = []
    let current: DriveEntry | undefined = folder
    const guard = new Set<string>()
    while (current && !guard.has(current.id)) {
      guard.add(current.id)
      chain.unshift(current.name)
      current = entryById(entries, current.parentId)
    }
    options.push({ value: folder.id, label: chain.join(' / ') })
  }
  return options
}
