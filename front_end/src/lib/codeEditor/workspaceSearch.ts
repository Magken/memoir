import type { CodeFile } from './workspace'

export type WorkspaceSearchHit = {
  fileId: string
  path: string
  line: number
  column: number
  preview: string
}

export type WorkspaceSearchFileGroup = {
  fileId: string
  path: string
  hits: WorkspaceSearchHit[]
}

export function groupWorkspaceHits(
  hits: readonly WorkspaceSearchHit[],
): WorkspaceSearchFileGroup[] {
  const groups: WorkspaceSearchFileGroup[] = []
  const indexByFile = new Map<string, number>()

  for (const hit of hits) {
    const existing = indexByFile.get(hit.fileId)
    if (existing === undefined) {
      indexByFile.set(hit.fileId, groups.length)
      groups.push({ fileId: hit.fileId, path: hit.path, hits: [hit] })
    } else {
      groups[existing]?.hits.push(hit)
    }
  }

  return groups
}

export function searchWorkspace(
  files: readonly CodeFile[],
  query: string,
  limit = 80,
): WorkspaceSearchHit[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []

  const hits: WorkspaceSearchHit[] = []

  for (const file of files) {
    const lines = file.buffer.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i] ?? ''
      const lower = lineText.toLowerCase()
      let from = 0
      while (from < lower.length) {
        const index = lower.indexOf(needle, from)
        if (index === -1) break
        hits.push({
          fileId: file.id,
          path: file.path,
          line: i + 1,
          column: index + 1,
          preview: lineText.trim() || lineText,
        })
        if (hits.length >= limit) return hits
        from = index + Math.max(needle.length, 1)
      }
    }
  }

  return hits
}
