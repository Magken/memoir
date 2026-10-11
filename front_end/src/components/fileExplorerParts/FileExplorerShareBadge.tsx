import { Users } from 'lucide-react'

type FileExplorerShareBadgeProps = {
  count?: number
  className?: string
}

/** Compact “shared with N” chip for list/grid/details rows. */
export function FileExplorerShareBadge({ count, className }: FileExplorerShareBadgeProps) {
  if (!count || count < 1) return null
  return (
    <span
      className={['theme-file-explorer__share-badge', className].filter(Boolean).join(' ')}
      title={`Shared with ${count}`}
      aria-label={`Shared with ${count}`}
    >
      <Users className="size-2.5 shrink-0" strokeWidth={2} aria-hidden />
      <span className="type-caption">{count}</span>
    </span>
  )
}
