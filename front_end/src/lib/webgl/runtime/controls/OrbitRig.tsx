import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { Camera, Vector3 } from 'three'
import { WEBGL_SPACE } from '../space/webglSpace'
import { isTypingTarget } from '../interaction/placeFromPointer'
import { panOrbitByPixels, panPixelsForCode } from './keyPan'

/** ~5 mm — fingernail-scale marks on a ~1.4 m subject. */
export const ORBIT_MIN_DISTANCE = 0.005
export const ORBIT_MAX_DISTANCE = 40
export const ORBIT_ZOOM_SPEED = 1.8

type OrbitPan = {
  enablePan?: boolean
  object?: Camera
  target?: Vector3
  domElement?: HTMLElement | null
  update?: () => void
}

type OrbitRigProps = {
  minDistance?: number
  maxDistance?: number
  enableDamping?: boolean
  enableZoom?: boolean
  /** False while a highlight ring is expanding. */
  enabled?: boolean
  makeDefault?: boolean
  target?: [number, number, number]
  /** Applied once with `target` so the first spherical is Home, not the canvas default. */
  cameraPosition?: [number, number, number]
}

export function OrbitRig({
  minDistance = ORBIT_MIN_DISTANCE,
  maxDistance = ORBIT_MAX_DISTANCE,
  enableDamping = true,
  enableZoom = true,
  enabled = true,
  makeDefault = true,
  target = [...WEBGL_SPACE.lookAt],
  cameraPosition,
}: OrbitRigProps) {
  const controlsRef = useRef<OrbitPan | null>(null)
  const invalidate = useThree((state) => state.invalidate)
  const [startTarget] = useState(target)
  const [startCamera] = useState(cameraPosition)
  const placed = useRef(false)

  useEffect(() => {
    if (!enabled) return
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return
      const delta = panPixelsForCode(event.code)
      if (!delta) return
      const orbit = controlsRef.current
      if (!orbit || orbit.enablePan === false) return
      const camera = orbit.object
      const lookAt = orbit.target
      const height = orbit.domElement?.clientHeight
      if (!camera || !lookAt || !height) return
      event.preventDefault()
      if (!panOrbitByPixels(camera, lookAt, delta.x, delta.y, height)) return
      orbit.update?.()
      invalidate()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled, invalidate])

  useFrame(() => {
    if (enabled) return
    controlsRef.current?.update?.()
  }, -1)

  return (
    <OrbitControls
      ref={(node) => {
        controlsRef.current = node as unknown as OrbitPan | null
        if (!node || placed.current) return
        const lookAt = (node as unknown as OrbitPan).target
        const object = (node as unknown as OrbitPan).object
        if (lookAt) lookAt.set(startTarget[0], startTarget[1], startTarget[2])
        if (object && startCamera) object.position.set(startCamera[0], startCamera[1], startCamera[2])
        ;(node as unknown as OrbitPan).update?.()
        placed.current = true
      }}
      makeDefault={makeDefault}
      minDistance={minDistance}
      maxDistance={maxDistance}
      zoomSpeed={ORBIT_ZOOM_SPEED}
      zoomToCursor
      enableDamping={enableDamping}
      enabled={enabled}
      enableZoom={enabled && enableZoom}
      enableRotate={enabled}
      enablePan={enabled}
    />
  )
}
