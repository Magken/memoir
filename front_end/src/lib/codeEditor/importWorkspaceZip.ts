import { strFromU8, unzipSync } from 'fflate'
import { createFile, normalizePath } from './workspace'
import type { CodeWorkspace } from './workspace'

function safeZipPath(path: string): string | null {
  const normalized = normalizePath(path.replace(/\\/g, '/'))
  if (!normalized || normalized.includes('..') || normalized.startsWith('/')) {
    return null
  }
  return normalized
}

export async function parseWorkspaceZip(file: Blob): Promise<CodeWorkspace> {
  const buffer = new Uint8Array(await file.arrayBuffer())
  const unzipped = unzipSync(buffer)
  const files = []
  const folderSet = new Set<string>()

  for (const [rawPath, data] of Object.entries(unzipped)) {
    const path = safeZipPath(rawPath)
    if (!path) continue
    const content = strFromU8(data)
    files.push(createFile(path, content))
    const parts = path.split('/')
    for (let i = 1; i < parts.length; i += 1) {
      folderSet.add(parts.slice(0, i).join('/'))
    }
  }

  const firstId = files[0]?.id ?? null
  return {
    files,
    folders: [...folderSet],
    openIds: firstId ? [firstId] : [],
    activeId: firstId,
  }
}
