import { menuItemButtonSize, menuSizeClass, type MenuSize } from './menuControls'

export {
  flattenSectionLinks,
  HORIZONTAL_MENU_SIZES as HAMBURGER_MENU_SIZES,
  horizontalMenuButtonSize as hamburgerMenuTriggerSize,
  sectionSubLinkIds,
  type HorizontalMenuItem as HamburgerMenuItem,
  type HorizontalMenuLink as HamburgerMenuLink,
  type HorizontalMenuLinkColumn as HamburgerMenuLinkColumn,
  type HorizontalMenuSection as HamburgerMenuSection,
  type HorizontalMenuSize as HamburgerMenuSize,
} from './horizontalMenu'

/** Panel open behaviour — `push` grows in flow · `overlay` covers the shell viewport below chrome */
export const HAMBURGER_MENU_PANEL_EXPANSIONS = ['push', 'overlay'] as const

export type HamburgerMenuPanelExpansion = (typeof HAMBURGER_MENU_PANEL_EXPANSIONS)[number]

export const hamburgerMenuPanelExpansionClass: Record<HamburgerMenuPanelExpansion, string> = {
  push: 'theme-bmenu--push',
  overlay: 'theme-bmenu--overlay',
}

/** Matches `--theme-bmenu-panel-duration` in [hamburger-menu.css](../css/effects/hamburger-menu.css) */
export const HAMBURGER_MENU_PANEL_DURATION_MS = 340

/** Nav scale — pairs with [hamburger-menu.css](../css/effects/hamburger-menu.css) `--theme-bmenu-chrome-*` */
export const hamburgerMenuSizeClass = {
  sm: 'theme-bmenu--sm',
  md: 'theme-bmenu--md',
  lg: 'theme-bmenu--lg',
} as const satisfies Record<'sm' | 'md' | 'lg', string>

/** Panel row scale — matches [MenuButton](../components/MenuButton.tsx) `menuSize` 1:1. */
export const hamburgerMenuRowButtonSize = menuItemButtonSize

export const hamburgerMenuPanelSizeClass = menuSizeClass

export function hamburgerMenuPanelSize(navSize: MenuSize): MenuSize {
  return navSize
}
