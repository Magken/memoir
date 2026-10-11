export type DriveEntryKind = 'folder' | 'file'

export type DriveMimeGroup =
  | 'folder'
  | 'image'
  | 'pdf'
  | 'markdown'
  | 'text'
  | 'code'
  | 'csv'
  | 'mermaid'
  | 'force'
  | 'draw'
  | 'json'
  | 'unknown'

export type DriveEntry = {
  id: string
  parentId: string | null
  name: string
  kind: DriveEntryKind
  mimeGroup: DriveMimeGroup
  mime?: string
  sizeBytes?: number
  modifiedAt: string
  starred?: boolean
  /** Active share grantee count (live backend); optional for fixture. */
  shareCount?: number
  tags?: string[]
  content?: string
  objectUrl?: string
}

export type DriveViewMode = 'list' | 'grid' | 'details'

export type DriveSortKey = 'name' | 'modified' | 'size' | 'type'
export type DriveSortDir = 'asc' | 'desc'

export type DriveLocation =
  | { type: 'folder'; folderId: string | null }
  | { type: 'starred' }
  | { type: 'recent' }
  | { type: 'shared' }
  | { type: 'trash' }

export type DriveClipboardMode = 'cut' | 'copy'

export type DriveClipboard = {
  mode: DriveClipboardMode
  entryIds: string[]
}

export type DriveLibrary = {
  entries: DriveEntry[]
}

export type DriveTreeNode = {
  entry: DriveEntry
  children: DriveTreeNode[]
}
