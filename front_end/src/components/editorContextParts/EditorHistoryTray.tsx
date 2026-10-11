import { Undo2, Redo2 } from 'lucide-react'
import { IconButton } from '../IconButton'
import { ToolbarModeGroup } from '../ToolbarModeGroup'

type EditorHistoryTrayProps = {
  canUndo?: boolean
  canRedo?: boolean
  onUndo: () => void
  onRedo: () => void
}

export function EditorHistoryTray({
  canUndo = true,
  canRedo = true,
  onUndo,
  onRedo,
}: EditorHistoryTrayProps) {
  return (
    <ToolbarModeGroup className="theme-editor-titlebar__history" aria-label="History">
      <IconButton
        icon={Undo2}
        aria-label="Undo"
        size="xs"
        variant="tray"
        disabled={!canUndo}
        onClick={onUndo}
      />
      <IconButton
        icon={Redo2}
        aria-label="Redo"
        size="xs"
        variant="tray"
        disabled={!canRedo}
        onClick={onRedo}
      />
    </ToolbarModeGroup>
  )
}
