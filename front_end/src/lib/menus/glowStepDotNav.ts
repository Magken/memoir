import type { LucideIcon } from 'lucide-react'

export const GLOW_STEP_DOT_NAV_SIZES = ['sm', 'md', 'lg'] as const

export const GLOW_STEP_DOT_NAV_ORIENTATIONS = ['horizontal', 'vertical'] as const

export const GLOW_STEP_DOT_NAV_TRANSITIONS = ['elastic', 'smooth', 'snappy', 'gentle'] as const

export type GlowStepDotNavSize = (typeof GLOW_STEP_DOT_NAV_SIZES)[number]

export type GlowStepDotNavOrientation = (typeof GLOW_STEP_DOT_NAV_ORIENTATIONS)[number]

export type GlowStepDotNavTransition = (typeof GLOW_STEP_DOT_NAV_TRANSITIONS)[number]

export type GlowStepDotNavItem = {
  id: string
  label: string
  icon: LucideIcon
  disabled?: boolean
}

export const glowStepDotNavSizeClass: Record<GlowStepDotNavSize, string> = {
  sm: 'theme-glowstep--sm',
  md: 'theme-glowstep--md',
  lg: 'theme-glowstep--lg',
}

export const glowStepDotNavOrientationClass: Record<GlowStepDotNavOrientation, string> = {
  horizontal: 'theme-glowstep--horizontal',
  vertical: 'theme-glowstep--vertical',
}

export const glowStepDotNavTransitionClass: Record<GlowStepDotNavTransition, string> = {
  elastic: 'theme-glowstep--motion-elastic',
  smooth: 'theme-glowstep--motion-smooth',
  snappy: 'theme-glowstep--motion-snappy',
  gentle: 'theme-glowstep--motion-gentle',
}

export function glowStepDotNavSelectedIndex(
  items: readonly GlowStepDotNavItem[],
  selectedId: string,
): number {
  const index = items.findIndex((item) => item.id === selectedId)
  return index >= 0 ? index : 0
}
