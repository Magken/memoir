import { buttonMinHeightRem, type ButtonSize } from '../ui/buttonStyles'
import type { RoundedScrollConfig } from '../scroll/roundedScroll'

export const MENU_SIZES = ['compact', 'sm', 'md', 'lg'] as const

export type MenuSize = (typeof MENU_SIZES)[number]

function remToPx(rem: string): number {
  return parseFloat(rem) * 16
}

function menuRowHeightPx(menuSize: MenuSize): number {
  return remToPx(buttonMinHeightRem[menuItemButtonSize[menuSize]])
}

/** Dropdown selector row scale — panel `menuSize` matches row [Button](Button.tsx) size 1:1. */
export const menuItemButtonSize: Record<MenuSize, ButtonSize> = {
  compact: 'xs',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
}

export const menuSizeClass: Record<MenuSize, string> = {
  compact: 'theme-menu--compact',
  sm: 'theme-menu--sm',
  md: 'theme-menu--md',
  lg: 'theme-menu--lg',
}

/** Row scale override — pairs with `.theme-menu--items-*` in [button-extras.css](../css/effects/button-extras.css) */
export function menuItemSizeClass(itemSize?: ButtonSize): string {
  return itemSize ? `theme-menu--items-${itemSize}` : ''
}

type MenuPanelMetrics = {
  width: number
  rowHeight: number
  paddingBlockStart: number
  paddingBlockEnd: number
  itemGap: number
  visibleRows: number
  maxHeight: number
}

function buildMenuPanelMetrics({
  width,
  rowHeight,
  paddingBlockStart,
  paddingBlockEnd,
  itemGap,
  visibleRows,
}: Omit<MenuPanelMetrics, 'maxHeight'>): MenuPanelMetrics {
  return {
    width,
    rowHeight,
    paddingBlockStart,
    paddingBlockEnd,
    itemGap,
    visibleRows,
    maxHeight:
      paddingBlockStart +
      paddingBlockEnd +
      visibleRows * rowHeight +
      Math.max(0, visibleRows - 1) * itemGap,
  }
}

/** Placement + scroll cap — keep in sync with `--theme-menu-*` tokens in button-extras.css */
export const menuPanelMetrics: Record<MenuSize, MenuPanelMetrics> = {
  compact: buildMenuPanelMetrics({
    width: 7.5 * 16,
    rowHeight: remToPx('1.625rem'),
    paddingBlockStart: 4.5,
    paddingBlockEnd: 5,
    itemGap: 1,
    visibleRows: 6,
  }),
  sm: buildMenuPanelMetrics({
    width: 8.5 * 16,
    rowHeight: menuRowHeightPx('sm'),
    paddingBlockStart: 8,
    paddingBlockEnd: 12,
    itemGap: 2.24,
    visibleRows: 4,
  }),
  md: buildMenuPanelMetrics({
    width: 10 * 16,
    rowHeight: menuRowHeightPx('md'),
    paddingBlockStart: 10,
    paddingBlockEnd: 14,
    itemGap: 3.2,
    visibleRows: 5,
  }),
  lg: buildMenuPanelMetrics({
    width: 12 * 16,
    rowHeight: menuRowHeightPx('lg'),
    paddingBlockStart: 12,
    paddingBlockEnd: 16,
    itemGap: 4.16,
    visibleRows: 5,
  }),
}

/** Extra panel width so a `detail` second line does not wrap into the next row. */
export const MENU_DETAIL_PANEL_MIN_WIDTH_PX = 18 * 16

/** Two-line row (label + caption) — used when any item has `detail`. */
export const MENU_DETAIL_ROW_HEIGHT_PX = 2.75 * 16

const MENU_DETAIL_ITEM_GAP_PX = 4.48

export function menuPanelWidthPx(menuSize: MenuSize, hasDetail = false): number {
  const width = menuPanelMetrics[menuSize].width
  return hasDetail ? Math.max(width, MENU_DETAIL_PANEL_MIN_WIDTH_PX) : width
}

/** Capped panel height for viewport placement. */
export function menuPanelDisplayHeight(
  itemCount: number,
  menuSize: MenuSize,
  hasDetail = false,
): number {
  const { rowHeight, paddingBlockStart, paddingBlockEnd, itemGap, visibleRows, maxHeight } =
    menuPanelMetrics[menuSize]
  const usedRow = hasDetail ? Math.max(rowHeight, MENU_DETAIL_ROW_HEIGHT_PX) : rowHeight
  const usedGap = hasDetail ? Math.max(itemGap, MENU_DETAIL_ITEM_GAP_PX) : itemGap
  const contentHeight =
    paddingBlockStart +
    paddingBlockEnd +
    itemCount * usedRow +
    Math.max(0, itemCount - 1) * usedGap
  const cap = hasDetail
    ? paddingBlockStart +
      paddingBlockEnd +
      visibleRows * usedRow +
      Math.max(0, visibleRows - 1) * usedGap
    : maxHeight
  return Math.min(contentHeight, cap)
}

/** Compact curved rail — keep `radius` in sync with `--theme-rounded-scroll-path-radius` in button-extras.css */
export const menuScrollConfig: Record<MenuSize, Partial<RoundedScrollConfig>> = {
  compact: {
    radius: 7,
    scrollPadding: 5,
    stroke: 2,
    inset: 0,
    trail: 6,
    thumb: 18,
    finish: 2,
    offsetCorner: -22,
    offsetEnd: 10,
    trackFill: 1,
  },
  sm: {
    radius: 10,
    scrollPadding: 8,
    stroke: 2,
    inset: 0,
    trail: 8,
    thumb: 24,
    finish: 3,
    offsetCorner: -28,
    offsetEnd: 12,
    trackFill: 1,
  },
  md: {
    radius: 12,
    scrollPadding: 10,
    stroke: 2,
    inset: 0,
    trail: 9,
    thumb: 28,
    finish: 3,
    offsetCorner: -32,
    offsetEnd: 14,
    trackFill: 1,
  },
  lg: {
    radius: 14,
    scrollPadding: 12,
    stroke: 2,
    inset: 0,
    trail: 10,
    thumb: 32,
    finish: 4,
    offsetCorner: -36,
    offsetEnd: 16,
    trackFill: 1,
  },
}
