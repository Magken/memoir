import { RefreshCw } from 'lucide-react'
import { IconButton } from '../IconButton'
import { Tooltip } from '../Tooltip'

type EditorTitleRefreshProps = {
  onRefresh: () => void
  label?: string
}

export function EditorTitleRefresh({ onRefresh, label = 'Refresh' }: EditorTitleRefreshProps) {
  return (
    <Tooltip content={label}>
      <IconButton
        icon={RefreshCw}
        aria-label={label}
        size="xxs"
        variant="ghost"
        className="theme-editor-titlebar__refresh"
        onClick={onRefresh}
      />
    </Tooltip>
  )
}
