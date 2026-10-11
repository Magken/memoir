import type { LucideIcon } from 'lucide-react'
import { buttonIconOnlySizeClass, buttonVariantClass, type ButtonSize, type ButtonVariant } from '../lib/ui/buttonStyles'

type FabProps = {
  icon: LucideIcon
  'aria-label': string
  onClick?: () => void
  size?: ButtonSize
  variant?: ButtonVariant
  disabled?: boolean
  /** Toggle / filter pressed state. */
  'aria-pressed'?: boolean
  className?: string
  debug?: boolean
}

export function Fab({
  icon: Icon,
  'aria-label': ariaLabel,
  size = 'lg',
  variant = 'accent',
  disabled = false,
  'aria-pressed': ariaPressed,
  className = '',
  debug = false,
  onClick,
}: FabProps) {
  if (debug) {
    console.debug('[Fab]', { size, variant, disabled, ariaPressed })
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      disabled={disabled}
      onClick={onClick}
      className={[
        'theme-btn',
        'theme-fab',
        buttonIconOnlySizeClass[size],
        buttonVariantClass[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon aria-hidden className="theme-btn__icon shrink-0" strokeWidth={2} />
    </button>
  )
}
