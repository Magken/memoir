export type DriveCommandId =
  | 'new-folder'
  | 'upload'
  | 'toggle-preview'
  | 'view-list'
  | 'view-grid'
  | 'view-details'
  | 'sort-name'
  | 'sort-modified'
  | 'star'
  | 'download'
  | 'move-to'
  | 'copy-to'
  | 'create-copy'
  | 'focus-search'
  | 'reset-library'
  | 'go-starred'
  | 'go-recent'
  | 'go-root'

export type DriveCommand = {
  id: DriveCommandId
  label: string
  keywords?: string
  group: 'navigate' | 'create' | 'view' | 'selection' | 'library'
}

export const DRIVE_COMMANDS: readonly DriveCommand[] = [
  { id: 'new-folder', label: 'New folder', group: 'create', keywords: 'mkdir create' },
  { id: 'upload', label: 'Upload files', group: 'create', keywords: 'import add' },
  { id: 'toggle-preview', label: 'Toggle preview pane', group: 'view' },
  { id: 'view-list', label: 'View as list', group: 'view' },
  { id: 'view-grid', label: 'View as grid', group: 'view' },
  { id: 'view-details', label: 'View as details', group: 'view' },
  { id: 'sort-name', label: 'Sort by name', group: 'view' },
  { id: 'sort-modified', label: 'Sort by modified', group: 'view' },
  { id: 'star', label: 'Star selection', group: 'selection', keywords: 'favorite' },
  { id: 'download', label: 'Download selection', group: 'selection' },
  { id: 'move-to', label: 'Move to…', group: 'selection' },
  { id: 'copy-to', label: 'Copy to…', group: 'selection' },
  {
    id: 'create-copy',
    label: 'Create copy',
    group: 'selection',
    keywords: 'duplicate clone',
  },
  { id: 'focus-search', label: 'Focus search', group: 'navigate', keywords: 'find' },
  { id: 'go-root', label: 'Go to My files', group: 'navigate' },
  { id: 'go-starred', label: 'Go to Starred', group: 'navigate' },
  { id: 'go-recent', label: 'Go to Recent', group: 'navigate' },
  { id: 'reset-library', label: 'Reset fixture library', group: 'library', keywords: 'refresh' },
]

export function filterDriveCommands(query: string): DriveCommand[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...DRIVE_COMMANDS]
  return DRIVE_COMMANDS.filter((c) => {
    const hay = `${c.label} ${c.keywords ?? ''} ${c.id}`.toLowerCase()
    return hay.includes(q)
  })
}
