import type { LucideIcon } from 'lucide-react'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import {
  buttonSizeClass,
  buttonVariantClass,
  type ButtonSize,
  type ButtonVariant,
} from '../lib/ui/buttonStyles'

type LinkButtonProps = {
  href: string
  children?: ReactNode
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  size?: ButtonSize
  variant?: ButtonVariant
  disabled?: boolean
  className?: string
  debug?: boolean
} & Pick<AnchorHTMLAttributes<HTMLAnchorElement>, 'target' | 'rel' | 'aria-label' | 'onClick'>

export function LinkButton({
  href,
  children,
  icon: Icon,
  iconPosition = 'left',
  size = 'md',
  variant = 'default',
  disabled = false,
  className = '',
  debug = false,
  target,
  rel,
  onClick,
  'aria-label': ariaLabel,
}: LinkButtonProps) {
  const iconOnly = Boolean(Icon && !children)

  if (debug) {
    console.debug('[LinkButton]', { href, size, variant, disabled })
  }

  return (
    <a
      href={disabled ? undefined : href}
      target={target}
      rel={rel}
      aria-label={ariaLabel ?? (iconOnly ? 'Link' : undefined)}
      aria-disabled={disabled || undefined}
      onClick={disabled ? (e) => e.preventDefault() : onClick}
      className={[
        'theme-btn',
        buttonSizeClass[size],
        buttonVariantClass[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {Icon && (iconOnly || iconPosition === 'left') ? (
        <Icon aria-hidden className="theme-btn__icon shrink-0" strokeWidth={2} />
      ) : null}
      {children ? <span className="theme-btn__label truncate">{children}</span> : null}
      {Icon && !iconOnly && iconPosition === 'right' ? (
        <Icon aria-hidden className="theme-btn__icon shrink-0" strokeWidth={2} />
      ) : null}
    </a>
  )
}
