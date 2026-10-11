import type { LucideIcon } from 'lucide-react'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'

export type VurifyIconVariant = 'plain' | 'bordered'
export type VurifyIconTone = 'accent' | 'complement' | 'text' | 'muted'
export type VurifyIconSize = 'sm' | 'md' | 'lg'

type VurifyIconProps = {
  /** Hugeicons glyph — preferred for Vurify surfaces (menu / pricing). */
  iconNode?: IconSvgElement
  /** Lucide fallback when `iconNode` is omitted. */
  icon?: LucideIcon
  variant?: VurifyIconVariant
  tone?: VurifyIconTone
  size?: VurifyIconSize
  className?: string
  /** Decorative by default; set false when a parent already labels. */
  'aria-hidden'?: boolean | 'true' | 'false'
  'aria-label'?: string
}

const SIZE_PX: Record<VurifyIconSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
}

/**
 * Vurify glyph chrome — plain (borderless) or bordered (2px thick frame).
 */
export function VurifyIcon({
  iconNode,
  icon: Icon,
  variant = 'plain',
  tone = 'accent',
  size = 'md',
  className = '',
  'aria-hidden': ariaHidden = true,
  'aria-label': ariaLabel,
}: VurifyIconProps) {
  if (!iconNode && !Icon) return null

  const glyphPx = SIZE_PX[size]

  return (
    <span
      className={[
        'theme-vurify-icon',
        `theme-vurify-icon--${variant}`,
        `theme-vurify-icon--${tone}`,
        `theme-vurify-icon--${size}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
    >
      {iconNode ? (
        <HugeiconsIcon icon={iconNode} size={glyphPx} strokeWidth={1.75} />
      ) : Icon ? (
        <Icon size={glyphPx} strokeWidth={1.75} aria-hidden />
      ) : null}
    </span>
  )
}
