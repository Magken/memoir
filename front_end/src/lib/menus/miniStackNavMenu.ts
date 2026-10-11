import type { ButtonSize } from '../ui/buttonStyles'
import {
  flattenSectionLinks,
  sectionSubLinkIds,
  type HorizontalMenuItem,
  type HorizontalMenuLink,
  type HorizontalMenuLinkColumn,
  type HorizontalMenuSection,
} from './horizontalMenu'
import {
  MINI_STACKED_MENU_SIZES,
  type MiniStackedMenuSize,
} from './miniStackedMenu'

export {
  flattenSectionLinks,
  sectionSubLinkIds,
  type HorizontalMenuItem,
  type HorizontalMenuLink,
  type HorizontalMenuLinkColumn,
  type HorizontalMenuSection,
}

export type MiniStackNavMenuItem = HorizontalMenuItem
export type MiniStackNavMenuSize = MiniStackedMenuSize

export const MINI_STACK_NAV_MENU_SIZES = MINI_STACKED_MENU_SIZES

export const miniStackNavMenuSizeClass: Record<MiniStackNavMenuSize, string> = {
  sm: 'theme-msnav--sm',
  md: 'theme-msnav--md',
  lg: 'theme-msnav--lg',
}

export const miniStackNavMenuButtonSize: Record<MiniStackNavMenuSize, ButtonSize> = {
  sm: 'xs',
  md: 'sm',
  lg: 'md',
}

export const miniStackNavMenuStackedSubSize: Record<MiniStackNavMenuSize, ButtonSize> = {
  sm: 'xxs',
  md: 'xs',
  lg: 'sm',
}
