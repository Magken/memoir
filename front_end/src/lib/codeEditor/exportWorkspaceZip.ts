import { strToU8, zipSync } from 'fflate'
import type { CodeWorkspace } from './workspace'
import { normalizePath } from './workspace'

function safeZipPath(path: string): string | null {
  const normalized = normalizePath(path)
  if (!normalized || normalized.includes('..') || normalized.startsWith('/')) {
    return null
  }
  return normalized
}

export function buildWorkspaceZipBlob(workspace: CodeWorkspace): Blob {
  const entries: Record<string, Uint8Array> = {}

  for (const file of workspace.files) {
    const path = safeZipPath(file.path)
    if (!path) continue
    entries[path] = strToU8(file.buffer)
  }

  const zipped = zipSync(entries)
  return new Blob([zipped], { type: 'application/zip' })
}
