import { Copy, FilePlus2, RotateCcw, Upload } from 'lucide-react'
import { CascadeMenuButton } from '../CascadeMenuButton'
import type { CascadeMenuItem } from '../../lib/menus/cascadeMenu'
import type { DataGridEditorMode } from '../../lib/dataGridEditor/mode'
import { isDataGridEditable } from '../../lib/dataGridEditor/mode'

export type DataGridEditorFileAction =
  | 'new'
  | 'load-csv'
  | 'download-csv'
  | 'copy-all'
  | 'reset'

type DataGridEditorFileMenuProps = {
  mode: DataGridEditorMode
  onAction: (id: DataGridEditorFileAction) => void
}

const FILE_ITEMS = (editable: boolean): CascadeMenuItem[] => {
  const items: CascadeMenuItem[] = []
  if (editable) {
    items.push(
      { id: 'new', label: 'New sheet', icon: FilePlus2 },
      { id: 'load-csv', label: 'Import CSV…', icon: Upload },
    )
  }
  items.push(
    { id: 'copy-all', label: 'Copy all', icon: Copy },
  )
  if (editable) {
    items.push(
      { id: 'sep-1', label: '—', disabled: true },
      { id: 'reset', label: 'Reset sample', icon: RotateCcw },
    )
  }
  return items
}

export function DataGridEditorFileMenu({ mode, onAction }: DataGridEditorFileMenuProps) {
  const editable = isDataGridEditable(mode)
  return (
    <CascadeMenuButton
      items={FILE_ITEMS(editable)}
      onSelect={(id) => {
        if (id === 'sep-1') return
        onAction(id as DataGridEditorFileAction)
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
