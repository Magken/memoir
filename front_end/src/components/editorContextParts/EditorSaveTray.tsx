import { Save } from 'lucide-react'
import { IconButton } from '../IconButton'
import { Tooltip } from '../Tooltip'

type EditorSaveTrayProps = {
  onSave: () => void
  disabled?: boolean
  label?: string
}

export function EditorSaveTray({ onSave, disabled, label = 'Save' }: EditorSaveTrayProps) {
  return (
    <Tooltip content={label}>
      <IconButton
        icon={Save}
        aria-label={label}
        size="xs"
        variant="ghost"
        className="theme-editor-titlebar__save"
        disabled={disabled}
        onClick={onSave}
      />
    </Tooltip>
  )
}
