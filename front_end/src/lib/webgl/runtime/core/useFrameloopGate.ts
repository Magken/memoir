import { useVisualActivity } from '../../../../hooks/useVisualActivity'
import {
  resolveR3fFrameloop,
  type R3fFrameloop,
} from '../../../visualActivity'
import type { RefObject } from 'react'

type UseFrameloopGateOptions = {
  requested?: R3fFrameloop
  needsFrames?: boolean
  enabled?: boolean
}

export function useFrameloopGate(
  hostRef: RefObject<Element | null>,
  options: UseFrameloopGateOptions = {},
): R3fFrameloop {
  const { requested = 'always', needsFrames = true, enabled = true } = options
  const visuallyActive = useVisualActivity(hostRef, { enabled, observeKey: enabled })
  return resolveR3fFrameloop(requested, visuallyActive, needsFrames)
}
