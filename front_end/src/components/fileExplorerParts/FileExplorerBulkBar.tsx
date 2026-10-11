import {
  Download,
  FolderInput,
  Star,
  Trash2,
} from 'lucide-react'
import { IconButton } from '../IconButton'
import { Tooltip } from '../Tooltip'

type FileExplorerBulkBarProps = {
  count: number
  onDownload: () => void
  onStar: () => void
  onMove: () => void
  onDelete: () => void
}

export function FileExplorerBulkBar({
  count,
  onDownload,
  onStar,
  onMove,
  onDelete,
}: FileExplorerBulkBarProps) {
  if (count < 2) return null

  return (
    <div className="theme-file-explorer__bulk" role="toolbar" aria-label="Bulk actions">
      <span className="type-caption">{count} selected</span>
      <Tooltip content="Download">
        <IconButton icon={Download} aria-label="Download" size="xs" variant="ghost" onClick={onDownload} />
      </Tooltip>
      <Tooltip content="Star">
        <IconButton icon={Star} aria-label="Star" size="xs" variant="ghost" onClick={onStar} />
      </Tooltip>
      <Tooltip content="Move to…">
        <IconButton icon={FolderInput} aria-label="Move to" size="xs" variant="ghost" onClick={onMove} />
      </Tooltip>
      <Tooltip content="Delete">
        <IconButton icon={Trash2} aria-label="Delete" size="xs" variant="ghost" onClick={onDelete} />
      </Tooltip>
    </div>
  )
}
