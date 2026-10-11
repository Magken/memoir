/** Shared overflow (“more”) rail behaviour for mini / micro stacked menus. */

export const STACKED_MENU_MORE_DEFAULT_LABEL = 'More options'

export type StackedMenuOrientation = 'vertical' | 'horizontal'

export function stackedMenuItemInList<T extends { id: string }>(
  items: readonly T[] | undefined,
  id: string,
): boolean {
  return Boolean(items?.some((item) => item.id === id))
}
