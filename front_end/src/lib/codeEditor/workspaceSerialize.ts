import type { CodeEditorPayload } from '../editorContext/types'
import { languageFromPath } from './languageFromPath'
import type { CodeFile, CodeWorkspace } from './workspace'
import { createFile, normalizePath } from './workspace'

function fileByPath(files: readonly CodeFile[], path: string): CodeFile | undefined {
  const n = normalizePath(path)
  return files.find((f) => f.path === n)
}

/** Resolve payload activeId/openIds (path-shaped) onto internal file ids. */
function resolveFileId(files: readonly CodeFile[], ref: string | null | undefined): string | null {
  if (!ref) return null
  const byId = files.find((f) => f.id === ref)
  if (byId) return byId.id
  const byPath = fileByPath(files, ref)
  return byPath?.id ?? null
}

export function serializeCodeWorkspace(
  workspace: CodeWorkspace,
  title?: string,
): CodeEditorPayload {
  const pathById = new Map(workspace.files.map((f) => [f.id, f.path]))
  const activePath = workspace.activeId ? pathById.get(workspace.activeId) ?? null : null
  const openPaths = workspace.openIds
    .map((id) => pathById.get(id))
    .filter((p): p is string => Boolean(p))

  return {
    title,
    files: workspace.files.map((file) => ({
      path: file.path,
      language: file.language,
      content: file.buffer,
    })),
    folders: [...workspace.folders],
    openIds: openPaths,
    activeId: activePath,
  }
}

export function deserializeCodeWorkspace(payload: CodeEditorPayload): CodeWorkspace {
  const files: CodeFile[] = payload.files.map((entry) => {
    const file = createFile(entry.path, entry.content)
    return {
      ...file,
      language: entry.language || languageFromPath(entry.path),
      content: entry.content,
      buffer: entry.content,
    }
  })

  const folders = (payload.folders ?? []).map(normalizePath).filter(Boolean)
  const openIds = (payload.openIds ?? [])
    .map((ref) => resolveFileId(files, ref))
    .filter((id): id is string => Boolean(id))
  const activeId =
    resolveFileId(files, payload.activeId) ??
    openIds[0] ??
    files[0]?.id ??
    null

  return {
    files,
    folders,
    openIds: openIds.length ? openIds : files[0] ? [files[0].id] : [],
    activeId,
  }
}
