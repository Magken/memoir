import {
  Copy,
  Download,
  Eye,
  File,
  FolderInput,
  FolderOpen,
  FolderOutput,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Scissors,
  Star,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import type { CascadeMenuItem } from '../../lib/menus/cascadeMenu'
import type { DriveEntry } from '../../lib/fileExplorer'
import { CascadeMenuButton } from '../CascadeMenuButton'

export type FileExplorerEntryActionId =
  | 'open'
  | 'preview'
  | 'cut'
  | 'create-copy'
  | 'move-to'
  | 'copy-to'
  | 'star'
  | 'download'
  | 'rename'
  | 'delete'
  | 'new-folder'
  | 'upload'
  | 'share'

type FileExplorerEntryActionsProps = {
  entry: DriveEntry
  className?: string
  onAction: (id: FileExplorerEntryActionId, entry: DriveEntry) => void
}

function folderItems(): CascadeMenuItem[] {
  return [
    { id: 'open', label: 'Open', icon: FolderOpen },
    {
      id: 'new',
      label: 'New',
      icon: FolderPlus,
      children: [
        { id: 'new-folder', label: 'New folder', icon: FolderPlus },
        { id: 'upload', label: 'Upload…', icon: Upload },
      ],
    },
    {
      id: 'organize',
      label: 'Organize',
      icon: FolderOutput,
      children: [
        { id: 'cut', label: 'Cut', icon: Scissors },
        { id: 'create-copy', label: 'Create copy', icon: Copy },
        { id: 'move-to', label: 'Move to…', icon: FolderInput },
        { id: 'copy-to', label: 'Copy to…', icon: Copy },
      ],
    },
    { id: 'star', label: 'Star / Unstar', icon: Star },
    { id: 'share', label: 'Share…', icon: Users },
    { id: 'rename', label: 'Rename', icon: Pencil },
    { id: 'delete', label: 'Delete', icon: Trash2 },
  ]
}

function fileItems(): CascadeMenuItem[] {
  return [
    { id: 'open', label: 'Open', icon: File },
    { id: 'preview', label: 'Preview', icon: Eye },
    {
      id: 'organize',
      label: 'Organize',
      icon: FolderOutput,
      children: [
        { id: 'cut', label: 'Cut', icon: Scissors },
        { id: 'create-copy', label: 'Create copy', icon: Copy },
        { id: 'move-to', label: 'Move to…', icon: FolderInput },
        { id: 'copy-to', label: 'Copy to…', icon: Copy },
      ],
    },
    { id: 'star', label: 'Star / Unstar', icon: Star },
    { id: 'share', label: 'Share…', icon: Users },
    { id: 'download', label: 'Download', icon: Download },
    { id: 'rename', label: 'Rename', icon: Pencil },
    { id: 'delete', label: 'Delete', icon: Trash2 },
  ]
}

export function FileExplorerEntryActions({
  entry,
  className = '',
  onAction,
}: FileExplorerEntryActionsProps) {
  const items = entry.kind === 'folder' ? folderItems() : fileItems()

  return (
    <span
      className={['theme-file-explorer__row-actions', className].filter(Boolean).join(' ')}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    >
      <CascadeMenuButton
        label="Actions"
        icon={MoreHorizontal}
        iconOnly
        size="xs"
        variant="ghost"
        menuSize="compact"
        scrollRail="hidden"
        scrollClouds
        triggerLabelAnim={false}
        items={items}
        onSelect={(id) => onAction(id as FileExplorerEntryActionId, entry)}
      />
    </span>
  )
}
