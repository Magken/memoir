import { Folder } from 'lucide-react'
import { fileIconForPath, setiSvgWithCurrentColor } from '../../lib/codeEditor/fileIcon'
import type { DriveEntry } from '../../lib/fileExplorer'

type FileExplorerEntryIconProps = {
  entry: DriveEntry
  size?: 'sm' | 'lg'
  className?: string
}

export function FileExplorerEntryIcon({
  entry,
  size = 'sm',
  className = '',
}: FileExplorerEntryIconProps) {
  const sizeClass =
    size === 'lg' ? 'theme-file-explorer__icon theme-file-explorer__icon--lg' : 'theme-file-explorer__icon'

  if (entry.kind === 'folder') {
    return (
      <span className={[sizeClass, className].filter(Boolean).join(' ')} aria-hidden>
        <Folder className="size-full" strokeWidth={1.75} />
      </span>
    )
  }

  const icon = fileIconForPath(entry.name)
  return (
    <span
      className={[sizeClass, className].filter(Boolean).join(' ')}
      style={{ color: icon.color }}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: setiSvgWithCurrentColor(icon.svg) }}
    />
  )
}
