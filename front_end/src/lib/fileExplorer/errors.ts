import { DataApiError, toUserMessage } from '../dataApi'
import { childrenOf } from './path'
import type { DriveEntry } from './types'

/** True when another sibling already uses this name (case-insensitive). */
export function siblingNameTaken(
  entries: readonly DriveEntry[],
  parentId: string | null,
  name: string,
  excludeId?: string | null,
): boolean {
  const desired = name.trim().toLowerCase()
  if (!desired) return false
  return childrenOf(entries, parentId).some(
    (e) => e.id !== excludeId && e.name.toLowerCase() === desired,
  )
}

/** User-facing copy for FileExplorer / fileApi failures (delegates to dataApi.toUserMessage). */
export function formatFileExplorerError(err: unknown): string {
  if (err instanceof DataApiError) {
    const detail = (err.detail ?? '').toLowerCase()
    const msg = (err.message ?? '').toLowerCase()
    const blob = `${err.code} ${detail} ${msg}`

    if (err.code === 'conflict' || detail === 'name_exists' || blob.includes('name_exists')) {
      return 'A file or folder with this name already exists here.'
    }
    if (detail === 'cycle' || blob.includes('cycle')) {
      return 'Cannot move a folder into itself or one of its subfolders.'
    }
    if (detail === 'folder_copy_unsupported' || blob.includes('folder_copy')) {
      return 'Folder copy is not supported yet.'
    }
    if (err.code === 'validation_failed') {
      if (detail === 'grantee' || msg.includes('grantee')) {
        return 'Enter a valid user id to share with.'
      }
      if (detail === 'doc_kind') {
        return 'Choose a valid document kind.'
      }
    }
  }
  return toUserMessage(err)
}
