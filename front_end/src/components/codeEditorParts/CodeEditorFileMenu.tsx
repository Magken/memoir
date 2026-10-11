import {
  Copy,
  Download,
  FilePlus2,
  FolderPlus,
  HelpCircle,
  Pencil,
  Save,
  SaveAll,
  Trash2,
  Upload,
} from 'lucide-react'
import { CascadeMenuButton } from '../CascadeMenuButton'
import type { CascadeMenuItem } from '../../lib/menus/cascadeMenu'

export type CodeEditorFileAction =
  | 'new'
  | 'new-folder'
  | 'upload'
  | 'rename'
  | 'delete'
  | 'save'
  | 'save-all'
  | 'download'
  | 'copy'
  | 'help'

type CodeEditorFileMenuProps = {
  onAction: (id: CodeEditorFileAction) => void
  hasActiveFile: boolean
  hasDirty: boolean
  readOnly?: boolean
}

const FILE_ITEMS = (
  hasActiveFile: boolean,
  hasDirty: boolean,
  readOnly: boolean,
): CascadeMenuItem[] => [
  { id: 'new', label: 'New file', icon: FilePlus2, disabled: readOnly },
  { id: 'new-folder', label: 'New folder', icon: FolderPlus, disabled: readOnly },
  { id: 'upload', label: 'Upload files…', icon: Upload, disabled: readOnly },
  { id: 'rename', label: 'Rename', icon: Pencil, disabled: readOnly || !hasActiveFile },
  { id: 'delete', label: 'Delete', icon: Trash2, disabled: readOnly || !hasActiveFile },
  { id: 'sep-1', label: '—', disabled: true },
  { id: 'save', label: 'Save', icon: Save, disabled: !hasActiveFile },
  { id: 'save-all', label: 'Save all', icon: SaveAll, disabled: !hasDirty },
  { id: 'download', label: 'Download', icon: Download, disabled: !hasActiveFile },
  { id: 'copy', label: 'Copy all', icon: Copy, disabled: !hasActiveFile },
  { id: 'sep-2', label: '—', disabled: true },
  { id: 'help', label: 'Keyboard shortcuts', icon: HelpCircle },
]

export function CodeEditorFileMenu({
  onAction,
  hasActiveFile,
  hasDirty,
  readOnly = false,
}: CodeEditorFileMenuProps) {
  return (
    <CascadeMenuButton
      items={FILE_ITEMS(hasActiveFile, hasDirty, readOnly)}
      onSelect={(id) => {
        if (id === 'sep-1' || id === 'sep-2') return
        onAction(id as CodeEditorFileAction)
      }}
      label="File"
      size="xs"
      variant="tray"
      menuSize="compact"
      scrollRail="hidden"
      scrollClouds
      triggerLabelAnim={false}
    />
  )
}
