import type { ReactNode } from 'react'
import { fieldSlotClassName, useViewerFormat, type FieldRole } from './formatContext'

type DocFieldProps = {
  id: string
  /** Locked document slot — assigned by layout only. */
  role?: FieldRole
  className?: string
  children: ReactNode
}

/** Marks a CV slot for selection-toolbar focus. Slot look is CSS-only. */
export function DocField({ id, role, className = '', children }: DocFieldProps) {
  const { setFocusedFieldId } = useViewerFormat()

  return (
    <div
      data-vv-field={id}
      className={[fieldSlotClassName(role), className].filter(Boolean).join(' ')}
      onFocusCapture={() => setFocusedFieldId(id)}
    >
      {children}
    </div>
  )
}
