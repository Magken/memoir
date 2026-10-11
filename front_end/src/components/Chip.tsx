import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { FieldSize } from '../lib/forms/formControls'

type ChipProps = {
  children: ReactNode
  selected?: boolean
  onClick?: () => void
  onDismiss?: () => void
  size?: FieldSize
  disabled?: boolean
  className?: string
  debug?: boolean
}

const sizeClass: Record<FieldSize, string> = {
  xs: 'theme-chip--sm',
  sm: 'theme-chip--sm',
  md: 'theme-chip--md',
  lg: 'theme-chip--lg',
}

export function Chip({
  children,
  selected = false,
  onClick,
  onDismiss,
  size = 'md',
  disabled = false,
  className = '',
  debug = false,
}: ChipProps) {
  if (debug) {
    console.debug('[Chip]', { selected, size, disabled })
  }

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      className={[
        'theme-chip',
        sizeClass[size],
        selected ? 'theme-chip--selected' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
    >
      <span className="theme-chip__surface">
        <span className="theme-chip__fill" aria-hidden />
        <span className="theme-chip__label type-label">{children}</span>
        {onDismiss ? (
          <span
            className="theme-chip__dismiss"
            aria-hidden
            onClick={(event) => {
              event.stopPropagation()
              onDismiss()
            }}
          >
            <X size={14} strokeWidth={2} />
          </span>
        ) : null}
      </span>
    </button>
  )
}
