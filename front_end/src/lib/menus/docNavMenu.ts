import type { LucideIcon } from 'lucide-react'
import { menuSizeClass, type MenuSize } from './menuControls'
import {
  flattenSectionLinks,
  sectionSubLinkIds,
  type HorizontalMenuItem,
  type HorizontalMenuSection,
} from './horizontalMenu'

export { HORIZONTAL_MENU_SIZES as DOC_NAV_MENU_SIZES, type HorizontalMenuSize as DocNavMenuSize } from './horizontalMenu'

export const DOC_NAV_BODY_MAX_HEIGHTS = [16, 20, 24, 32] as const

export type DocNavBodyMaxHeight = (typeof DOC_NAV_BODY_MAX_HEIGHTS)[number]

export type DocNavMenuLink = {
  id: string
  label: string
  icon?: LucideIcon
  disabled?: boolean
  /** Leave Theme lab for a full Page Scene (e.g. `/theme/vurify/landing`). */
  href?: string
}

export type DocNavMenuSection = {
  id: string
  label: string
  icon?: LucideIcon
  children: readonly DocNavMenuNode[]
}

export type DocNavMenuNode =
  | ({ type: 'link' } & DocNavMenuLink)
  | ({ type: 'section' } & DocNavMenuSection)

/** Matches `--theme-dnav-duration` in [doc-nav-menu.css](../css/effects/doc-nav-menu.css) */
export const DOC_NAV_MENU_DURATION_MS = 340

export const docNavMenuSizeClass = {
  sm: 'theme-dnav--sm',
  md: 'theme-dnav--md',
  lg: 'theme-dnav--lg',
} as const satisfies Record<'sm' | 'md' | 'lg', string>

export const docNavMenuPanelSizeClass = menuSizeClass

export const docNavBodyMaxHeightClass: Record<DocNavBodyMaxHeight, string> = {
  16: 'theme-dnav--body-max-16',
  20: 'theme-dnav--body-max-20',
  24: 'theme-dnav--body-max-24',
  32: 'theme-dnav--body-max-32',
}

export function docNavMenuPanelSize(navSize: MenuSize): MenuSize {
  return navSize
}

export function docNavSectionContainsId(section: DocNavMenuSection, targetId: string): boolean {
  for (const child of section.children) {
    if (child.type === 'link' && child.id === targetId) return true
    if (child.type === 'section' && docNavSectionContainsId(child, targetId)) return true
  }
  return false
}

export function docNavAncestorSectionIds(
  nodes: readonly DocNavMenuNode[],
  targetId: string,
  trail: string[] = [],
): string[] | null {
  for (const node of nodes) {
    if (node.type === 'link' && node.id === targetId) {
      return trail
    }
    if (node.type === 'section') {
      const found = docNavAncestorSectionIds(node.children, targetId, [...trail, node.id])
      if (found) return found
    }
  }
  return null
}

export function expandedSectionIdsForSelection(
  nodes: readonly DocNavMenuNode[],
  selectedId?: string,
): Set<string> {
  if (!selectedId) return new Set()
  return new Set(docNavAncestorSectionIds(nodes, selectedId) ?? [])
}

/** Innermost section on the path to `selectedId` — hosts the sliding diamond marker. */
export function docNavInnermostAncestorSectionId(
  nodes: readonly DocNavMenuNode[],
  selectedId?: string,
): string | null {
  if (!selectedId) return null
  const ancestors = docNavAncestorSectionIds(nodes, selectedId)
  if (!ancestors?.length) return null
  return ancestors[ancestors.length - 1] ?? null
}

/** Map [HorizontalMenu](horizontalMenu.ts) rows into a recursive doc-nav tree. */
export function horizontalItemsToDocNavNodes(
  items: readonly HorizontalMenuItem[],
): DocNavMenuNode[] {
  return items.map((item) => {
    if (item.type === 'link') {
      return { type: 'link', id: item.id, label: item.label, icon: item.icon, disabled: item.disabled }
    }

    const children: DocNavMenuNode[] = []

    if (item.subPanelVariant === 'links' && item.linkColumns?.length) {
      for (const column of item.linkColumns) {
        children.push({
          type: 'section',
          id: column.id,
          label: column.label,
          icon: column.icon,
          children: column.links.map((link) => ({
            type: 'link' as const,
            id: link.id,
            label: link.label,
            icon: link.icon,
            disabled: link.disabled,
          })),
        })
      }
    } else {
      children.push(
        ...flattenSectionLinks(item).map((link) => ({
          type: 'link' as const,
          id: link.id,
          label: link.label,
          icon: link.icon,
          disabled: link.disabled,
        })),
      )
    }

    return {
      type: 'section',
      id: item.id,
      label: item.label,
      icon: item.icon,
      children,
    }
  })
}

/** @deprecated Use `DocNavMenuNode` — kept for horizontal adapter callers */
export type DocNavMenuItem = HorizontalMenuItem

export function docNavSectionIdsForLink(
  items: readonly HorizontalMenuItem[],
  linkId: string,
): string[] {
  return items
    .filter(
      (item): item is { type: 'section' } & HorizontalMenuSection =>
        item.type === 'section' && sectionSubLinkIds(item).includes(linkId),
    )
    .map((item) => item.id)
}
