import type { LucideIcon } from 'lucide-react'

export const MINI_STACKED_MENU_SIZES = ['sm', 'md', 'lg'] as const

export const MINI_STACKED_MENU_ORIENTATIONS = ['vertical', 'horizontal'] as const

export type MiniStackedMenuSize = (typeof MINI_STACKED_MENU_SIZES)[number]

export type MiniStackedMenuOrientation = (typeof MINI_STACKED_MENU_ORIENTATIONS)[number]

export type MiniStackedMenuMedia = {
  src: string
  alt: string
  type?: 'image' | 'video'
  poster?: string
}

export type MiniStackedMenuItem = {
  id: string
  label: string
  icon?: LucideIcon
  image?: MiniStackedMenuMedia
}

export const miniStackedMenuOrientationClass: Record<MiniStackedMenuOrientation, string> = {
  vertical: 'theme-msmenu--vertical',
  horizontal: 'theme-msmenu--horizontal',
}
