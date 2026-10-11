import {
  resolveAnimatedIconComponent,
  resolveAnimatedIconSizePx,
  resolveAnimatedIconTrigger,
  type AnimatedIconChoice,
  type AnimatedIconTrigger,
} from '../lib/animations/animatedIcons'
import type { ButtonSize } from '../lib/ui/buttonStyles'

type AnimatedIconProps = {
  icon: AnimatedIconChoice
  size?: ButtonSize | number
  trigger?: AnimatedIconTrigger
  className?: string
  debug?: boolean
}

export function AnimatedIcon({
  icon,
  size = 'md',
  trigger = 'hover',
  className = '',
  debug = false,
}: AnimatedIconProps) {
  const Icon = resolveAnimatedIconComponent(icon)
  const sizePx = resolveAnimatedIconSizePx(size)
  const motionTrigger = resolveAnimatedIconTrigger(trigger)

  if (debug) {
    console.debug('[AnimatedIcon]', { icon, size: sizePx, trigger: motionTrigger })
  }

  return (
    <span
      className={['theme-anim-icon', className].filter(Boolean).join(' ')}
      aria-hidden
    >
      <Icon
        trigger={motionTrigger}
        mode="signature"
        onLeave="complete"
        size={sizePx}
        color="currentColor"
        reducedMotion="system"
      />
    </span>
  )
}
