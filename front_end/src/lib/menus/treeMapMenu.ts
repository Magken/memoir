import type { LucideIcon } from 'lucide-react'
import { menuSizeClass, type MenuSize } from './menuControls'
import type { ButtonSize } from '../ui/buttonStyles'
import {
  flattenSectionLinks,
  sectionSubLinkIds,
  type HorizontalMenuItem,
  type HorizontalMenuSection,
} from './horizontalMenu'

export { HORIZONTAL_MENU_SIZES as TREE_MAP_MENU_SIZES, type HorizontalMenuSize as TreeMapMenuSize } from './horizontalMenu'

export const TREE_MAP_BODY_MAX_HEIGHTS = [16, 20, 24, 32] as const

export type TreeMapBodyMaxHeight = (typeof TREE_MAP_BODY_MAX_HEIGHTS)[number]

export type TreeMapMenuAction = {
  id: string
  label: string
  disabled?: boolean
}

export type TreeMapMenuLink = {
  id: string
  label: string
  icon?: LucideIcon
  disabled?: boolean
  actions?: readonly TreeMapMenuAction[]
}

export type TreeMapMenuSection = {
  id: string
  label: string
  icon?: LucideIcon
  children: readonly TreeMapMenuNode[]
  actions?: readonly TreeMapMenuAction[]
}

export type TreeMapMenuNode =
  | ({ type: 'link' } & TreeMapMenuLink)
  | ({ type: 'section' } & TreeMapMenuSection)

/** Matches `--theme-tmap-duration` in [tree-map-menu.css](../css/effects/tree-map-menu.css) */
export const TREE_MAP_MENU_DURATION_MS = 340

export const treeMapMenuSizeClass = {
  sm: 'theme-tmap--sm',
  md: 'theme-tmap--md',
  lg: 'theme-tmap--lg',
} as const satisfies Record<'sm' | 'md' | 'lg', string>

export const treeMapMenuPanelSizeClass = menuSizeClass

export const treeMapBodyMaxHeightClass: Record<TreeMapBodyMaxHeight, string> = {
  16: 'theme-tmap--body-max-16',
  20: 'theme-tmap--body-max-20',
  24: 'theme-tmap--body-max-24',
  32: 'theme-tmap--body-max-32',
}

/** Default tier action [MenuButton](../components/MenuButton.tsx) sizing — override via TreeMapMenu props */
export const TREE_MAP_DEFAULT_ACTION_TRIGGER_SIZE: ButtonSize = 'xxs'
export const TREE_MAP_DEFAULT_ACTION_MENU_SIZE: MenuSize = 'compact'

export function treeMapMenuPanelSize(navSize: MenuSize): MenuSize {
  return navSize
}

export function treeMapSectionContainsId(section: TreeMapMenuSection, targetId: string): boolean {
  for (const child of section.children) {
    if (child.type === 'link' && child.id === targetId) return true
    if (child.type === 'section' && treeMapSectionContainsId(child, targetId)) return true
  }
  return false
}

export function treeMapAncestorSectionIds(
  nodes: readonly TreeMapMenuNode[],
  targetId: string,
  trail: string[] = [],
): string[] | null {
  for (const node of nodes) {
    if (node.type === 'link' && node.id === targetId) {
      return trail
    }
    if (node.type === 'section') {
      const found = treeMapAncestorSectionIds(node.children, targetId, [...trail, node.id])
      if (found) return found
    }
  }
  return null
}

export function expandedSectionIdsForSelection(
  nodes: readonly TreeMapMenuNode[],
  selectedId?: string,
): Set<string> {
  if (!selectedId) return new Set()
  return new Set(treeMapAncestorSectionIds(nodes, selectedId) ?? [])
}

/** Innermost section on the path to `selectedId` — hosts the sliding diamond marker. */
export function treeMapInnermostAncestorSectionId(
  nodes: readonly TreeMapMenuNode[],
  selectedId?: string,
): string | null {
  if (!selectedId) return null
  const ancestors = treeMapAncestorSectionIds(nodes, selectedId)
  if (!ancestors?.length) return null
  return ancestors[ancestors.length - 1] ?? null
}

export function treeMapActionsForNode(
  node: TreeMapMenuNode,
  depth: number,
  actionDepths: readonly number[],
  defaultLinkActions: readonly TreeMapMenuAction[],
  defaultSectionActions: readonly TreeMapMenuAction[],
): readonly TreeMapMenuAction[] {
  if (node.actions?.length) return node.actions
  if (!actionDepths.includes(depth)) return []
  return node.type === 'link' ? defaultLinkActions : defaultSectionActions
}

/** Map [HorizontalMenu](horizontalMenu.ts) rows into a recursive doc-nav tree. */
export function horizontalItemsToTreeMapNodes(
  items: readonly HorizontalMenuItem[],
): TreeMapMenuNode[] {
  return items.map((item) => {
    if (item.type === 'link') {
      return { type: 'link', id: item.id, label: item.label, icon: item.icon, disabled: item.disabled }
    }

    const children: TreeMapMenuNode[] = []

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

/** @deprecated Use `TreeMapMenuNode` — kept for horizontal adapter callers */
export type TreeMapMenuItem = HorizontalMenuItem

export function treeMapSectionIdsForLink(
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
