import { X } from 'lucide-react'

type AuthorRemoveBtnProps = {
  label: string
  onClick: () => void
  className?: string
}

/** Quiet hover-reveal remove — same idea as VurifyViewer’s ViewerRemoveBtn. */
export function AuthorRemoveBtn({ label, onClick, className = '' }: AuthorRemoveBtnProps) {
  return (
    <button
      type="button"
      className={['theme-test-form__remove-btn', className].filter(Boolean).join(' ')}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
    >
      <X aria-hidden className="size-3" strokeWidth={1.75} />
    </button>
  )
}
