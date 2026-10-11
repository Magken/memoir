import type { ComponentType } from 'react'
import { Heart, Mail, Settings, type DrawIconProps } from 'lucide-motion'
import type { ButtonSize } from '../ui/buttonStyles'

/** Lucide Motion icon component — same API as icons from `lucide-motion`. */
export type LucideMotionIcon = ComponentType<Omit<DrawIconProps, 'nodes'>>

export type AnimatedIconPreset = 'settings' | 'mail' | 'heart'

export type AnimatedIconTrigger = 'hover' | 'none'

export const ANIMATED_ICON_PRESETS = ['settings', 'mail', 'heart'] as const

export type AnimatedIconChoice = AnimatedIconPreset | LucideMotionIcon

const animatedIconPresetComponents: Record<AnimatedIconPreset, LucideMotionIcon> = {
  settings: Settings,
  mail: Mail,
  heart: Heart,
}

/** Player `size` in px — aligned with Button `[&_svg]:size-*` scales. */
export const animatedIconSizePx: Record<ButtonSize, number> = {
  xxs: 10,
  xs: 12,
  sm: 14,
  md: 16,
  lg: 16,
  xl: 18,
  xxl: 20,
}

export function resolveAnimatedIconComponent(icon: AnimatedIconChoice): LucideMotionIcon {
  return typeof icon === 'string' ? animatedIconPresetComponents[icon] : icon
}

export function resolveAnimatedIconTrigger(
  trigger: AnimatedIconTrigger,
): NonNullable<DrawIconProps['trigger']> {
  // `.theme-anim-icon` is pointer-events: none — bind to `.theme-btn[data-motion-icon-group]`.
  return trigger === 'none' ? 'manual' : 'parent-hover'
}

export function resolveAnimatedIconSizePx(size: ButtonSize | number): number {
  return typeof size === 'number' ? size : animatedIconSizePx[size]
}
