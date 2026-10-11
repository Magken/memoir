import { useRef } from 'react'
import { Html, PivotControls } from '@react-three/drei'
import { Euler, Quaternion, Vector3, type Group, type Matrix4 } from 'three'
import {
  referencePointerLabel,
  type ReferencePointerPose,
  type ReferencePointerTag,
} from './referencePointerLayout'

const _pos = new Vector3()
const _quat = new Quaternion()
const _scale = new Vector3()
const _euler = new Euler()

type ReferencePointerProps = {
  origin: [number, number, number]
  selected: boolean
  showTag: boolean
  tag: ReferencePointerTag
  onSelect: () => void
  onPose: (pose: ReferencePointerPose) => void
  onDragging?: (dragging: boolean) => void
}

function poseFromMatrix(matrix: Matrix4): ReferencePointerPose {
  matrix.decompose(_pos, _quat, _scale)
  _euler.setFromQuaternion(_quat, 'XYZ')
  return {
    position: [_pos.x, _pos.y, _pos.z],
    rotation: [_euler.x, _euler.y, _euler.z],
  }
}

function readPose(node: Group | null, onPose: (pose: ReferencePointerPose) => void) {
  if (!node) return
  node.updateWorldMatrix(true, false)
  onPose(poseFromMatrix(node.matrixWorld))
}

/**
 * Clickable locator. Selected state shows XYZ translate + rotate (PivotControls).
 * Tag kind is fixed by the workbench (scene vs item).
 */
export function ReferencePointer({
  origin,
  selected,
  showTag,
  tag,
  onSelect,
  onPose,
  onDragging,
}: ReferencePointerProps) {
  const pinRef = useRef<Group>(null)
  const label = referencePointerLabel(tag)

  return (
    <group position={origin}>
      <PivotControls
        enabled={selected}
        visible={selected}
        disableScaling
        disableSliders
        depthTest={false}
        lineWidth={2}
        scale={0.16}
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
          <mesh
            onPointerDown={(event) => {
              event.stopPropagation()
            }}
            onClick={(event) => {
              event.stopPropagation()
              onSelect()
            }}
          >
            <sphereGeometry args={[0.012, 12, 12]} />
            <meshBasicMaterial color={selected ? '#fbbf24' : '#22d3ee'} depthTest={false} />
          </mesh>
          {showTag ? (
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
    </group>
  )
}
