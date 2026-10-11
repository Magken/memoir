import type { LucideIcon } from 'lucide-react'
import {
  Circle,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Undo2,
  User,
} from 'lucide-react'
import { menuSizeClass, type MenuSize } from './menuControls'
import {
  flattenSectionLinks,
  sectionSubLinkIds,
  type HorizontalMenuItem,
  type HorizontalMenuSection,
} from './horizontalMenu'

export {
  HORIZONTAL_MENU_SIZES as DASHBOARD_MENU_SIZES,
  type HorizontalMenuSize as DashboardMenuSize,
} from './horizontalMenu'

export const DASHBOARD_MENU_BODY_MAX_HEIGHTS = [16, 20, 24, 32] as const

export type DashboardBodyMaxHeight = (typeof DASHBOARD_MENU_BODY_MAX_HEIGHTS)[number]

export type DashboardMenuLink = {
  id: string
  label: string
  icon?: LucideIcon
  disabled?: boolean
}

export type DashboardMenuSection = {
  id: string
  label: string
  icon?: LucideIcon
  children: readonly DashboardMenuNode[]
}

export type DashboardMenuNode =
  | ({ type: 'link' } & DashboardMenuLink)
  | ({ type: 'section' } & DashboardMenuSection)

/** Fallback when a row has no icon — required for icon-only collapsed rail */
export const DASHBOARD_MENU_FALLBACK_ICON = Circle

/**
 * Temporary page-rail links for `/dashboard` — icon + label at VurifyMenuButton `md`
 * (same size language as home SceneStack submenu rows). Wire real targets later.
 */
export const DASHBOARD_PAGE_MENU_ITEMS: readonly DashboardMenuLink[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'cv', label: 'Your CV', icon: FileText },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const

/** Agency-only Interviews rail entry (organisation dashboard). */
export const DASHBOARD_INTERVIEWS_MENU_ITEM: DashboardMenuLink = {
  id: 'interviews',
  label: 'Interviews',
  icon: ClipboardList,
}

/** Bottom-docked page-rail actions (Back home · future utilities). */
export const DASHBOARD_PAGE_MENU_FOOTER_ITEMS: readonly DashboardMenuLink[] = [
  { id: 'home', label: 'Back home', icon: Undo2 },
] as const

/** Build page-rail items; append Interviews for organisation accounts. */
export function buildDashboardPageMenuItems(
  kind: 'personal' | 'organisation' | 'unknown' | null | undefined,
): DashboardMenuLink[] {
  if (kind === 'organisation') {
    return [
      ...DASHBOARD_PAGE_MENU_ITEMS.slice(0, 3),
      DASHBOARD_INTERVIEWS_MENU_ITEM,
      ...DASHBOARD_PAGE_MENU_ITEMS.slice(3),
    ]
  }
  return [...DASHBOARD_PAGE_MENU_ITEMS]
}

/** Matches `--theme-dash-duration` in [dashboard-menu.css](../css/effects/dashboard-menu.css) */
export const DASHBOARD_MENU_DURATION_MS = 340

export const dashboardMenuSizeClass = {
  sm: 'theme-dash--sm',
  md: 'theme-dash--md',
  lg: 'theme-dash--lg',
} as const satisfies Record<'sm' | 'md' | 'lg', string>

export const dashboardMenuPanelSizeClass = menuSizeClass

export const dashboardBodyMaxHeightClass: Record<DashboardBodyMaxHeight, string> = {
  16: 'theme-dash--body-max-16',
  20: 'theme-dash--body-max-20',
  24: 'theme-dash--body-max-24',
  32: 'theme-dash--body-max-32',
}

export function dashboardMenuPanelSize(navSize: MenuSize): MenuSize {
  return navSize
}

export function flattenDashboardLinks(
  nodes: readonly DashboardMenuNode[],
  links: DashboardMenuLink[] = [],
): DashboardMenuLink[] {
  for (const node of nodes) {
    if (node.type === 'link') {
      links.push({
        id: node.id,
        label: node.label,
        icon: node.icon,
        disabled: node.disabled,
      })
    } else {
      flattenDashboardLinks(node.children, links)
    }
  }
  return links
}

export function dashboardSectionContainsId(section: DashboardMenuSection, targetId: string): boolean {
  for (const child of section.children) {
    if (child.type === 'link' && child.id === targetId) return true
    if (child.type === 'section' && dashboardSectionContainsId(child, targetId)) return true
  }
  return false
}

export function dashboardAncestorSectionIds(
  nodes: readonly DashboardMenuNode[],
  targetId: string,
  trail: string[] = [],
): string[] | null {
  for (const node of nodes) {
    if (node.type === 'link' && node.id === targetId) {
      return trail
    }
    if (node.type === 'section') {
      const found = dashboardAncestorSectionIds(node.children, targetId, [...trail, node.id])
      if (found) return found
    }
  }
  return null
}

export function expandedDashboardSectionIdsForSelection(
  nodes: readonly DashboardMenuNode[],
  selectedId?: string,
): Set<string> {
  if (!selectedId) return new Set()
  return new Set(dashboardAncestorSectionIds(nodes, selectedId) ?? [])
}

export function dashboardInnermostAncestorSectionId(
  nodes: readonly DashboardMenuNode[],
  selectedId?: string,
): string | null {
  if (!selectedId) return null
  const ancestors = dashboardAncestorSectionIds(nodes, selectedId)
  if (!ancestors?.length) return null
  return ancestors[ancestors.length - 1] ?? null
}

/** Map [HorizontalMenu](horizontalMenu.ts) rows into a recursive dashboard tree. */
export function horizontalItemsToDashboardNodes(
  items: readonly HorizontalMenuItem[],
): DashboardMenuNode[] {
  return items.map((item) => {
    if (item.type === 'link') {
      return { type: 'link', id: item.id, label: item.label, icon: item.icon, disabled: item.disabled }
    }

    const children: DashboardMenuNode[] = []

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

/** @deprecated Use `DashboardMenuNode` — kept for horizontal adapter callers */
export type DashboardMenuItem = HorizontalMenuItem

export function dashboardSectionIdsForLink(
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
