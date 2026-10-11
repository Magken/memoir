import { ArrowUp, ChevronRight } from 'lucide-react'
import type { DragEvent } from 'react'
import type { DriveEntry } from '../../lib/fileExplorer'
import {
  FILE_EXPLORER_ENTRY_MIME,
  canDropOnto,
  pathLabels,
  readDragEntryIds,
} from '../../lib/fileExplorer'
import { IconButton } from '../IconButton'
import { Tooltip } from '../Tooltip'

type FileExplorerBreadcrumbsProps = {
  entries: readonly DriveEntry[]
  folderId: string | null
  canGoUp: boolean
  dropTargetId: string | null | undefined
  onGoUp: () => void
  onNavigate: (folderId: string | null) => void
  onRelocateEntries: (ids: string[], targetFolderId: string | null) => void
  onDropTargetChange: (id: string | null | undefined) => void
}

export function FileExplorerBreadcrumbs({
  entries,
  folderId,
  canGoUp,
  dropTargetId,
  onGoUp,
  onNavigate,
  onRelocateEntries,
  onDropTargetChange,
}: FileExplorerBreadcrumbsProps) {
  const crumbs = pathLabels(entries, folderId)

  return (
    <div className="theme-file-explorer__breadcrumbs" aria-label="Path">
      <Tooltip content="Go up">
        <IconButton
          icon={ArrowUp}
          aria-label="Go up"
          size="xs"
          variant="ghost"
          disabled={!canGoUp}
          onClick={onGoUp}
        />
      </Tooltip>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        const isDrop = dropTargetId === crumb.id
        return (
          <span key={`${crumb.id ?? 'root'}-${i}`} className="inline-flex items-center gap-0.5">
            {i > 0 ? <ChevronRight className="size-3 type-muted" aria-hidden strokeWidth={1.75} /> : null}
            <button
              type="button"
              className={[
                'theme-file-explorer__crumb',
                'type-caption',
                isLast ? 'theme-file-explorer__crumb--current' : '',
                isDrop ? 'theme-file-explorer__crumb--drop-target' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={isLast}
              onClick={() => onNavigate(crumb.id)}
              onDragOver={(e: DragEvent) => {
                if (!e.dataTransfer.types.includes(FILE_EXPLORER_ENTRY_MIME)) return
                e.preventDefault()
                onDropTargetChange(crumb.id)
              }}
              onDrop={(e: DragEvent) => {
                e.preventDefault()
                const ids = readDragEntryIds(e.dataTransfer)
                onDropTargetChange(undefined)
                if (!canDropOnto(entries, ids, crumb.id)) return
                onRelocateEntries(ids, crumb.id)
              }}
            >
              {crumb.name}
            </button>
          </span>
        )
      })}
    </div>
  )
}
