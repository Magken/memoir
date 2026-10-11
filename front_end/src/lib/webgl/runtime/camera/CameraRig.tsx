import { useRef, useState } from 'react'
import { OrthographicCamera, PerspectiveCamera } from '@react-three/drei'
import type { OrthographicCamera as OrthographicCameraImpl, PerspectiveCamera as PerspectiveCameraImpl } from 'three'
import { CAMERA_PRESETS, type CameraPresetId } from './cameraPresets'

type CameraRigProps = {
  preset?: CameraPresetId
  makeDefault?: boolean
  /** Applied once on mount — baked Home, not reapplied on later renders. */
  position?: readonly [number, number, number]
  lookAt?: readonly [number, number, number]
}

export function CameraRig({ preset = 'perspective', makeDefault = true, position, lookAt }: CameraRigProps) {
  const spec = CAMERA_PRESETS[preset]
  const [start] = useState(() => position ?? spec.position)
  const [aim] = useState(() => lookAt)
  const placed = useRef(false)

  function place(node: { position: { set: (x: number, y: number, z: number) => void }; lookAt: (...xyz: number[]) => void } | null) {
    if (!node || placed.current) return
    node.position.set(start[0], start[1], start[2])
    if (aim) node.lookAt(aim[0], aim[1], aim[2])
    placed.current = true
  }

  if (spec.type === 'orthographic') {
    return (
      <OrthographicCamera
        makeDefault={makeDefault}
        left={-spec.frustum}
        right={spec.frustum}
        top={spec.frustum}
        bottom={-spec.frustum}
        near={spec.near}
        far={spec.far}
        ref={(node: OrthographicCameraImpl | null) => {
          place(node)
        }}
      />
    )
  }
  return (
    <PerspectiveCamera
      makeDefault={makeDefault}
      fov={spec.fov}
      near={spec.near}
      far={spec.far}
      ref={(node: PerspectiveCameraImpl | null) => {
        place(node)
      }}
    />
  )
}
