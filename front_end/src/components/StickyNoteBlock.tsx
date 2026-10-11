import type { ReactNode } from 'react'

type StickyNoteBlockProps = {
  children: ReactNode
  className?: string
}

export function StickyNoteBlock({ children, className = '' }: StickyNoteBlockProps) {
  return (
    <div className={['theme-sticky-note-block', className].filter(Boolean).join(' ')}>
      <p className="theme-sticky-note-block__label type-caption type-faint" aria-hidden="true">
        Sticky note
      </p>
      <div className="theme-sticky-note-block__body">{children}</div>
    </div>
  )
}
