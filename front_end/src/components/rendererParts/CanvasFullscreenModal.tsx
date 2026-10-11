import { X } from 'lucide-react'
import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from '../IconButton'

type CanvasFullscreenModalProps = {
  open: boolean
  title?: string
  onClose: () => void
  children: ReactNode
  headerActions?: ReactNode
}

/** Viewport modal shell — mirrors `Modal` (`placement="viewport"`) with a near-fullscreen canvas body. */
export function CanvasFullscreenModal({
  open,
  title = 'Diagram',
  onClose,
  children,
  headerActions,
}: CanvasFullscreenModalProps) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  const shell = (
    <div className="theme theme-canvas-fullscreen-modal" role="presentation">
      <button
        type="button"
        className="theme-canvas-fullscreen-modal__backdrop"
        aria-label="Close fullscreen"
        onClick={onClose}
      />
      <div
        className="theme-canvas-fullscreen-modal__shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="theme-canvas-fullscreen-modal__header">
          <h2 id={titleId} className="theme-canvas-fullscreen-modal__title type-h4">
            {title}
          </h2>
          <div className="theme-canvas-fullscreen-modal__header-end">
            {headerActions}
            <IconButton icon={X} aria-label="Close" size="xs" variant="ghost" onClick={onClose} />
          </div>
        </header>
        <div className="theme-canvas-fullscreen-modal__body">{children}</div>
      </div>
    </div>
  )

  return createPortal(shell, document.body)
}
