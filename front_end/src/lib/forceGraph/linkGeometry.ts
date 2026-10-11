/**
 * Link geometry for force-graph SVG — edge-clipped paths so strokes
 * meet node rims instead of centers, with a light quadratic curve.
 */

export type Point = { x: number; y: number }

/** Shorten a segment so endpoints sit on circle rims (not centers). */
export function edgeClippedEndpoints(
  source: Point,
  target: Point,
  sourceRadius: number,
  targetRadius: number,
): { start: Point; end: Point; dist: number } | null {
  const dx = target.x - source.x
  const dy = target.y - source.y
  const dist = Math.hypot(dx, dy)
  if (dist < 0.001) return null
  const pad = sourceRadius + targetRadius + 2
  if (dist <= pad) return null
  const ux = dx / dist
  const uy = dy / dist
  return {
    start: { x: source.x + ux * sourceRadius, y: source.y + uy * sourceRadius },
    end: { x: target.x - ux * targetRadius, y: target.y - uy * targetRadius },
    dist,
  }
}

/** Quadratic path from rim to rim with a soft perpendicular bow. */
export function curvedLinkPath(
  source: Point,
  target: Point,
  sourceRadius: number,
  targetRadius: number,
): string | null {
  const clipped = edgeClippedEndpoints(source, target, sourceRadius, targetRadius)
  if (!clipped) return null
  const { start, end, dist } = clipped
  const dx = end.x - start.x
  const dy = end.y - start.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const bow = Math.min(28, Math.max(6, dist * 0.14))
  const midX = (start.x + end.x) / 2 - uy * bow
  const midY = (start.y + end.y) / 2 + ux * bow
  return `M${start.x},${start.y} Q${midX},${midY} ${end.x},${end.y}`
}

/** Visual node radius from connectivity (capped). */
export function forceNodeRadius(degree: number): number {
  return 9 + Math.min(9, Math.max(0, degree) * 1.35)
}
