import dagre from '@dagrejs/dagre'
import type { Edge, Node, Viewport } from '@xyflow/react'
import { MarkerType } from '@xyflow/react'
import { FLOW_EDGE_DEFAULT_STROKE_WIDTH } from './flowChromePresets'
import { FLOW_EDGE_LABEL_CHROME } from './flowEdgePresets'
import { getFlowElementDefinition, resolveNodePorts } from './flowElementRegistry'
import {
  FLOW_GROUP_FALLBACK_SIZE,
  FLOW_GROUP_HEADER,
  FLOW_GROUP_NODE_TYPE,
  FLOW_GROUP_PADDING,
  measureFlowGroupBounds,
  type FlowNodeSizeMap,
} from './flowGroups'
import type {
  FlowDocument,
  FlowEdge,
  FlowEdgeStyle,
  FlowElementNodeData,
  FlowGroupFrameData,
  FlowNode,
  FlowViewport,
} from './types'

const NODE_WIDTH = 280
const NODE_HEIGHT = 96

export type FlowDocumentToReactFlowOptions = {
  /** Prefer live measured node sizes so group frames don’t clip. */
  sizeById?: FlowNodeSizeMap
}

export function isFlowGroupRfNode(node: Node): boolean {
  return node.type === FLOW_GROUP_NODE_TYPE
}

function markerType(marker?: string): MarkerType | undefined {
  if (!marker || marker === 'none') return undefined
  if (marker === 'arrow') return MarkerType.Arrow
  if (marker === 'arrowclosed') return MarkerType.ArrowClosed
  return undefined
}

function flowNodeToRfData(node: FlowNode): FlowElementNodeData {
  const def = getFlowElementDefinition(node.kind)
  return {
    kind: node.kind,
    label: node.label,
    config: node.config,
    notes: node.notes,
    ports: resolveNodePorts(node),
    category: def.category,
    chrome: node.chrome,
    groupId: node.groupId ?? null,
  }
}

function absoluteFlowPosition(
  node: Node,
  byId: Map<string, Node>,
): { x: number; y: number } {
  let x = node.position.x
  let y = node.position.y
  let parentId = node.parentId
  while (parentId) {
    const parent = byId.get(parentId)
    if (!parent) break
    x += parent.position.x
    y += parent.position.y
    parentId = parent.parentId
  }
  return { x, y }
}

export function flowDocumentToReactFlow(
  doc: FlowDocument,
  options: FlowDocumentToReactFlowOptions = {},
): {
  nodes: Node[]
  edges: Edge[]
  viewport?: Viewport
} {
  const sizeById = options.sizeById
  const sizeFor = (id: string) => sizeById?.get(id) ?? FLOW_GROUP_FALLBACK_SIZE

  const frameNodes: Node<FlowGroupFrameData>[] = []
  const parentOrigin = new Map<string, { x: number; y: number }>()
  const groups = doc.groups ?? []
  const groupById = new Map(groups.map((group) => [group.id, group]))
  const groupDepth = (groupId: string): number => {
    let depth = 0
    let parentId = groupById.get(groupId)?.parentGroupId ?? null
    const visited = new Set<string>([groupId])
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId)
      depth += 1
      parentId = groupById.get(parentId)?.parentGroupId ?? null
    }
    return depth
  }

  for (const group of groups) {
    const bounds = measureFlowGroupBounds(doc, group, sizeFor)
    if (!bounds) continue
    parentOrigin.set(group.id, { x: bounds.x, y: bounds.y })
  }

  for (const group of [...groups].sort((a, b) => groupDepth(a.id) - groupDepth(b.id))) {
    const origin = parentOrigin.get(group.id)
    if (!origin) continue
    const parentId = group.parentGroupId ?? null
    const parent = parentId ? parentOrigin.get(parentId) : undefined
    const bounds = measureFlowGroupBounds(doc, group, sizeFor)
    if (!bounds) continue
    frameNodes.push({
      id: group.id,
      type: FLOW_GROUP_NODE_TYPE,
      position: parent
        ? { x: origin.x - parent.x, y: origin.y - parent.y }
        : { x: origin.x, y: origin.y },
      data: {
        label: group.label,
        notes: group.notes,
        parentGroupId: parentId,
      },
      style: { width: bounds.width, height: bounds.height },
      width: bounds.width,
      height: bounds.height,
      zIndex: 1 + groupDepth(group.id),
      selectable: true,
      draggable: true,
      ...(parentId && parent
        ? {
            parentId,
          }
        : {}),
      // No dragHandle — empty frame body (behind child nodes) starts the drag.
    })
  }

  const elementNodes: Node<FlowElementNodeData>[] = doc.nodes.map((node, index) => {
    const def = getFlowElementDefinition(node.kind)
    const absX = node.x ?? index * 48
    const absY = node.y ?? index * 32
    const groupId = node.groupId ?? null
    const origin = groupId ? parentOrigin.get(groupId) : undefined
    const position =
      origin != null
        ? { x: absX - origin.x, y: absY - origin.y }
        : { x: absX, y: absY }

    return {
      id: node.id,
      type: def.nodeComponent ?? 'flowElement',
      position,
      data: flowNodeToRfData(node),
      dragHandle: '.theme-flow-editor__node-header',
      ...(groupId && origin
        ? {
            parentId: groupId,
          }
        : {}),
    }
  })

  const edges: Edge[] = doc.edges.map((edge) => {
    const style = edge.style
    const strokeStyle: Record<string, string | number> = {
      strokeWidth: style?.strokeWidth ?? FLOW_EDGE_DEFAULT_STROKE_WIDTH,
    }
    if (style?.stroke) strokeStyle.stroke = style.stroke
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: edge.label,
      ...FLOW_EDGE_LABEL_CHROME,
      type: style?.type ?? 'default',
      // Explicit false clears RF’s animated path class (undefined can leave prior motion).
      animated: Boolean(style?.animated),
      markerStart: markerType(style?.markerStart),
      markerEnd:
        style?.markerEnd == null ? MarkerType.ArrowClosed : markerType(style.markerEnd),
      style: strokeStyle,
      data: {
        mapping: edge.mapping,
        stroke: style?.stroke,
        strokeWidth: style?.strokeWidth ?? FLOW_EDGE_DEFAULT_STROKE_WIDTH,
      },
    }
  })

  const viewport = doc.viewport
    ? { x: doc.viewport.x, y: doc.viewport.y, zoom: doc.viewport.zoom }
    : undefined

  // Parents must precede children for React Flow subflows.
  return { nodes: [...frameNodes, ...elementNodes], edges, viewport }
}

function rfEdgeStyle(edge: Edge): FlowEdgeStyle | undefined {
  const style: FlowEdgeStyle = {}
  if (edge.type && edge.type !== 'default') style.type = edge.type as FlowEdgeStyle['type']
  if (edge.animated) style.animated = true
  if (edge.markerStart === MarkerType.Arrow) style.markerStart = 'arrow'
  if (edge.markerStart === MarkerType.ArrowClosed) style.markerStart = 'arrowclosed'
  if (edge.markerEnd === MarkerType.Arrow) style.markerEnd = 'arrow'
  else if (edge.markerEnd === MarkerType.ArrowClosed) style.markerEnd = 'arrowclosed'
  else style.markerEnd = 'none'
  const data = edge.data as { stroke?: string; strokeWidth?: number } | undefined
  const stroke = (edge.style?.stroke as string | undefined) ?? data?.stroke
  const strokeWidth = (edge.style?.strokeWidth as number | undefined) ?? data?.strokeWidth
  if (stroke) style.stroke = stroke
  if (strokeWidth) style.strokeWidth = strokeWidth
  return Object.keys(style).length ? style : undefined
}

export function reactFlowToFlowDocument(
  nodes: Node[],
  edges: Edge[],
  viewport?: Viewport,
  groups: FlowDocument['groups'] = [],
  meta?: FlowDocument['meta'],
): FlowDocument {
  const byId = new Map(nodes.map((n) => [n.id, n]))

  const flowNodes: FlowNode[] = nodes
    .filter((node) => !isFlowGroupRfNode(node))
    .map((node) => {
      const abs = absoluteFlowPosition(node, byId)
      const data = node.data as FlowElementNodeData
      return {
        id: node.id,
        kind: data.kind,
        label: data.label,
        config: data.config,
        notes: data.notes,
        x: abs.x,
        y: abs.y,
        ports: data.ports,
        chrome: data.chrome,
        groupId: data.groupId ?? node.parentId ?? null,
      }
    })

  const flowEdges: FlowEdge[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
    label: typeof edge.label === 'string' ? edge.label : undefined,
    mapping: (edge.data as { mapping?: Record<string, string> } | undefined)?.mapping,
    style: rfEdgeStyle(edge),
  }))

  const flowViewport: FlowViewport | undefined = viewport
    ? { x: viewport.x, y: viewport.y, zoom: viewport.zoom }
    : undefined

  // Keep direct node membership and nested frame parentage in sync.
  const groupFrames = new Map(
    nodes.filter(isFlowGroupRfNode).map((node) => [node.id, node]),
  )
  const syncedGroups = (groups ?? []).map((group) => {
    const frame = groupFrames.get(group.id)
    return {
      ...group,
      nodeIds: flowNodes.filter((node) => node.groupId === group.id).map((node) => node.id),
      parentGroupId: frame?.parentId ?? group.parentGroupId ?? null,
    }
  })
  const retainedGroupIds = new Set(
    syncedGroups
      .filter(
        (group) =>
          group.nodeIds.length > 0 ||
          syncedGroups.some((candidate) => candidate.parentGroupId === group.id),
      )
      .map((group) => group.id),
  )

  return {
    nodes: flowNodes,
    edges: flowEdges,
    groups: syncedGroups.filter((group) => retainedGroupIds.has(group.id)),
    viewport: flowViewport,
    meta,
  }
}

export type FlowLayoutDirection = 'TB' | 'BT' | 'LR' | 'RL'

export type FlowLayoutMode = 'free' | FlowLayoutDirection

export type ApplyDagreLayoutOptions = {
  /** Live measured sizes so expanded cards get real spacing (don’t clip compact neighbors). */
  sizeById?: ReadonlyMap<string, { width: number; height: number }>
}

/** Approx RF edge-label pill size (~11px caption + chrome padding). */
function estimateEdgeLabelBox(label?: string): { width: number; height: number } | null {
  const text = label?.trim()
  if (!text) return null
  const width = Math.min(280, Math.max(56, Math.ceil(text.length * 6.8 + 24)))
  const height = 24
  return { width, height }
}

export function applyDagreLayout(
  doc: FlowDocument,
  direction: FlowLayoutDirection = 'LR',
  options: ApplyDagreLayoutOptions = {},
): FlowDocument {
  const g = new dagre.graphlib.Graph({ multigraph: true })
  g.setDefaultEdgeLabel(() => ({}))
  // Generous rank gap so connector labels (e.g. "maps value → a") fit between ranks.
  g.setGraph({
    rankdir: direction,
    nodesep: 72,
    edgesep: 48,
    ranksep: 140,
  })

  const sizeFor = (id: string) => {
    const live = options.sizeById?.get(id)
    const width = live?.width && live.width > 0 ? live.width : NODE_WIDTH
    const height = live?.height && live.height > 0 ? live.height : NODE_HEIGHT
    return { width, height }
  }

  for (const node of doc.nodes) {
    const { width, height } = sizeFor(node.id)
    g.setNode(node.id, { width, height })
  }
  for (const edge of doc.edges) {
    const box = estimateEdgeLabelBox(edge.label)
    g.setEdge(
      edge.source,
      edge.target,
      box
        ? { label: edge.label, width: box.width, height: box.height, labelpos: 'c' }
        : {},
      edge.id,
    )
  }

  dagre.layout(g)

  const positioned = doc.nodes.map((node) => {
    const layoutNode = g.node(node.id)
    if (!layoutNode) return node
    const { width, height } = sizeFor(node.id)
    return {
      ...node,
      x: layoutNode.x - width / 2,
      y: layoutNode.y - height / 2,
    }
  })

  return { ...doc, nodes: positioned }
}

export function ensureFlowLayout(doc: FlowDocument): FlowDocument {
  const needsLayout = doc.nodes.some((node) => node.x == null || node.y == null)
  if (!needsLayout) return doc
  return applyDagreLayout(doc)
}

/**
 * Recompute frame size from children.
 *
 * Right/bottom grow/shrink: only width/height change → CSS `--smooth` transition.
 *
 * Left/up grow **and** contract: `shiftX` / `shiftY` move the parent opposite the
 * children so absolute geometry stays put. Positive shift = expand that edge
 * (children +=, parent -=); negative = contract (children -=, parent +=). CSS must
 * not transition those frames (`--snap`) — use `animateFlowGroupFit` for a
 * sequential ease matching right/down.
 */
export function resizeFlowGroupFrames(
  nodes: Node[],
  sizeOverrides?: Map<string, { width: number; height: number }>,
  options?: { onlyParentIds?: ReadonlySet<string> },
): Node[] {
  const frameIds = new Set(nodes.filter(isFlowGroupRfNode).map((node) => node.id))
  let parentIds = [
    ...new Set(nodes.flatMap((node) => (node.parentId ? [node.parentId] : []))),
  ].filter((id) => frameIds.has(id))
  if (options?.onlyParentIds) {
    parentIds = parentIds.filter((id) => options.onlyParentIds!.has(id))
  }
  if (parentIds.length === 0) return nodes

  const byId = new Map(nodes.map((node) => [node.id, node]))
  const depthOf = (id: string): number => {
    let depth = 0
    let parentId = byId.get(id)?.parentId
    const visited = new Set<string>([id])
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId)
      depth += 1
      parentId = byId.get(parentId)?.parentId
    }
    return depth
  }

  let next = nodes
  for (const parentId of parentIds.sort((a, b) => depthOf(b) - depthOf(a))) {
    const children = next.filter((node) => node.parentId === parentId)
    if (children.length === 0) continue
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const child of children) {
      const override = isFlowGroupRfNode(child) ? undefined : sizeOverrides?.get(child.id)
      const w = (child.width ??
        (child.style?.width as number | undefined) ??
        override?.width ??
        child.measured?.width ??
        FLOW_GROUP_FALLBACK_SIZE.width) as number
      const h = (child.height ??
        (child.style?.height as number | undefined) ??
        override?.height ??
        child.measured?.height ??
        FLOW_GROUP_FALLBACK_SIZE.height) as number
      minX = Math.min(minX, child.position.x)
      minY = Math.min(minY, child.position.y)
      maxX = Math.max(maxX, child.position.x + w)
      maxY = Math.max(maxY, child.position.y + h)
    }

    const pad = FLOW_GROUP_PADDING
    const header = FLOW_GROUP_HEADER
    // Flush content to left pad / top (pad+header). Sign covers expand and contract.
    let shiftX = pad - minX
    let shiftY = pad + header - minY
    if (Math.abs(shiftX) < 0.5) shiftX = 0
    if (Math.abs(shiftY) < 0.5) shiftY = 0

    const nextW = Math.max(maxX + shiftX + pad, pad * 2)
    const nextH = Math.max(maxY + shiftY + pad, pad * 2 + header)
    const smooth = shiftX === 0 && shiftY === 0

    next = next.map((node) => {
      if (node.id === parentId && isFlowGroupRfNode(node)) {
        const prevW = (node.width ?? (node.style?.width as number | undefined) ?? 0) as number
        const prevH = (node.height ?? (node.style?.height as number | undefined) ?? 0) as number
        const nextPos = {
          x: node.position.x - shiftX,
          y: node.position.y - shiftY,
        }
        const sizeSame = Math.abs(prevW - nextW) < 0.5 && Math.abs(prevH - nextH) < 0.5
        const posSame =
          Math.abs(nextPos.x - node.position.x) < 0.5 &&
          Math.abs(nextPos.y - node.position.y) < 0.5
        if (sizeSame && posSame) return node
        return {
          ...node,
          position: nextPos,
          className: smooth
            ? 'theme-flow-editor__group-node--smooth'
            : 'theme-flow-editor__group-node--snap',
          style: { ...node.style, width: nextW, height: nextH },
          width: nextW,
          height: nextH,
        }
      }
      if (node.parentId !== parentId || (shiftX === 0 && shiftY === 0)) return node
      const nextPos = {
        x: node.position.x + shiftX,
        y: node.position.y + shiftY,
      }
      return { ...node, position: nextPos }
    })
  }
  return next
}

/** True when any group frame needs a left/up edge move (not CSS-smoothable alone). */
export function flowGroupFitNeedsEdgeAnimation(from: Node[], to: Node[]): boolean {
  const fromById = new Map(from.map((n) => [n.id, n]))
  for (const node of to) {
    if (!isFlowGroupRfNode(node)) continue
    if (node.className !== 'theme-flow-editor__group-node--snap') continue
    const prev = fromById.get(node.id)
    if (!prev) return true
    const dx = Math.abs(node.position.x - prev.position.x)
    const dy = Math.abs(node.position.y - prev.position.y)
    const pw = (prev.width ?? (prev.style?.width as number | undefined) ?? 0) as number
    const ph = (prev.height ?? (prev.style?.height as number | undefined) ?? 0) as number
    const nw = (node.width ?? (node.style?.width as number | undefined) ?? 0) as number
    const nh = (node.height ?? (node.style?.height as number | undefined) ?? 0) as number
    if (dx >= 0.5 || dy >= 0.5 || Math.abs(pw - nw) >= 0.5 || Math.abs(ph - nh) >= 0.5) {
      return true
    }
  }
  return false
}
