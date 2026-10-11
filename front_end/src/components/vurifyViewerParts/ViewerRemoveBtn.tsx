import { X } from 'lucide-react'

type ViewerRemoveBtnProps = {
  label: string
  onClick: () => void
  className?: string
}

/** Quiet inline remove control for viewer meta chips / edit shells. */
export function ViewerRemoveBtn({ label, onClick, className = '' }: ViewerRemoveBtnProps) {
  return (
    <button
      type="button"
      className={['theme-vurify-viewer__remove-btn', className].filter(Boolean).join(' ')}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
    >
      <X aria-hidden className="size-3" strokeWidth={1.75} />
    </button>
  )
}
