import type { Node } from '@xyflow/react'

/** Fallbacks when RF has not measured the node yet. */
const FALLBACK_WIDTH = 220
const FALLBACK_HEIGHT = 72

export type ResolveNodeCollisionsOptions = {
  /** Max separation passes (default 40). */
  maxIterations?: number
  /** Ignore sub-pixel noise (default 0.5). */
  overlapThreshold?: number
  /** Extra gap between nodes in px (default 16). */
  margin?: number
  /**
   * Node ids that stay put — overlapping neighbors take the full push.
   * Use for the node being dragged or the one currently expanding.
   */
  pinnedIds?: ReadonlySet<string>
  /** Override measured size for live DOM rem measures mid-animation. */
  sizeOverrides?: ReadonlyMap<string, { width: number; height: number }>
  /**
   * Restrict separation axes (expand animation). Default both.
   * Expanding down → `{ x: false, y: true }` so neighbors only shift vertically.
   */
  axes?: { x?: boolean; y?: boolean }
}

type Box = {
  id: string
  x: number
  y: number
  width: number
  height: number
  moved: boolean
  pinned: boolean
  node: Node
}

function nodeSize(
  node: Node,
  sizeOverrides?: ReadonlyMap<string, { width: number; height: number }>,
): { width: number; height: number } {
  const override = sizeOverrides?.get(node.id)
  if (override && override.width > 0 && override.height > 0) return override
  const width = node.measured?.width ?? node.width ?? FALLBACK_WIDTH
  const height = node.measured?.height ?? node.height ?? FALLBACK_HEIGHT
  return {
    width: width > 0 ? width : FALLBACK_WIDTH,
    height: height > 0 ? height : FALLBACK_HEIGHT,
  }
}

/**
 * Push overlapping nodes apart (xyflow / React Flow node-collisions approach).
 * Penetration uses AABB centers; **push direction uses top-left position** so a
 * pinned expander growing down/right cannot flip signs when its center crosses a
 * neighbor (that flip teleports/swaps nodes — common when expanding inside groups).
 * @see https://reactflow.dev/examples/layout/node-collisions
 */
export function resolveNodeCollisions<NodeType extends Node>(
  nodes: NodeType[],
  options: ResolveNodeCollisionsOptions = {},
): NodeType[] {
  const maxIterations = options.maxIterations ?? 40
  const overlapThreshold = options.overlapThreshold ?? 0.5
  const margin = options.margin ?? 16
  const pinnedIds = options.pinnedIds
  const sizeOverrides = options.sizeOverrides
  const allowX = options.axes?.x !== false
  const allowY = options.axes?.y !== false

  if (nodes.length < 2) return nodes

  const boxes: Box[] = nodes.map((node) => {
    const { width, height } = nodeSize(node, sizeOverrides)
    return {
      id: node.id,
      x: node.position.x - margin,
      y: node.position.y - margin,
      width: width + margin * 2,
      height: height + margin * 2,
      moved: false,
      pinned: Boolean(pinnedIds?.has(node.id)),
      node,
    }
  })

  for (let iter = 0; iter < maxIterations; iter++) {
    let moved = false

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const A = boxes[i]
        const B = boxes[j]
        if (A.pinned && B.pinned) continue

        const dx = A.x + A.width * 0.5 - (B.x + B.width * 0.5)
        const dy = A.y + A.height * 0.5 - (B.y + B.height * 0.5)
        const px = (A.width + B.width) * 0.5 - Math.abs(dx)
        const py = (A.height + B.height) * 0.5 - Math.abs(dy)

        if (px <= overlapThreshold || py <= overlapThreshold) continue

        const canPushX = allowX && px > overlapThreshold
        const canPushY = allowY && py > overlapThreshold
        if (!canPushX && !canPushY) continue

        // Stable side from top-left (not centers — centers drift as pinned nodes expand).
        const sx = A.x === B.x ? (i < j ? 1 : -1) : A.x < B.x ? 1 : -1
        const sy = A.y === B.y ? (i < j ? 1 : -1) : A.y < B.y ? 1 : -1

        // Prefer min-penetration axis among allowed axes (growth-constrained when expanding).
        const pushX = canPushX && (!canPushY || px < py)

        moved = true
        if (pushX) {
          if (A.pinned) {
            B.moved = true
            B.x += px * sx
          } else if (B.pinned) {
            A.moved = true
            A.x -= px * sx
          } else {
            A.moved = B.moved = true
            const moveAmount = (px / 2) * sx
            A.x -= moveAmount
            B.x += moveAmount
          }
        } else {
          if (A.pinned) {
            B.moved = true
            B.y += py * sy
          } else if (B.pinned) {
            A.moved = true
            A.y -= py * sy
          } else {
            A.moved = B.moved = true
            const moveAmount = (py / 2) * sy
            A.y -= moveAmount
            B.y += moveAmount
          }
        }
      }
    }

    if (!moved) break
  }

  let anyMoved = false
  const next = boxes.map((box) => {
    if (!box.moved) return box.node as NodeType
    anyMoved = true
    return {
      ...(box.node as NodeType),
      position: {
        x: box.x + margin,
        y: box.y + margin,
      },
    }
  })

  return anyMoved ? next : nodes
}

/** Screen-rect → flow units for the RF node wrapper. */
export function measureFlowNodeSize(
  nodeId: string,
  zoom: number,
): { width: number; height: number } | null {
  if (zoom <= 0) return null
  const el = document.querySelector(
    `.react-flow__node[data-id="${CSS.escape(nodeId)}"]`,
  ) as HTMLElement | null
  if (!el) return null
  const rect = el.getBoundingClientRect()
  const width = rect.width / zoom
  const height = rect.height / zoom
  if (width <= 0 || height <= 0) return null
  return { width, height }
}

export type CollectFlowNodeSizesOptions = {
  /**
   * Only these ids get a live `getBoundingClientRect` pass.
   * Omit to measure every node (expensive — prefer for settle / layout only).
   * Pass an empty set to use RF `measured` / width fields only (best for drag ticks).
   */
  liveIds?: ReadonlySet<string>
}

function sizeFromNode(n: Node): { width: number; height: number } | null {
  const w = n.measured?.width ?? n.width
  const h = n.measured?.height ?? n.height
  if (typeof w === 'number' && typeof h === 'number' && w > 0 && h > 0) {
    return { width: w, height: h }
  }
  return null
}

/**
 * Build a size map. Prefer RF-measured boxes; live DOM only for `liveIds`
 * (expand animation) so drag ticks do not query every node wrapper.
 */
export function collectFlowNodeSizes(
  nodes: readonly Node[],
  zoom: number,
  options?: CollectFlowNodeSizesOptions,
): Map<string, { width: number; height: number }> {
  const map = new Map<string, { width: number; height: number }>()
  const liveIds = options?.liveIds
  const liveAll = liveIds === undefined

  for (const n of nodes) {
    if (liveAll || liveIds.has(n.id)) {
      const live = measureFlowNodeSize(n.id, zoom)
      if (live) {
        map.set(n.id, live)
        continue
      }
    }
    const measured = sizeFromNode(n)
    if (measured) map.set(n.id, measured)
  }
  return map
}

function isGroupFrame(node: Node): boolean {
  return node.type === 'flowGroup'
}

/**
 * Sibling collisions (same parentId) + top-level free nodes vs group frames.
 * Parent-relative and flow-absolute spaces are never mixed in one resolve pass.
 */
export function applyFlowCollisions(
  nodes: Node[],
  options: ResolveNodeCollisionsOptions = {},
): Node[] {
  if (nodes.length < 2) return nodes

  let next = nodes

  // 1) Per-group sibling resolve (relative coords share one parent).
  const parentIds = new Set(
    next.map((n) => n.parentId).filter((id): id is string => Boolean(id)),
  )
  for (const parentId of parentIds) {
    const siblings = next.filter((n) => n.parentId === parentId)
    if (siblings.length < 2) continue
    const separated = resolveNodeCollisions(siblings, options)
    const byId = new Map(separated.map((n) => [n.id, n]))
    next = next.map((n) => byId.get(n.id) ?? n)
  }

  // 2) Top-level only. Nested frames already resolve with siblings in parent-relative space.
  const topLevel = next.filter((n) => !n.parentId)
  if (topLevel.length >= 2) {
    // Ensure frames contribute their box size to the collision solver.
    const sizeOverrides = new Map(options.sizeOverrides ?? [])
    for (const n of topLevel) {
      if (!isGroupFrame(n) || sizeOverrides.has(n.id)) continue
      const w = (n.width ?? (n.style?.width as number | undefined) ?? 0) as number
      const h = (n.height ?? (n.style?.height as number | undefined) ?? 0) as number
      if (w > 0 && h > 0) sizeOverrides.set(n.id, { width: w, height: h })
    }
    const separated = resolveNodeCollisions(topLevel, {
      ...options,
      sizeOverrides: sizeOverrides.size ? sizeOverrides : undefined,
    })
    const byId = new Map(separated.map((n) => [n.id, n]))
    next = next.map((n) => byId.get(n.id) ?? n)
  }

  return next
}
