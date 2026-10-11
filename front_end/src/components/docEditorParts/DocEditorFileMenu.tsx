import { FilePlus2, RotateCcw } from 'lucide-react'
import { CascadeMenuButton } from '../CascadeMenuButton'
import type { CascadeMenuItem } from '../../lib/menus/cascadeMenu'

export type DocEditorFileAction = 'new' | 'reset'

const FILE_ITEMS: CascadeMenuItem[] = [
  { id: 'new', label: 'New document', icon: FilePlus2 },
  { id: 'reset', label: 'Reset sample', icon: RotateCcw },
]

type DocEditorFileMenuProps = {
  onAction: (id: DocEditorFileAction) => void
}

export function DocEditorFileMenu({ onAction }: DocEditorFileMenuProps) {
  return (
    <CascadeMenuButton
      items={FILE_ITEMS}
      onSelect={(id) => onAction(id as DocEditorFileAction)}
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
