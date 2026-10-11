import { useRef, type ReactNode } from 'react'
import { Html, PivotControls } from '@react-three/drei'
import { Euler, Quaternion, Vector3, type Group, type Matrix4 } from 'three'
import type { SceneObjectPose } from './sceneObjectPose'

const _pos = new Vector3()
const _quat = new Quaternion()
const _scale = new Vector3()
const _euler = new Euler()

type SceneObjectGizmoProps = {
  enabled: boolean
  label?: string
  showTag?: boolean
  onPose: (pose: SceneObjectPose) => void
  onDragging?: (dragging: boolean) => void
  children: ReactNode
}

function poseFromMatrix(matrix: Matrix4): SceneObjectPose {
  matrix.decompose(_pos, _quat, _scale)
  _euler.setFromQuaternion(_quat, 'XYZ')
  return {
    position: [_pos.x, _pos.y, _pos.z],
    rotation: [_euler.x, _euler.y, _euler.z],
    scale: [_scale.x, _scale.y, _scale.z],
  }
}

function readPose(node: Group | null, onPose: (pose: SceneObjectPose) => void) {
  if (!node) return
  node.updateWorldMatrix(true, false)
  onPose(poseFromMatrix(node.matrixWorld))
}

/**
 * 3D translate / rotate / scale on a selected scene object, same PivotControls
 * dialect as the reference pointer (scaling stays on).
 */
export function SceneObjectGizmo({
  enabled,
  label,
  showTag = true,
  onPose,
  onDragging,
  children,
}: SceneObjectGizmoProps) {
  const pinRef = useRef<Group>(null)
  if (!enabled) return <>{children}</>
  return (
    <PivotControls
      enabled
      visible
      disableScaling={false}
      disableSliders
      depthTest={false}
      lineWidth={2}
      scale={0.22}
      axisColors={['#ef4444', '#22c55e', '#3b82f6']}
      annotations={false}
      onDragStart={() => onDragging?.(true)}
      onDrag={(_local, _deltaLocal, world) => {
        onPose(poseFromMatrix(world))
      }}
      onDragEnd={() => {
        readPose(pinRef.current, onPose)
        onDragging?.(false)
      }}
    >
      <group ref={pinRef}>
        {children}
        {showTag && label ? (
          <Html
            pointerEvents="none"
            occlude={false}
            wrapperClass="theme-webgl-toolkit__mark-label-wrap"
            className="theme-webgl-toolkit__mark-label"
          >
            {label}
          </Html>
        ) : null}
      </group>
    </PivotControls>
  )
}
