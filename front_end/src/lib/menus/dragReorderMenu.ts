import type { LucideIcon } from 'lucide-react'
import type { ButtonSize } from '../ui/buttonStyles'
import { menuSizeClass, type MenuSize } from './menuControls'

export const DRAG_REORDER_MENU_SIZES = ['sm', 'md', 'lg'] as const

export type DragReorderMenuSize = (typeof DRAG_REORDER_MENU_SIZES)[number]

export const DRAG_REORDER_BODY_MAX_HEIGHTS = [16, 20, 24, 32] as const

export type DragReorderBodyMaxHeight = (typeof DRAG_REORDER_BODY_MAX_HEIGHTS)[number]

export type DragReorderMenuAction = {
  id: string
  label: string
  disabled?: boolean
}

export type DragReorderMenuLink = {
  id: string
  label: string
  icon?: LucideIcon
  disabled?: boolean
  actions?: readonly DragReorderMenuAction[]
}

export type DragReorderMenuSection = {
  id: string
  label: string
  icon?: LucideIcon
  children: readonly DragReorderMenuNode[]
  actions?: readonly DragReorderMenuAction[]
}

export type DragReorderMenuNode =
  | ({ type: 'link' } & DragReorderMenuLink)
  | ({ type: 'section' } & DragReorderMenuSection)

/** Flat leaf row — alias for link nodes without `type` in demos */
export type DragReorderMenuItem = DragReorderMenuLink

export type DragReorderMenuOrder = {
  /** Root sibling ids — sections and links */
  root: string[]
  /** Per-section child sibling ids */
  sections: Record<string, string[]>
}

export const dragReorderMenuButtonSize: Record<DragReorderMenuSize, ButtonSize> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
}

export const dragReorderMenuGripSize: Record<DragReorderMenuSize, ButtonSize> = {
  sm: 'xs',
  md: 'sm',
  lg: 'md',
}

export const dragReorderMenuSizeClass: Record<DragReorderMenuSize, string> = {
  sm: 'theme-dreorder--sm',
  md: 'theme-dreorder--md',
  lg: 'theme-dreorder--lg',
}

export const dragReorderMenuPanelSizeClass = menuSizeClass

export const dragReorderBodyMaxHeightClass: Record<DragReorderBodyMaxHeight, string> = {
  16: 'theme-dreorder--body-max-16',
  20: 'theme-dreorder--body-max-20',
  24: 'theme-dreorder--body-max-24',
  32: 'theme-dreorder--body-max-32',
}

export const DRAG_REORDER_DEFAULT_ACTION_TRIGGER_SIZE: ButtonSize = 'xxs'
export const DRAG_REORDER_DEFAULT_ACTION_MENU_SIZE: MenuSize = 'compact'

export type DragReorderDropPlacement = 'before' | 'after'

export type DragReorderItemShift = -1 | 0 | 1

export function normalizeDragReorderNodes(
  items: readonly (DragReorderMenuItem | DragReorderMenuNode)[],
): DragReorderMenuNode[] {
  return items.map((item) => {
    if ('type' in item && (item.type === 'link' || item.type === 'section')) {
      return item
    }
    return { type: 'link', ...item }
  })
}

function collectSectionOrders(
  nodes: readonly DragReorderMenuNode[],
  acc: Record<string, string[]> = {},
): Record<string, string[]> {
  for (const node of nodes) {
    if (node.type === 'section') {
      acc[node.id] = node.children.map((child) => child.id)
      collectSectionOrders(node.children, acc)
    }
  }
  return acc
}

export function dragReorderMenuDefaultOrder(
  items: readonly (DragReorderMenuItem | DragReorderMenuNode)[],
): DragReorderMenuOrder {
  const nodes = normalizeDragReorderNodes(items)
  return {
    root: nodes.map((node) => node.id),
    sections: collectSectionOrders(nodes),
  }
}

export function dragReorderOrderFromRoot(root: readonly string[]): DragReorderMenuOrder {
  return { root: [...root], sections: {} }
}

export function dragReorderRootIds(order: DragReorderMenuOrder): string[] {
  return [...order.root]
}

export function siblingOrderForParent(
  order: DragReorderMenuOrder,
  parentSectionId: string | null,
): string[] {
  if (parentSectionId === null) return [...order.root]
  return [...(order.sections[parentSectionId] ?? [])]
}

export function setSiblingOrder(
  order: DragReorderMenuOrder,
  parentSectionId: string | null,
  siblingIds: string[],
): DragReorderMenuOrder {
  if (parentSectionId === null) {
    return { ...order, root: siblingIds }
  }
  return {
    ...order,
    sections: { ...order.sections, [parentSectionId]: siblingIds },
  }
}

/** Move `draggedId` before `targetId` in a sibling list. */
export function reorderDragMenuIds(
  order: readonly string[],
  draggedId: string,
  targetId: string,
): string[] {
  return reorderDragMenuIdsAt(order, draggedId, targetId, 'before')
}

/** Move `draggedId` before or after `targetId` in a sibling list. */
export function reorderDragMenuIdsAt(
  order: readonly string[],
  draggedId: string,
  targetId: string,
  placement: DragReorderDropPlacement,
): string[] {
  if (draggedId === targetId) return [...order]
  const next = order.filter((id) => id !== draggedId)
  const targetIndex = next.indexOf(targetId)
  if (targetIndex === -1) return [...order]
  const insertIndex = placement === 'after' ? targetIndex + 1 : targetIndex
  next.splice(insertIndex, 0, draggedId)
  return next
}

/** Insert index in the current sibling list (visual shift math). */
export function dragReorderInsertIndex(
  siblingIds: readonly string[],
  targetId: string,
  placement: DragReorderDropPlacement,
): number {
  const targetIdx = siblingIds.indexOf(targetId)
  if (targetIdx === -1) return -1
  return placement === 'before' ? targetIdx : targetIdx + 1
}

/** Insert index among visible siblings (excludes dragged id). */
export function dragReorderVisibleInsertIndex(
  siblingIds: readonly string[],
  draggedId: string,
  dropTargetId: string,
  placement: DragReorderDropPlacement,
): number {
  const insertIdx = dragReorderInsertIndex(siblingIds, dropTargetId, placement)
  const dragIdx = siblingIds.indexOf(draggedId)
  if (insertIdx === -1 || dragIdx === -1) return -1
  if (dragIdx < insertIdx) return insertIdx - 1
  return insertIdx
}

export type DragReorderRowRect = {
  id: string
  rect: DOMRect
}

/** Pointer Y → insert index in sibling list (row rects only — not full section cards). */
export function dragReorderInsertIndexFromPointerY(
  clientY: number,
  rowRects: readonly DragReorderRowRect[],
  draggedId: string,
): number {
  const visible = rowRects.filter((entry) => entry.id !== draggedId)
  for (let index = 0; index < visible.length; index += 1) {
    const mid = visible[index].rect.top + visible[index].rect.height / 2
    if (clientY < mid) return index
  }
  return visible.length
}

/** Reorder siblings by moving `draggedId` to `insertIndex` (among siblings without dragged). */
export function dragReorderSiblingsAtInsertIndex(
  siblingIds: readonly string[],
  draggedId: string,
  insertIndex: number,
): string[] {
  const withoutDragged = siblingIds.filter((id) => id !== draggedId)
  const clamped = Math.max(0, Math.min(insertIndex, withoutDragged.length))
  const next = [...withoutDragged]
  next.splice(clamped, 0, draggedId)
  return next
}

export function dragReorderSiblingArraysEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false
  }
  return true
}

export function dragReorderParentSectionId(
  order: DragReorderMenuOrder,
  itemId: string,
): string | null | undefined {
  if (order.root.includes(itemId)) return null
  for (const [sectionId, childIds] of Object.entries(order.sections)) {
    if (childIds.includes(itemId)) return sectionId
  }
  return undefined
}

export function findDragReorderNode(
  nodes: readonly DragReorderMenuNode[],
  itemId: string,
): DragReorderMenuNode | undefined {
  for (const node of nodes) {
    if (node.id === itemId) return node
    if (node.type === 'section') {
      const found = findDragReorderNode(node.children, itemId)
      if (found) return found
    }
  }
  return undefined
}

export function dragReorderNodeDepth(
  nodes: readonly DragReorderMenuNode[],
  itemId: string,
  depth = 0,
): number {
  for (const node of nodes) {
    if (node.id === itemId) return depth
    if (node.type === 'section') {
      const found = dragReorderNodeDepth(node.children, itemId, depth + 1)
      if (found >= 0) return found
    }
  }
  return -1
}

export function dragReorderOrderWithSiblingList(
  order: DragReorderMenuOrder,
  parentSectionId: string | null,
  siblingIds: string[],
): DragReorderMenuOrder {
  return setSiblingOrder(order, parentSectionId, siblingIds)
}

/** Visual shift (px) for a row while dragging — DOM-only preview, no React reorder. */
export function dragReorderRowShiftPixels(
  itemId: string,
  siblingIds: readonly string[],
  draggedId: string,
  insertIndex: number,
  rowBlockPx: number,
): number {
  if (itemId === draggedId) return 0
  const dragIdx = siblingIds.indexOf(draggedId)
  const itemIdx = siblingIds.indexOf(itemId)
  if (dragIdx === -1 || itemIdx === -1) return 0

  const nextSiblings = dragReorderSiblingsAtInsertIndex(siblingIds, draggedId, insertIndex)
  const newDragIdx = nextSiblings.indexOf(draggedId)
  if (newDragIdx === -1) return 0

  if (dragIdx < newDragIdx) {
    if (itemIdx > dragIdx && itemIdx <= newDragIdx) return -rowBlockPx
  } else if (dragIdx > newDragIdx) {
    if (itemIdx >= newDragIdx && itemIdx < dragIdx) return rowBlockPx
  }
  return 0
}

/** Shift hint for rows while dragging — `-1` up · `1` down · `0` none. @deprecated Prefer placeholder slot in UI */
export function dragReorderItemShift(
  itemId: string,
  siblingIds: readonly string[],
  draggedId: string | null,
  dropTargetId: string | null,
  dropPlacement: DragReorderDropPlacement | null,
): DragReorderItemShift {
  if (!draggedId || !dropTargetId || !dropPlacement || draggedId === itemId) return 0
  if (draggedId === dropTargetId) return 0

  const dragIdx = siblingIds.indexOf(draggedId)
  const itemIdx = siblingIds.indexOf(itemId)
  if (dragIdx === -1 || itemIdx === -1 || siblingIds.indexOf(dropTargetId) === -1) return 0

  const insertIdx = dragReorderInsertIndex(siblingIds, dropTargetId, dropPlacement)
  if (insertIdx === -1) return 0

  if (dragIdx < insertIdx) {
    if (itemIdx > dragIdx && itemIdx < insertIdx) return -1
    if (itemIdx === insertIdx) return 1
    return 0
  }

  if (dragIdx > insertIdx) {
    if (itemIdx >= insertIdx && itemIdx < dragIdx) return 1
    return 0
  }

  return 0
}

export function dragReorderMenuPanelSize(navSize: DragReorderMenuSize): MenuSize {
  return navSize
}

export function orderedDragReorderNodes(
  nodes: readonly DragReorderMenuNode[],
  siblingIds: readonly string[],
): DragReorderMenuNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  return siblingIds.map((id) => byId.get(id)).filter((node): node is DragReorderMenuNode => Boolean(node))
}

export function dragReorderSectionContainsId(
  section: DragReorderMenuSection,
  targetId: string,
): boolean {
  for (const child of section.children) {
    if (child.type === 'link' && child.id === targetId) return true
    if (child.type === 'section' && dragReorderSectionContainsId(child, targetId)) return true
  }
  return false
}

export function dragReorderAncestorSectionIds(
  nodes: readonly DragReorderMenuNode[],
  targetId: string,
  trail: string[] = [],
): string[] | null {
  for (const node of nodes) {
    if (node.type === 'link' && node.id === targetId) {
      return trail
    }
    if (node.type === 'section') {
      const found = dragReorderAncestorSectionIds(node.children, targetId, [...trail, node.id])
      if (found) return found
    }
  }
  return null
}

export function expandedSectionIdsForSelection(
  nodes: readonly DragReorderMenuNode[],
  selectedId?: string,
): Set<string> {
  if (!selectedId) return new Set()
  return new Set(dragReorderAncestorSectionIds(nodes, selectedId) ?? [])
}

export function dragReorderActionsForNode(
  node: DragReorderMenuNode,
  depth: number,
  actionDepths: readonly number[],
  defaultLinkActions: readonly DragReorderMenuAction[],
  defaultSectionActions: readonly DragReorderMenuAction[],
): readonly DragReorderMenuAction[] {
  if (node.actions?.length) return node.actions
  if (!actionDepths.includes(depth)) return []
  return node.type === 'link' ? defaultLinkActions : defaultSectionActions
}

/** @deprecated Use `orderedDragReorderNodes` */
export function dragReorderMenuItemsInOrder(
  items: readonly DragReorderMenuItem[],
  order: readonly string[],
): DragReorderMenuItem[] {
  const byId = new Map(items.map((item) => [item.id, item]))
  return order.map((id) => byId.get(id)).filter((item): item is DragReorderMenuItem => Boolean(item))
}
