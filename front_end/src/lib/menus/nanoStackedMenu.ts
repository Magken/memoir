import type { LucideIcon } from 'lucide-react'

export const NANO_STACKED_MENU_ORIENTATIONS = ['vertical', 'horizontal'] as const

export const NANO_STACKED_MENU_SIZES = ['xxs'] as const

export type NanoStackedMenuOrientation = (typeof NANO_STACKED_MENU_ORIENTATIONS)[number]

export type NanoStackedMenuSize = (typeof NANO_STACKED_MENU_SIZES)[number]

export type NanoStackedMenuMedia = {
  src: string
  alt: string
  type?: 'image' | 'video'
  poster?: string
}

export type NanoStackedMenuItem = {
  id: string
  label: string
  icon?: LucideIcon
  image?: NanoStackedMenuMedia
}

export const nanoStackedMenuOrientationClass: Record<NanoStackedMenuOrientation, string> = {
  vertical: 'theme-nmenu--vertical',
  horizontal: 'theme-nmenu--horizontal',
}
