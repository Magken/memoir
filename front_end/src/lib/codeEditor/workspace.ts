import { languageFromPath } from './languageFromPath'

export type CodeFile = {
  id: string
  path: string
  language: string
  /** Last saved content */
  content: string
  /** Working buffer (may differ from content when dirty) */
  buffer: string
}

export type CodeWorkspace = {
  files: CodeFile[]
  /** Empty folders (parents implied by file paths are also shown) */
  folders: string[]
  openIds: string[]
  activeId: string | null
}

export type TreeFolderNode = {
  kind: 'folder'
  path: string
  name: string
  children: TreeNode[]
}

export type TreeFileNode = {
  kind: 'file'
  file: CodeFile
  name: string
}

export type TreeNode = TreeFolderNode | TreeFileNode

export function isDirty(file: CodeFile): boolean {
  return file.buffer !== file.content
}

export function fileById(files: readonly CodeFile[], id: string): CodeFile | undefined {
  return files.find((f) => f.id === id)
}

export function normalizePath(path: string): string {
  return path
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '')
}

export function basename(path: string): string {
  const n = normalizePath(path)
  return n.split('/').pop() ?? n
}

export function dirname(path: string): string {
  const n = normalizePath(path)
  const i = n.lastIndexOf('/')
  return i === -1 ? '' : n.slice(0, i)
}

export function createFile(path: string, content = ''): CodeFile {
  const normalized = normalizePath(path)
  const id = `file-${normalized.replace(/[^\w.-]+/g, '-')}-${Math.random().toString(36).slice(2, 8)}`
  return {
    id,
    path: normalized,
    language: languageFromPath(normalized),
    content,
    buffer: content,
  }
}

/** All folder paths implied by files + explicit empty folders. */
export function allFolderPaths(
  files: readonly CodeFile[],
  folders: readonly string[] = [],
): string[] {
  const set = new Set<string>()
  for (const folder of folders) {
    const n = normalizePath(folder)
    if (!n) continue
    const parts = n.split('/')
    for (let i = 1; i <= parts.length; i++) {
      set.add(parts.slice(0, i).join('/'))
    }
  }
  for (const file of files) {
    const parts = normalizePath(file.path).split('/')
    for (let i = 1; i < parts.length; i++) {
      set.add(parts.slice(0, i).join('/'))
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

export function pathExists(
  files: readonly CodeFile[],
  folders: readonly string[],
  path: string,
): boolean {
  const n = normalizePath(path)
  if (!n) return false
  if (files.some((f) => normalizePath(f.path) === n)) return true
  return allFolderPaths(files, folders).includes(n)
}

export function addFolder(folders: readonly string[], path: string): string[] {
  const n = normalizePath(path)
  if (!n) return [...folders]
  const next = new Set(folders.map(normalizePath))
  const parts = n.split('/')
  for (let i = 1; i <= parts.length; i++) {
    next.add(parts.slice(0, i).join('/'))
  }
  return [...next].sort((a, b) => a.localeCompare(b))
}

export function removeFolderSubtree(
  files: readonly CodeFile[],
  folders: readonly string[],
  folderPath: string,
): { files: CodeFile[]; folders: string[] } {
  const prefix = `${normalizePath(folderPath)}/`
  const root = normalizePath(folderPath)
  return {
    files: files.filter((f) => {
      const p = normalizePath(f.path)
      return p !== root && !p.startsWith(prefix)
    }),
    folders: folders
      .map(normalizePath)
      .filter((p) => p !== root && !p.startsWith(prefix)),
  }
}

function sortNodes(a: TreeNode, b: TreeNode): number {
  if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
  const an = a.kind === 'folder' ? a.name : a.name
  const bn = b.kind === 'folder' ? b.name : b.name
  return an.localeCompare(bn)
}

/** Nested explorer tree from files + empty folders. */
export function buildFileTree(
  files: readonly CodeFile[],
  folders: readonly string[] = [],
): TreeNode[] {
  type MutableFolder = {
    kind: 'folder'
    path: string
    name: string
    children: Map<string, MutableFolder | TreeFileNode>
  }

  const rootChildren = new Map<string, MutableFolder | TreeFileNode>()

  function ensureFolder(parent: Map<string, MutableFolder | TreeFileNode>, path: string): MutableFolder {
    const name = basename(path)
    const existing = parent.get(name)
    if (existing && existing.kind === 'folder') return existing
    const node: MutableFolder = {
      kind: 'folder',
      path,
      name,
      children: new Map(),
    }
    parent.set(name, node)
    return node
  }

  for (const folderPath of allFolderPaths(files, folders)) {
    const parts = folderPath.split('/')
    let map = rootChildren
    for (let i = 0; i < parts.length; i++) {
      const path = parts.slice(0, i + 1).join('/')
      const folder = ensureFolder(map, path)
      map = folder.children
    }
  }

  for (const file of files) {
    const parts = normalizePath(file.path).split('/')
    let map = rootChildren
    for (let i = 0; i < parts.length - 1; i++) {
      const path = parts.slice(0, i + 1).join('/')
      const folder = ensureFolder(map, path)
      map = folder.children
    }
    const name = parts[parts.length - 1] ?? file.path
    map.set(name, { kind: 'file', file, name })
  }

  function freeze(map: Map<string, MutableFolder | TreeFileNode>): TreeNode[] {
    const nodes: TreeNode[] = []
    for (const child of map.values()) {
      if (child.kind === 'folder') {
        nodes.push({
          kind: 'folder',
          path: child.path,
          name: child.name,
          children: freeze(child.children),
        })
      } else {
        nodes.push(child)
      }
    }
    return nodes.sort(sortNodes)
  }

  return freeze(rootChildren)
}

export function defaultPathInFolder(folderPath: string | null, kind: 'file' | 'folder'): string {
  const base = folderPath ? `${normalizePath(folderPath)}/` : ''
  return kind === 'file' ? `${base}untitled.js` : `${base}new-folder`
}

export function workspacePathForUpload(fileName: string, folderPrefix: string): string {
  const leaf = fileName.replace(/\\/g, '/').split('/').pop() ?? fileName
  const folder = normalizePath(folderPrefix)
  return folder ? `${folder}/${leaf}` : normalizePath(leaf)
}

export function uniqueWorkspacePath(
  files: readonly { path: string }[],
  folders: readonly string[],
  path: string,
): string {
  const base = normalizePath(path)
  if (!pathExists(files as readonly CodeFile[], folders, base)) return base

  const slash = base.lastIndexOf('/')
  const dir = slash >= 0 ? base.slice(0, slash + 1) : ''
  const name = slash >= 0 ? base.slice(slash + 1) : base
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''

  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${dir}${stem}-${index}${ext}`
    if (!pathExists(files as readonly CodeFile[], folders, candidate)) return candidate
  }

  return `${dir}${stem}-${Date.now()}${ext}`
}

/** Move a file to another folder by updating its path (Monaco model sync is separate). */
export function relocateWorkspaceFile(
  files: readonly CodeFile[],
  folders: readonly string[],
  fileId: string,
  targetFolder: string | null,
): { files: CodeFile[]; folders: string[]; oldPath: string; newPath: string } | null {
  const file = fileById(files, fileId)
  if (!file) return null

  const fileName = basename(file.path)
  const folder = targetFolder ? normalizePath(targetFolder) : ''
  const without = files.filter((entry) => entry.id !== fileId)
  let nextPath = folder ? `${folder}/${fileName}` : fileName
  const oldPath = normalizePath(file.path)

  if (oldPath === normalizePath(nextPath)) return null

  nextPath = uniqueWorkspacePath(without, folders, nextPath)

  const nextFiles = files.map((entry) =>
    entry.id === fileId
      ? { ...entry, path: nextPath, language: languageFromPath(nextPath) }
      : entry,
  )
  const parent = dirname(nextPath)
  const nextFolders = parent ? addFolder(folders, parent) : [...folders]

  return { files: nextFiles, folders: nextFolders, oldPath, newPath: nextPath }
}
