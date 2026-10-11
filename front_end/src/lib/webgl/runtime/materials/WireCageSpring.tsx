import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { RaycastHit } from '../interaction/cameraPick'
import {
  impulseHitFromMark,
  stepMountedWires,
  WIRE_IMPULSE_HOLD,
  type ImpulseMark,
} from './wireElasticity'

type WireCageSpringProps = {
  hitRef: { current: RaycastHit | null }
  impulseMarks?: readonly ImpulseMark[]
  peakTicket?: number
}

/** Pulls the net cage under the cursor. The shaded subject is not a target. */
export function WireCageSpring({ hitRef, impulseMarks, peakTicket = 0 }: WireCageSpringProps) {
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const invalidate = useThree((state) => state.invalidate)
  const lastPeak = useRef(0)
  const hold = useRef(0)
  const sticky = useRef<RaycastHit | null>(null)
  useFrame((_, dt) => {
    if (peakTicket !== lastPeak.current) {
      lastPeak.current = peakTicket
      sticky.current = null
      hold.current = 0
      if (peakTicket > 0 && impulseMarks?.length) {
        for (const mark of impulseMarks) {
          const poke = impulseHitFromMark(scene, mark)
          if (!poke?.object) continue
          sticky.current = poke
          hold.current = WIRE_IMPULSE_HOLD
          break
        }
      }
    } else if (hold.current > 0) {
      hold.current = Math.max(0, hold.current - dt)
      if (hold.current === 0) sticky.current = null
    }
    const impulse = hold.current > 0 ? sticky.current : null
    if (stepMountedWires(scene, hitRef.current, dt, impulse, camera)) invalidate()
  })
  return null
}
