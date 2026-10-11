import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import type { PerspectiveCamera } from 'three'
import { WEBGL_SPACE } from './webglSpace'
import {
  cameraDistance,
  frustumSliceMeters,
  screenToWorldOnGround,
  worldAtViewportPercent,
  type CameraFrame,
} from './screenMap'
import { SHADOW_ALIGN } from '../shadow/shadowAlign'

export type SpaceSample = {
  distance: number
  lookAt: [number, number, number]
  camera: [number, number, number]
  pointer: { x: number; y: number }
  pointerWorld: [number, number, number] | null
  align: [number, number, number] | null
  frustum: { width: number; height: number }
}

type SpaceProbeProps = {
  onSample: (sample: SpaceSample) => void
  alignPct?: readonly [number, number]
}

function liveFrame(
  camera: PerspectiveCamera,
  target: { x: number; y: number; z: number } | undefined,
): CameraFrame {
  return {
    position: [camera.position.x, camera.position.y, camera.position.z],
    target: target
      ? [target.x, target.y, target.z]
      : [...WEBGL_SPACE.lookAt],
    fov: camera.fov,
    aspect: camera.aspect || 1,
  }
}

export function SpaceProbe({ onSample, alignPct = [75, 50] }: SpaceProbeProps) {
  const camera = useThree((s) => s.camera)
  const lastKey = useRef('')
  useFrame((state) => {
    const cam = camera as PerspectiveCamera
    if (!('fov' in cam)) return
    const controls = state.controls as { target?: { x: number; y: number; z: number } } | undefined
    const frame = liveFrame(cam, controls?.target)
    const distance = cameraDistance(frame)
    const pointer = {
      x: (state.pointer.x + 1) / 2,
      y: (1 - state.pointer.y) / 2,
    }
    const key = `${distance.toFixed(2)}|${pointer.x.toFixed(3)}|${pointer.y.toFixed(3)}|${frame.target[0].toFixed(2)}`
    if (key === lastKey.current) return
    lastKey.current = key
    onSample({
      distance,
      lookAt: [...frame.target],
      camera: [...frame.position],
      pointer,
      pointerWorld: screenToWorldOnGround(pointer, frame),
      align: worldAtViewportPercent(alignPct[0], alignPct[1], frame),
      frustum: frustumSliceMeters(frame, distance),
    })
  })
  return null
}

type SpaceAlignMarkerProps = {
  point: [number, number, number] | null
}

export function SpaceAlignMarker({ point }: SpaceAlignMarkerProps) {
  if (!point) return null
  return (
    <mesh position={point}>
      <sphereGeometry args={[0.07, 16, 16]} />
      <meshBasicMaterial color="#f472b6" depthTest={false} />
    </mesh>
  )
}

export function ShadowAlignGizmos() {
  return (
    <group>
      <mesh position={[...SHADOW_ALIGN.key]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshBasicMaterial color="#facc15" />
      </mesh>
      <mesh position={[...SHADOW_ALIGN.target]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="#facc15" />
      </mesh>
    </group>
  )
}
