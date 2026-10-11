import type { ReactNode } from 'react'

export type GsapTransitionCategory =
  | 'crossfade'
  | 'reveal'
  | 'cover'
  | 'stagger'
  | 'stack'
  | 'overlay'
  | 'slideshow'

export type GsapTransitionArrangement = {
  id: string
  category: GsapTransitionCategory
  name: string
  purpose: string
  reference: string
  stack: string
  preview: ReactNode
}

export const gsapTransitionCategoryOptions = [
  { value: 'all', label: 'All transitions' },
  { value: 'crossfade', label: 'Crossfade & dissolve' },
  { value: 'reveal', label: 'Wipes & reveals' },
  { value: 'cover', label: 'Slide covers' },
  { value: 'stagger', label: 'Stagger & cascade' },
  { value: 'stack', label: 'Stacked sections' },
  { value: 'overlay', label: 'Overlay & modal' },
  { value: 'slideshow', label: 'Slideshow FX' },
] as const
