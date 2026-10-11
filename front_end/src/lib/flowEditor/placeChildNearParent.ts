import type { FlowLayoutMode } from './reactFlowBridge'

export type FlowNodeBox = {
  x: number
  y: number
  width: number
  height: number
}

export type FlowChildPlacementSide = 'right' | 'left' | 'below' | 'above'

const GAP = 48

function overlaps(a: FlowNodeBox, b: FlowNodeBox, margin = 8): boolean {
  return !(
    a.x + a.width + margin <= b.x ||
    b.x + b.width + margin <= a.x ||
    a.y + a.height + margin <= b.y ||
    b.y + b.height + margin <= a.y
  )
}

function candidateForSide(
  parent: FlowNodeBox,
  child: { width: number; height: number },
  side: FlowChildPlacementSide,
): FlowNodeBox {
  switch (side) {
    case 'right':
      return { x: parent.x + parent.width + GAP, y: parent.y, width: child.width, height: child.height }
    case 'left':
      return { x: parent.x - child.width - GAP, y: parent.y, width: child.width, height: child.height }
    case 'below':
      return { x: parent.x, y: parent.y + parent.height + GAP, width: child.width, height: child.height }
    case 'above':
      return { x: parent.x, y: parent.y - child.height - GAP, width: child.width, height: child.height }
  }
}

function overlapScore(box: FlowNodeBox, others: FlowNodeBox[]): number {
  let score = 0
  for (const other of others) {
    if (!overlaps(box, other)) continue
    const ox = Math.min(box.x + box.width, other.x + other.width) - Math.max(box.x, other.x)
    const oy = Math.min(box.y + box.height, other.y + other.height) - Math.max(box.y, other.y)
    score += Math.max(0, ox) * Math.max(0, oy)
  }
  return score
}

/** Preferred side order from directed layout (out-port direction first). */
export function placementSidesForLayout(
  layoutMode: FlowLayoutMode,
  lastDirected: Exclude<FlowLayoutMode, 'free'> = 'LR',
): FlowChildPlacementSide[] {
  const mode = layoutMode === 'free' ? lastDirected : layoutMode
  switch (mode) {
    case 'LR':
      return ['right', 'below', 'above', 'left']
    case 'RL':
      return ['left', 'below', 'above', 'right']
    case 'TB':
      return ['below', 'right', 'left', 'above']
    case 'BT':
      return ['above', 'right', 'left', 'below']
    default:
      return ['right', 'below', 'above', 'left']
  }
}

/**
 * Pick a side with the least overlap. Prefers open space along the flow axis;
 * falls back to above when below is crowded.
 */
export function placeChildNearParent(
  parent: FlowNodeBox,
  childSize: { width: number; height: number },
  others: FlowNodeBox[],
  sides: FlowChildPlacementSide[],
): { x: number; y: number; side: FlowChildPlacementSide } {
  let best = {
    x: parent.x + parent.width + GAP,
    y: parent.y,
    side: sides[0] ?? ('right' as FlowChildPlacementSide),
    score: Number.POSITIVE_INFINITY,
  }

  for (const side of sides) {
    const box = candidateForSide(parent, childSize, side)
    const score = overlapScore(box, others)
    if (score < best.score) {
      best = { x: box.x, y: box.y, side, score }
      if (score === 0) break
    }
  }

  return { x: best.x, y: best.y, side: best.side }
}
