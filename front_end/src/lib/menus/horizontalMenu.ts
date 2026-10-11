import type { LucideIcon } from 'lucide-react'
import type { ButtonSize } from '../ui/buttonStyles'
import type { RoundedScrollConfig } from '../scroll/roundedScroll'

export const HORIZONTAL_MENU_SIZES = ['sm', 'md', 'lg'] as const

export type HorizontalMenuSize = (typeof HORIZONTAL_MENU_SIZES)[number]

export const HORIZONTAL_MENU_BAR_VARIANTS = ['wrap', 'scroll'] as const

export type HorizontalMenuBarVariant = (typeof HORIZONTAL_MENU_BAR_VARIANTS)[number]

export type HorizontalMenuSubPanelVariant = 'cards' | 'links' | 'stacked'

export type HorizontalMenuLink = {
  id: string
  label: string
  /** Leading icon — bar trigger, linked-text row, or card sub-panel */
  icon?: LucideIcon
  description?: string
  disabled?: boolean
}

/** Grouped column for `subPanelVariant: links` — icon + title header, linked rows below. */
export type HorizontalMenuLinkColumn = {
  id: string
  label: string
  icon?: LucideIcon
  links: readonly HorizontalMenuLink[]
}

export type HorizontalMenuSection = {
  id: string
  label: string
  /** Leading icon — rendered before label on the bar trigger */
  icon?: LucideIcon
  /** Optional overview row — card sub-panel only */
  overview?: HorizontalMenuLink
  /** Card sub-panel rows (default variant) */
  links: readonly HorizontalMenuLink[]
  /** Linked-text sub-panel — column groups with dividers between columns */
  linkColumns?: readonly HorizontalMenuLinkColumn[]
  /** `cards` (default) — row buttons + optional description · `links` — columned `.type-link` rows · `stacked` — icon-above-label neobrutal tiles */
  subPanelVariant?: HorizontalMenuSubPanelVariant
}

export type HorizontalMenuItem =
  | ({ type: 'link' } & HorizontalMenuLink)
  | ({ type: 'section' } & HorizontalMenuSection)

export const horizontalMenuSizeClass: Record<HorizontalMenuSize, string> = {
  sm: 'theme-hmenu--sm',
  md: 'theme-hmenu--md',
  lg: 'theme-hmenu--lg',
}

export const horizontalMenuButtonSize: Record<HorizontalMenuSize, ButtonSize> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
}

/** Compact bottom rail for `barVariant="scroll"` — keep radius in sync with host rules in rounded-scroll.css */
export const horizontalMenuBarScrollConfig: Record<HorizontalMenuSize, Partial<RoundedScrollConfig>> = {
  sm: {
    radius: 8,
    scrollPadding: 0,
    stroke: 2,
    inset: 0,
    trail: 7,
    thumb: 20,
    finish: 2,
    offsetCorner: -24,
    offsetEnd: 4,
    /** < 1 — skip horizontal stroke-cap path inset (see resolveBarBoxMetrics) */
    trackFill: 0.98,
  },
  md: {
    radius: 10,
    scrollPadding: 0,
    stroke: 2,
    inset: 0,
    trail: 8,
    thumb: 24,
    finish: 3,
    offsetCorner: -28,
    offsetEnd: 5,
    trackFill: 0.98,
  },
  lg: {
    radius: 12,
    scrollPadding: 0,
    stroke: 2,
    inset: 0,
    trail: 9,
    thumb: 28,
    finish: 3,
    offsetCorner: -32,
    offsetEnd: 6,
    trackFill: 0.98,
  },
}

export function flattenSectionLinks(section: HorizontalMenuSection): HorizontalMenuLink[] {
  return section.overview ? [section.overview, ...section.links] : [...section.links]
}

export function sectionSubLinkIds(section: HorizontalMenuSection): string[] {
  if (section.subPanelVariant === 'links' && section.linkColumns?.length) {
    return section.linkColumns.flatMap((column) => column.links.map((link) => link.id))
  }
  return flattenSectionLinks(section).map((link) => link.id)
}
