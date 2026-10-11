import type { LucideIcon } from 'lucide-react'
import type { ButtonSize } from '../ui/buttonStyles'

export const TABBED_MENU_SIZES = ['sm', 'md', 'lg'] as const

export const TABBED_MENU_VARIANTS = ['segmented', 'expandable'] as const

export type TabbedMenuSize = (typeof TABBED_MENU_SIZES)[number]

export type TabbedMenuVariant = (typeof TABBED_MENU_VARIANTS)[number]

export type TabbedMenuItem = {
  id: string
  label: string
  icon?: LucideIcon
  disabled?: boolean
}

export const tabbedMenuSizeClass: Record<TabbedMenuSize, string> = {
  sm: 'theme-tmenu--sm',
  md: 'theme-tmenu--md',
  lg: 'theme-tmenu--lg',
}

export const tabbedMenuVariantClass: Record<TabbedMenuVariant, string> = {
  segmented: 'theme-tmenu--segmented',
  expandable: 'theme-tmenu--expandable',
}

export const tabbedMenuChoiceSizeClass: Record<TabbedMenuSize, string> = {
  sm: 'theme-choice--sm',
  md: 'theme-choice--md',
  lg: 'theme-choice--lg',
}

export const tabbedMenuButtonSize: Record<TabbedMenuSize, ButtonSize> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
}
