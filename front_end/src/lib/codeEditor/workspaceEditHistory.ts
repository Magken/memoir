/** File-aware workspace undo — activate the path that changed. */

export type WorkspaceEditEntry =
  | { kind: 'edit'; path: string; before: string; after: string }
  | { kind: 'create'; path: string; after: string }
  | { kind: 'delete'; path: string; before: string }
  | { kind: 'rename'; from: string; to: string }

const DEFAULT_CAP = 50

export type WorkspaceEditStacks = {
  undo: WorkspaceEditEntry[]
  redo: WorkspaceEditEntry[]
}

export function emptyWorkspaceEditStacks(): WorkspaceEditStacks {
  return { undo: [], redo: [] }
}

export function pushWorkspaceEdit(
  stacks: WorkspaceEditStacks,
  entry: WorkspaceEditEntry,
  cap = DEFAULT_CAP,
): WorkspaceEditStacks {
  const undo = [...stacks.undo, entry]
  while (undo.length > cap) undo.shift()
  return { undo, redo: [] }
}

export function coalesceEdit(
  stacks: WorkspaceEditStacks,
  path: string,
  before: string,
  after: string,
  cap = DEFAULT_CAP,
): WorkspaceEditStacks {
  if (before === after) return stacks
  const last = stacks.undo[stacks.undo.length - 1]
  if (last?.kind === 'edit' && last.path === path) {
    const nextLast = { ...last, after }
    const undo = stacks.undo.slice(0, -1)
    undo.push(nextLast)
    return { undo, redo: [] }
  }
  return pushWorkspaceEdit(stacks, { kind: 'edit', path, before, after }, cap)
}

export function popUndo(
  stacks: WorkspaceEditStacks,
): { stacks: WorkspaceEditStacks; entry: WorkspaceEditEntry } | null {
  if (!stacks.undo.length) return null
  const entry = stacks.undo[stacks.undo.length - 1]!
  return {
    stacks: { undo: stacks.undo.slice(0, -1), redo: [...stacks.redo, entry] },
    entry,
  }
}

export function popRedo(
  stacks: WorkspaceEditStacks,
): { stacks: WorkspaceEditStacks; entry: WorkspaceEditEntry } | null {
  if (!stacks.redo.length) return null
  const entry = stacks.redo[stacks.redo.length - 1]!
  return {
    stacks: { undo: [...stacks.undo, entry], redo: stacks.redo.slice(0, -1) },
    entry,
  }
}

export function entryPath(entry: WorkspaceEditEntry): string {
  if (entry.kind === 'rename') return entry.from
  return entry.path
}

export function inverseEntry(entry: WorkspaceEditEntry): WorkspaceEditEntry {
  if (entry.kind === 'edit') return { kind: 'edit', path: entry.path, before: entry.after, after: entry.before }
  if (entry.kind === 'create') return { kind: 'delete', path: entry.path, before: entry.after }
  if (entry.kind === 'delete') return { kind: 'create', path: entry.path, after: entry.before }
  return { kind: 'rename', from: entry.to, to: entry.from }
}
