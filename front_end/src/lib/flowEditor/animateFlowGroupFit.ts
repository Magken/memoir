import type { Node } from '@xyflow/react'
import { FLOW_GROUP_NODE_TYPE } from './flowGroups'

/** Match `.theme-flow-editor__group-node--smooth` duration. */
const DURATION_MS = 280
const EPS = 0.5

/** Approx cubic-bezier(0.33, 1, 0.48, 1) — ease-out, settles like right/down CSS. */
function easeFrameFit(t: number): number {
  const u = 1 - t
  return 1 - u * u * u * (1 - t * 0.15)
}

let rafId = 0
let generation = 0

export function cancelFlowGroupFitAnimation(): void {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
  generation += 1
}

function frameSize(node: Node): { w: number; h: number } {
  const w = (node.width ?? (node.style?.width as number | undefined) ?? 0) as number
  const h = (node.height ?? (node.style?.height as number | undefined) ?? 0) as number
  return { w, h }
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < EPS
}

/**
 * Lerp parent position + size + child relative positions so left/up expand and
 * contract look sequential (same ballpark as CSS right/down width/height ease).
 *
 * Only patches nodes that participate in the fit — unchanged nodes keep identity
 * so React Flow can skip re-rendering them each frame.
 */
export function animateFlowGroupFit(
  setNodes: (updater: (nodes: Node[]) => Node[]) => void,
  from: Node[],
  to: Node[],
): void {
  cancelFlowGroupFitAnimation()
  const myGen = generation
  const fromById = new Map(from.map((n) => [n.id, n]))
  const toById = new Map(to.map((n) => [n.id, n]))
  const animatingIdSet = new Set<string>()
  for (const [id, b] of toById) {
    const a = fromById.get(id)
    if (!a) continue
    const as = frameSize(a)
    const bs = frameSize(b)
    if (
      !near(a.position.x, b.position.x) ||
      !near(a.position.y, b.position.y) ||
      (b.type === FLOW_GROUP_NODE_TYPE && (!near(as.w, bs.w) || !near(as.h, bs.h)))
    ) {
      animatingIdSet.add(id)
    }
  }
  if (animatingIdSet.size === 0) {
    setNodes(() => to)
    return
  }

  const start = performance.now()

  const tick = (now: number) => {
    if (myGen !== generation) return
    const t = Math.min(1, (now - start) / DURATION_MS)
    const e = easeFrameFit(t)

    setNodes((nds) => {
      let changed = false
      const next = nds.map((n) => {
        if (!animatingIdSet.has(n.id)) return n
        const a = fromById.get(n.id)
        const b = toById.get(n.id)
        if (!a || !b) return n

        const x = a.position.x + (b.position.x - a.position.x) * e
        const y = a.position.y + (b.position.y - a.position.y) * e

        if (b.type === FLOW_GROUP_NODE_TYPE) {
          const as = frameSize(a)
          const bs = frameSize(b)
          const w = as.w + (bs.w - as.w) * e
          const h = as.h + (bs.h - as.h) * e
          if (
            near(n.position.x, x) &&
            near(n.position.y, y) &&
            near(frameSize(n).w, w) &&
            near(frameSize(n).h, h)
          ) {
            return n
          }
          changed = true
          return {
            ...b,
            position: { x, y },
            width: w,
            height: h,
            className: 'theme-flow-editor__group-node--snap',
            style: { ...b.style, width: w, height: h },
          }
        }

        if (near(n.position.x, x) && near(n.position.y, y)) return n
        changed = true
        return { ...b, position: { x, y } }
      })
      return changed ? next : nds
    })

    if (t < 1) {
      rafId = requestAnimationFrame(tick)
    } else {
      rafId = 0
      setNodes(() => to)
    }
  }

  rafId = requestAnimationFrame(tick)
}
