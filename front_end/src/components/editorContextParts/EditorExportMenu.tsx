import { Download } from 'lucide-react'
import { MenuButton } from '../MenuButton'
import { exportMenuItemsForKind } from '../../lib/editorContext/exportMenuItems'
import type { EditorKind } from '../../lib/editorContext/types'

type EditorExportMenuProps = {
  kind: EditorKind
  onExport: (formatId: string) => void
}

export function EditorExportMenu({ kind, onExport }: EditorExportMenuProps) {
  const items = exportMenuItemsForKind(kind).map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
  }))

  return (
    <MenuButton
      items={items}
      onSelect={(id) => onExport(id)}
      label="Export"
      icon={Download}
      size="xs"
      variant="tray"
      iconDropdown
      menuSize="compact"
      scrollRail="hidden"
      portal
      triggerLabelAnim={false}
      className="theme-editor-titlebar__export"
    />
  )
}
