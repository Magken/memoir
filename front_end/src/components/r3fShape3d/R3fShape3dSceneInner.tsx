import type { RefObject } from 'react'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import type { Group } from 'three'
import type { Shape3dViewRotation } from '../../lib/shape3d/shape3dFrame'
import type { CssShape3dKind } from '../../lib/shape3d/cssShape3dTypes'
import { R3fShape3dSolid } from './R3fShape3dSolid'

type R3fShape3dSceneInnerProps = {
  kind: CssShape3dKind
  viewRef: RefObject<Shape3dViewRotation>
  edges?: boolean
}

export function R3fShape3dSceneInner({ kind, viewRef, edges = false }: R3fShape3dSceneInnerProps) {
  const groupRef = useRef<Group>(null)

  useFrame(() => {
    const group = groupRef.current
    const view = viewRef.current
    if (!group || !view) return
    group.rotation.x = view.x
    group.rotation.y = view.y
  })

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 4.2]} fov={42} />
      <ambientLight intensity={0.62} />
      <hemisphereLight args={['#fff8f0', '#2a1810', 0.48]} />
      <directionalLight position={[3.5, 4, 5]} intensity={0.92} />
      <directionalLight position={[-2.5, -1.5, -3]} intensity={0.28} color="#ffe8c8" />
      <group ref={groupRef}>
        <R3fShape3dSolid kind={kind} edges={edges} />
      </group>
    </>
  )
}
