import type { ButtonSize } from '../ui/buttonStyles'

export const PAGINATOR_VARIANTS = ['numbered', 'icons', 'compact', 'minimal', 'arrows'] as const

export type PaginatorVariant = (typeof PAGINATOR_VARIANTS)[number]

type PaginatorVariantConfig = {
  nav: 'text' | 'icon'
  showPages: boolean
  showSummary: boolean
  defaultSize: ButtonSize
  siblingCount: number
}

export const paginatorVariantConfig: Record<PaginatorVariant, PaginatorVariantConfig> = {
  numbered: {
    nav: 'text',
    showPages: true,
    showSummary: false,
    defaultSize: 'sm',
    siblingCount: 1,
  },
  icons: {
    nav: 'icon',
    showPages: true,
    showSummary: false,
    defaultSize: 'sm',
    siblingCount: 1,
  },
  compact: {
    nav: 'text',
    showPages: true,
    showSummary: false,
    defaultSize: 'xs',
    siblingCount: 1,
  },
  minimal: {
    nav: 'icon',
    showPages: false,
    showSummary: true,
    defaultSize: 'sm',
    siblingCount: 1,
  },
  arrows: {
    nav: 'icon',
    showPages: false,
    showSummary: false,
    defaultSize: 'sm',
    siblingCount: 1,
  },
}

export function paginatorVariantClass(variant: PaginatorVariant): string {
  return `theme-paginator--${variant}`
}
