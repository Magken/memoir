export const DOTTED_NAV_MENU_ORIENTATIONS = ['horizontal', 'vertical'] as const

export const DOTTED_NAV_MENU_SIZES = ['sm', 'md', 'lg'] as const

export type DottedNavMenuOrientation = (typeof DOTTED_NAV_MENU_ORIENTATIONS)[number]

export type DottedNavMenuSize = (typeof DOTTED_NAV_MENU_SIZES)[number]

export type DottedNavMenuItem = {
  id: string
  label: string
  disabled?: boolean
}

export const dottedNavMenuOrientationClass: Record<DottedNavMenuOrientation, string> = {
  horizontal: 'theme-dotnav--horizontal',
  vertical: 'theme-dotnav--vertical',
}

export const dottedNavMenuSizeClass: Record<DottedNavMenuSize, string> = {
  sm: 'theme-dotnav--sm',
  md: 'theme-dotnav--md',
  lg: 'theme-dotnav--lg',
}

export function dottedNavMenuSelectedIndex(
  items: readonly DottedNavMenuItem[],
  selectedId: string,
): number {
  const index = items.findIndex((item) => item.id === selectedId)
  return index >= 0 ? index : 0
}
