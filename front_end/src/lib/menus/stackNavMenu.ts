/** Stack nav menu — reuses [horizontalMenu](horizontalMenu.ts) item tree + scroll config. */
export {
  flattenSectionLinks,
  horizontalMenuBarScrollConfig,
  horizontalMenuButtonSize,
  horizontalMenuSizeClass,
  sectionSubLinkIds,
  HORIZONTAL_MENU_BAR_VARIANTS,
  HORIZONTAL_MENU_SIZES,
  type HorizontalMenuBarVariant,
  type HorizontalMenuItem,
  type HorizontalMenuLink,
  type HorizontalMenuLinkColumn,
  type HorizontalMenuSection,
  type HorizontalMenuSize,
  type HorizontalMenuSubPanelVariant,
} from './horizontalMenu'

export type StackNavMenuItem = import('./horizontalMenu').HorizontalMenuItem
export type StackNavMenuSize = import('./horizontalMenu').HorizontalMenuSize
export type StackNavMenuBarVariant = import('./horizontalMenu').HorizontalMenuBarVariant
