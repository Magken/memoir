import type { ComponentType } from 'react'

export const NANO_ANCHOR_MENU_VARIANTS = ['list', 'anchor', 'micro'] as const

export type NanoAnchorMenuVariant = (typeof NANO_ANCHOR_MENU_VARIANTS)[number]

/** Spy / sticky rail variants (not the bordered list card). */
export function isNanoAnchorRailVariant(variant: NanoAnchorMenuVariant): boolean {
  return variant === 'anchor' || variant === 'micro'
}

export type NanoAnchorMenuLevel = 2 | 3 | 4

export type NanoAnchorMenuEntry = {
  id: string
  label: string
  level: NanoAnchorMenuLevel
  /** Optional compact meta chips under the label (e.g. “3 tests”, “Python”). */
  tags?: readonly string[]
  /** Optional type icon before the label (Contents kind scan). */
  icon?: ComponentType<{ className?: string }>
}

export type NanoAnchorMenuNode = NanoAnchorMenuEntry & {
  children: NanoAnchorMenuNode[]
}

export type NanoAnchorMenuScrollTarget = {
  id: string
  element: HTMLElement | null
}

export function buildNanoAnchorMenuTree(
  entries: readonly NanoAnchorMenuEntry[],
): NanoAnchorMenuNode[] {
  const roots: NanoAnchorMenuNode[] = []
  const stack: NanoAnchorMenuNode[] = []

  for (const entry of entries) {
    const node: NanoAnchorMenuNode = { ...entry, children: [] }

    while (stack.length > 0 && stack[stack.length - 1]!.level >= node.level) {
      stack.pop()
    }

    if (stack.length === 0) {
      roots.push(node)
    } else {
      stack[stack.length - 1]!.children.push(node)
    }

    stack.push(node)
  }

  return roots
}

/** Ancestor node ids from root → parent of `targetId` (empty if target is a root). */
export function nanoAnchorAncestorIds(
  nodes: readonly NanoAnchorMenuNode[],
  targetId: string,
  path: string[] = [],
): string[] | null {
  for (const node of nodes) {
    if (node.id === targetId) return path
    const found = nanoAnchorAncestorIds(node.children, targetId, [...path, node.id])
    if (found) return found
  }
  return null
}

/**
 * When the spied id sits under a collapsed branch, highlight the nearest
 * still-visible ancestor so the TOC always shows where you are.
 */
export function nanoAnchorVisibleHighlightId(
  nodes: readonly NanoAnchorMenuNode[],
  targetId: string | null,
  expandedIds: ReadonlySet<string>,
  collapsible: boolean,
): string | null {
  if (!targetId) return null
  if (!collapsible) return targetId
  const ancestors = nanoAnchorAncestorIds(nodes, targetId)
  if (!ancestors) return targetId
  for (const ancestorId of ancestors) {
    if (!expandedIds.has(ancestorId)) return ancestorId
  }
  return targetId
}
