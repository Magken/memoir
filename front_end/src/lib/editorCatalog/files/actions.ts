import type { EditorAction } from '../types'

export type FilesEditorAction = EditorAction

export const FILES_EDITOR_ACTIONS: FilesEditorAction[] = [
  {
    id: 'files.action.open-palette',
    label: 'Open command palette',
    kind: 'ui',
    target: 'FileExplorer toolbar / Ctrl+K',
    notation: 'chrome.palette=open',
    implemented: true,
    relatedFeatures: ['files.chrome.toolbar'],
  },
  {
    id: 'files.action.focus-search',
    label: 'Focus search panel',
    kind: 'ui',
    target: 'FileExplorer Files|Search / Ctrl+F',
    notation: 'chrome.sidebar=search',
    implemented: true,
    relatedFeatures: ['files.interaction.search'],
  },
  {
    id: 'files.action.create-copy',
    label: 'Create copy',
    kind: 'command',
    target: 'Entry actions / context menu / palette',
    notation: 'interaction.create-copy @selection',
    implemented: true,
    relatedFeatures: ['files.interaction.create-copy'],
    notes: 'Duplicates into the same parent with a ` copy` name suffix.',
  },
  {
    id: 'files.action.move-to',
    label: 'Move to…',
    kind: 'command',
    target: 'FileExplorerMoveDialog folder tree',
    notation: 'interaction.move-to @folderId',
    implemented: true,
    relatedFeatures: ['files.interaction.tree'],
  },
  {
    id: 'files.action.copy-to',
    label: 'Copy to…',
    kind: 'command',
    target: 'FileExplorerMoveDialog folder tree',
    notation: 'interaction.copy-to @folderId',
    implemented: true,
    relatedFeatures: ['files.interaction.tree', 'files.interaction.clipboard'],
  },
  {
    id: 'files.action.upload',
    label: 'Upload files',
    kind: 'runtime',
    target: 'FileExplorer upload modal',
    notation: 'runtime.upload → fixture.entries[]',
    implemented: true,
    relatedFeatures: ['files.io.upload'],
  },
  {
    id: 'files.action.download',
    label: 'Download selection',
    kind: 'runtime',
    target: 'Bulk bar / entry actions',
    notation: 'runtime.download @selection',
    implemented: true,
    relatedFeatures: ['files.io.download'],
  },
]

export function filesActionById(id: string): FilesEditorAction | undefined {
  return FILES_EDITOR_ACTIONS.find((action) => action.id === id)
}
