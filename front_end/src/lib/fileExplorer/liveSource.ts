import type { FilesNodeJson } from '../fileApi'
import { mimeGroupFromName } from './previewKind'
import type { DriveEntry, DriveLibrary, DriveMimeGroup } from './types'

const DOC_KIND_MIME: Record<string, DriveMimeGroup> = {
  markdown: 'markdown',
  code: 'code',
  draw: 'draw',
  force: 'force',
  plot: 'json',
  json: 'json',
  doc: 'json',
  flow: 'json',
  grid: 'csv',
  result: 'json',
}

export function mapNodeToDriveEntry(node: FilesNodeJson): DriveEntry {
  const docKind = node.docKind ?? undefined
  let mimeGroup: DriveMimeGroup =
    node.kind === 'folder' ? 'folder' : mimeGroupFromName(node.name)
  if (docKind && DOC_KIND_MIME[docKind]) {
    mimeGroup = DOC_KIND_MIME[docKind]
  }
  const tags = Array.isArray(node.metadata?.tags)
    ? (node.metadata!.tags as string[])
    : typeof node.metadata?.tags === 'string'
      ? [String(node.metadata.tags)]
      : docKind
        ? [docKind]
        : undefined

  let content: string | undefined
  if (node.body != null) {
    if (typeof node.body === 'string') content = node.body
    else if (
      typeof node.body === 'object' &&
      node.body &&
      'markdown' in (node.body as object)
    ) {
      content = String((node.body as { markdown?: string }).markdown ?? '')
    } else if (
      typeof node.body === 'object' &&
      node.body &&
      'code' in (node.body as object)
    ) {
      content = String((node.body as { code?: string }).code ?? '')
    } else {
      content = JSON.stringify(node.body, null, 2)
    }
  }

  return {
    id: node.id,
    parentId: node.parentId ?? null,
    name: node.name,
    kind: node.kind === 'folder' ? 'folder' : 'file',
    mimeGroup,
    mime: node.mime ?? undefined,
    sizeBytes: node.byteSize,
    modifiedAt: node.updatedAt ?? node.createdAt ?? new Date().toISOString(),
    starred: node.starred,
    shareCount: typeof node.shareCount === 'number' ? node.shareCount : undefined,
    tags,
    content,
  }
}

export function mergeDriveEntries(
  existing: readonly DriveEntry[],
  incoming: readonly DriveEntry[],
): DriveLibrary {
  const map = new Map<string, DriveEntry>()
  for (const e of existing) map.set(e.id, e)
  for (const e of incoming) map.set(e.id, e)
  return { entries: [...map.values()] }
}

export type FileExplorerSource =
  | { mode: 'fixture' }
  | {
      mode: 'live'
      accountId: string
      /** When false, hide Reset-to-seed; undo stack disabled */
      allowLocalUndo?: false
    }
