import type { LucideIcon } from 'lucide-react'

export const MICRO_MENU_ORIENTATIONS = ['vertical', 'horizontal'] as const

export const MICRO_MENU_SIZES = ['xxs', 'xs'] as const

export type MicroMenuOrientation = (typeof MICRO_MENU_ORIENTATIONS)[number]

export type MicroMenuSize = (typeof MICRO_MENU_SIZES)[number]

export type MicroMenuMedia = {
  src: string
  alt: string
  type?: 'image' | 'video'
  poster?: string
}

export type MicroMenuItem = {
  id: string
  label: string
  icon?: LucideIcon
  image?: MicroMenuMedia
}

export const microMenuOrientationClass: Record<MicroMenuOrientation, string> = {
  vertical: 'theme-mmenu--vertical',
  horizontal: 'theme-mmenu--horizontal',
}
