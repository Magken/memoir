import type { LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type {
  AnimatedIconChoice,
  AnimatedIconPreset,
  AnimatedIconTrigger,
} from '../lib/animations/animatedIcons'
import type { ButtonSize, ButtonVariant } from '../lib/ui/buttonStyles'
import { ICON_SVG_GLOW_CLASS, type BorderGlowMode } from '../lib/animations/borderGlow'
import { AnimatedIcon } from './AnimatedIcon'
import { Button } from './Button'

type IconButtonProps = {
  icon?: LucideIcon
  /** Custom icon markup — e.g. tinted Lucide stroke; overrides `icon` when set. */
  iconNode?: ReactNode
  /** `lucide-motion` preset or icon component — replaces `icon` when set. */
  animatedIcon?: AnimatedIconPreset | AnimatedIconChoice
  animatedIconTrigger?: AnimatedIconTrigger
  /** Required for icon-only control */
  'aria-label': string
  size?: ButtonSize
  variant?: ButtonVariant
  /** `tray-color` — swatch dash under icon (hex background). */
  indicatorColor?: string
  disabled?: boolean
  active?: boolean
  /** `true` ink masked glow · `'icon'` SVG drop-shadow glow (best on `cardless`) */
  borderGlow?: BorderGlowMode
  className?: string
  debug?: boolean
} & Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | 'type'
  | 'onClick'
  | 'onMouseDown'
  | 'onMouseUp'
  | 'onMouseEnter'
  | 'onMouseLeave'
  | 'onPointerDown'
  | 'onKeyDown'
  | 'title'
  | 'aria-pressed'
  | 'tabIndex'
>

export function IconButton({
  icon,
  iconNode,
  animatedIcon,
  animatedIconTrigger = 'hover',
  size = 'md',
  variant = 'default',
  indicatorColor,
  disabled = false,
  active = false,
  borderGlow = false,
  className = '',
  debug = false,
  ...rest
}: IconButtonProps) {
  if (!animatedIcon && !icon && !iconNode) {
    throw new Error('IconButton requires `icon`, `animatedIcon`, or `iconNode`.')
  }

  const iconGlowClass =
    borderGlow === 'icon'
      ? ['theme-btn__icon shrink-0', ICON_SVG_GLOW_CLASS].join(' ')
      : 'theme-btn__icon shrink-0'

  const resolvedIconNode = animatedIcon ? (
    <AnimatedIcon
      icon={animatedIcon}
      size={size}
      trigger={animatedIconTrigger}
      className={iconGlowClass}
      debug={debug}
    />
  ) : (
    iconNode
  )

  return (
    <Button
      icon={resolvedIconNode ? undefined : icon}
      iconNode={resolvedIconNode}
      indicatorColor={indicatorColor}
      size={size}
      variant={variant}
      disabled={disabled}
      active={active}
      borderGlow={borderGlow}
      className={className}
      debug={debug}
      {...rest}
    />
  )
}
