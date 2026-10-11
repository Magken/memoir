import type { FlowDocument, FlowGroup } from './types'

export const FLOW_GROUP_NODE_TYPE = 'flowGroup'
export const FLOW_GROUP_PADDING = 24
export const FLOW_GROUP_HEADER = 28

/** Fallback when a node has not been measured yet (compact Card). */
export const FLOW_GROUP_FALLBACK_SIZE = { width: 200, height: 88 }

function nextGroupId() {
  return `group-${crypto.randomUUID().slice(0, 8)}`
}

function entityParentId(doc: FlowDocument, id: string): string | null {
  const node = doc.nodes.find((candidate) => candidate.id === id)
  if (node) return node.groupId ?? null
  return doc.groups.find((candidate) => candidate.id === id)?.parentGroupId ?? null
}

function selectedEntityIds(doc: FlowDocument, ids: readonly string[]): string[] {
  const nodeIds = new Set(doc.nodes.map((node) => node.id))
  const groupIds = new Set((doc.groups ?? []).map((group) => group.id))
  const selected = [...new Set(ids)].filter((id) => nodeIds.has(id) || groupIds.has(id))
  const selectedSet = new Set(selected)
  const groupById = new Map((doc.groups ?? []).map((group) => [group.id, group]))

  return selected.filter((id) => {
    let parentId = entityParentId(doc, id)
    const visited = new Set<string>()
    while (parentId && !visited.has(parentId)) {
      if (selectedSet.has(parentId)) return false
      visited.add(parentId)
      parentId = groupById.get(parentId)?.parentGroupId ?? null
    }
    return true
  })
}

/** True when at least two sibling-capable nodes and/or group frames are selected. */
export function canCreateFlowGroup(doc: FlowDocument, ids: readonly string[]): boolean {
  return selectedEntityIds(doc, ids).length >= 2
}

/**
 * True when selection includes grouped elements or a group frame id.
 * `ids` may contain element ids and/or `FlowGroup.id` frame ids.
 */
export function canDisassembleFlowGroups(doc: FlowDocument, ids: readonly string[]): boolean {
  if (ids.length === 0) return false
  const selected = new Set(ids)
  if ((doc.groups ?? []).some((group) => selected.has(group.id))) return true
  return doc.nodes.some((node) => selected.has(node.id) && Boolean(node.groupId))
}

function syncDirectNodeIds(nodes: FlowDocument['nodes'], groups: FlowGroup[]): FlowGroup[] {
  return groups.map((group) => ({
    ...group,
    nodeIds: nodes.filter((node) => node.groupId === group.id).map((node) => node.id),
  }))
}

/**
 * Create a group from selected element nodes and/or group frames.
 * When all selected entities share a parent, the new group is nested inside it.
 */
export function createFlowGroup(
  doc: FlowDocument,
  ids: readonly string[],
  label = 'Group',
): FlowDocument {
  const selected = selectedEntityIds(doc, ids)
  if (selected.length < 2) return doc

  const nodeIdSet = new Set(doc.nodes.map((node) => node.id))
  const groupIdSet = new Set((doc.groups ?? []).map((group) => group.id))
  const selectedNodeIds = new Set(selected.filter((id) => nodeIdSet.has(id)))
  const selectedGroupIds = new Set(selected.filter((id) => groupIdSet.has(id)))
  const parents = new Set(selected.map((id) => entityParentId(doc, id)))
  const parentGroupId = parents.size === 1 ? ([...parents][0] ?? null) : null
  const groupId = nextGroupId()

  const nodes = doc.nodes.map((node) =>
    selectedNodeIds.has(node.id) ? { ...node, groupId } : node,
  )
  const groups = (doc.groups ?? []).map((group) =>
    selectedGroupIds.has(group.id) ? { ...group, parentGroupId: groupId } : group,
  )
  groups.push({
    id: groupId,
    label,
    nodeIds: [...selectedNodeIds],
    parentGroupId,
  })

  return {
    ...doc,
    nodes,
    groups: syncDirectNodeIds(nodes, groups),
  }
}

/**
 * Remove selected groups (or the owning groups of selected nodes).
 * Direct nodes and child groups are promoted one level instead of flattened to root.
 */
export function disassembleFlowGroups(
  doc: FlowDocument,
  ids: readonly string[],
): FlowDocument {
  const selected = new Set(ids)
  if (selected.size === 0) return doc

  const groups = doc.groups ?? []
  const groupById = new Map(groups.map((group) => [group.id, group]))
  const touched = new Set<string>()
  for (const group of groups) {
    if (selected.has(group.id)) touched.add(group.id)
  }
  for (const node of doc.nodes) {
    if (selected.has(node.id) && node.groupId) touched.add(node.groupId)
  }
  if (touched.size === 0) return doc

  const survivingParent = (groupId: string | null | undefined): string | null => {
    let current = groupId ?? null
    const visited = new Set<string>()
    while (current && touched.has(current) && !visited.has(current)) {
      visited.add(current)
      current = groupById.get(current)?.parentGroupId ?? null
    }
    return current
  }

  const nodes = doc.nodes.map((node) =>
    node.groupId && touched.has(node.groupId)
      ? { ...node, groupId: survivingParent(node.groupId) }
      : node,
  )
  const survivingGroups = groups
    .filter((group) => !touched.has(group.id))
    .map((group) =>
      group.parentGroupId && touched.has(group.parentGroupId)
        ? { ...group, parentGroupId: survivingParent(group.parentGroupId) }
        : group,
    )

  return {
    ...doc,
    nodes,
    groups: syncDirectNodeIds(nodes, survivingGroups),
  }
}

export type FlowNodeSizeMap = ReadonlyMap<string, { width: number; height: number }>

/** Absolute AABB for direct nodes plus recursively nested child group frames. */
export function measureFlowGroupBounds(
  doc: FlowDocument,
  group: FlowGroup,
  sizeFor: FlowNodeSizeMap | ((nodeId: string) => { width: number; height: number }) = () =>
    FLOW_GROUP_FALLBACK_SIZE,
  visiting = new Set<string>(),
): { x: number; y: number; width: number; height: number } | null {
  if (visiting.has(group.id)) return null
  const nextVisiting = new Set(visiting)
  nextVisiting.add(group.id)

  const resolve =
    typeof sizeFor === 'function'
      ? sizeFor
      : (id: string) => sizeFor.get(id) ?? FLOW_GROUP_FALLBACK_SIZE
  const directNodes = doc.nodes.filter(
    (node) => node.groupId === group.id || group.nodeIds.includes(node.id),
  )
  const childGroups = (doc.groups ?? []).filter(
    (candidate) => candidate.parentGroupId === group.id,
  )

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const node of directNodes) {
    const x = node.x ?? 0
    const y = node.y ?? 0
    const { width, height } = resolve(node.id)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + width)
    maxY = Math.max(maxY, y + height)
  }

  for (const child of childGroups) {
    const bounds = measureFlowGroupBounds(doc, child, sizeFor, nextVisiting)
    if (!bounds) continue
    minX = Math.min(minX, bounds.x)
    minY = Math.min(minY, bounds.y)
    maxX = Math.max(maxX, bounds.x + bounds.width)
    maxY = Math.max(maxY, bounds.y + bounds.height)
  }

  if (!Number.isFinite(minX)) return null
  const pad = FLOW_GROUP_PADDING
  const header = FLOW_GROUP_HEADER
  return {
    x: minX - pad,
    y: minY - pad - header,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2 + header,
  }
}
