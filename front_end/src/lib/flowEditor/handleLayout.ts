import { Position } from '@xyflow/react'
import type { FlowLayoutMode } from './reactFlowBridge'
import type { FlowPortDirection } from './types'

/** Last directed layout when mode is `free` — keeps handle sides stable. */
export function resolveHandleSideMode(
  layoutMode: FlowLayoutMode,
  lastDirected: Exclude<FlowLayoutMode, 'free'> = 'LR',
): Exclude<FlowLayoutMode, 'free'> {
  return layoutMode === 'free' ? lastDirected : layoutMode
}

export function handlePositionForPort(
  direction: FlowPortDirection,
  layoutMode: FlowLayoutMode,
  lastDirected: Exclude<FlowLayoutMode, 'free'> = 'LR',
): Position {
  const mode = resolveHandleSideMode(layoutMode, lastDirected)
  switch (mode) {
    case 'LR':
      return direction === 'in' ? Position.Left : Position.Right
    case 'RL':
      return direction === 'in' ? Position.Right : Position.Left
    case 'TB':
      return direction === 'in' ? Position.Top : Position.Bottom
    case 'BT':
      return direction === 'in' ? Position.Bottom : Position.Top
    default:
      return direction === 'in' ? Position.Left : Position.Right
  }
}

export function portRailAxis(layoutMode: FlowLayoutMode, lastDirected: Exclude<FlowLayoutMode, 'free'> = 'LR'): 'horizontal' | 'vertical' {
  const mode = resolveHandleSideMode(layoutMode, lastDirected)
  return mode === 'TB' || mode === 'BT' ? 'horizontal' : 'vertical'
}
