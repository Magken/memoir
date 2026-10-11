import { useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { DoubleSide, EdgesGeometry, PlaneGeometry } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Grid, GizmoHelper, GizmoViewport, Html, Line, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import type { IsometricVariant } from '../lib/isometrics/isometricEffects'
import { ISOMETRIC_SPACE } from '../lib/isometrics/isometricSpace'
import {
  isometricSkewYToRotateY,
  isometricSpace3dDefaultCameraPose,
  isometricSpace3dFrame,
  ISOMETRIC_SPACE_3D_CAMERA,
  ISOMETRIC_SPACE_3D_SCENE_SCALE,
  isometricViewBoxFrameBounds,
  type IsometricCoordinateSample,
} from '../lib/isometrics/isometricSpace3d'
import { IsometricSpaceCoordinateLayer } from './IsometricSpaceCoordinateLayer'

type IsometricSpaceSceneProps = {
  progress: number
  variant: IsometricVariant
  cameraResetToken?: number
  onCoordinateSample?: (sample: IsometricCoordinateSample | null) => void
}

const HALF_WIDTH = ISOMETRIC_SPACE.pivot.x
const bounds = isometricViewBoxFrameBounds()
const PLANE_HEIGHT = bounds.max.y - bounds.min.y
const SCENE_CENTER_Y = bounds.center.y
const DEFAULT_CAMERA = isometricSpace3dDefaultCameraPose()
const { fov, near, far, minDistance, maxDistance } = ISOMETRIC_SPACE_3D_CAMERA

function AxisLabel({ position, children }: { position: [number, number, number]; children: string }) {
  return (
    <Html position={position} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
      <span className="theme-isometric-space-viewer__axis-tag">{children}</span>
    </Html>
  )
}

function SpreadHalf({
  side,
  skewY,
  scaleX,
  offsetX,
}: {
  side: 'left' | 'right'
  skewY: number
  scaleX: number
  offsetX: number
}) {
  const rotY = isometricSkewYToRotateY(skewY)
  const tint = side === 'left' ? '#60a5fa' : '#fb923c'
  const meshX = side === 'left' ? -HALF_WIDTH / 2 : HALF_WIDTH / 2
  const planeGeo = useMemo(() => new PlaneGeometry(HALF_WIDTH, PLANE_HEIGHT, 8, 12), [])
  const edgeGeo = useMemo(() => new EdgesGeometry(planeGeo), [planeGeo])

  return (
    <group position={[offsetX, SCENE_CENTER_Y, 0]} rotation={[0, rotY, 0]}>
      <group scale={[scaleX, 1, 1]}>
        <mesh geometry={planeGeo} position={[meshX, 0, 0]}>
          <meshStandardMaterial
            color={tint}
            transparent
            opacity={0.42}
            side={DoubleSide}
            roughness={0.85}
            metalness={0.05}
          />
        </mesh>
        <lineSegments geometry={edgeGeo} position={[meshX, 0, 0.5]}>
          <lineBasicMaterial color={tint} transparent opacity={0.95} />
        </lineSegments>
      </group>
    </group>
  )
}

export function IsometricSpaceScene({
  progress,
  variant,
  cameraResetToken = 0,
  onCoordinateSample,
}: IsometricSpaceSceneProps) {
  const frame = isometricSpace3dFrame(progress, variant)
  const { left, right } = frame.spread
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const { camera } = useThree()

  useEffect(() => {
    if (cameraResetToken === 0) return
    const { position, target } = isometricSpace3dDefaultCameraPose()
    camera.position.set(...position)
    controlsRef.current?.target.set(...target)
    controlsRef.current?.update()
  }, [camera, cameraResetToken])

  const viewBoxLoop: [number, number, number][] = [
    [bounds.min.x, bounds.min.y, 0],
    [bounds.max.x, bounds.min.y, 0],
    [bounds.max.x, bounds.max.y, 0],
    [bounds.min.x, bounds.max.y, 0],
    [bounds.min.x, bounds.min.y, 0],
  ]

  const seamLine: [number, number, number][] = [
    [0, bounds.min.y, 0],
    [0, bounds.max.y, 0],
  ]

  return (
    <>
      <PerspectiveCamera makeDefault position={DEFAULT_CAMERA.position} fov={fov} near={near} far={far} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={DEFAULT_CAMERA.target}
        enableDamping
        dampingFactor={0.08}
        minDistance={minDistance}
        maxDistance={maxDistance}
      />

      <color attach="background" args={['#0b0f14']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[0, 0, -900]} intensity={0.75} />
      <directionalLight position={[0, 400, 200]} intensity={0.35} />

      <Grid
        infiniteGrid
        cellSize={80}
        sectionSize={320}
        cellColor="#243041"
        sectionColor="#475569"
        fadeDistance={2200}
        fadeStrength={1.2}
        position={[0, bounds.min.y - 2, 0]}
      />

      <group scale={ISOMETRIC_SPACE_3D_SCENE_SCALE}>
        <Line points={viewBoxLoop} color="#64748b" lineWidth={1} transparent opacity={0.7} />
        <Line points={seamLine} color="#e879f9" lineWidth={2} />

        {frame.typeLineYs.map((planeY) => (
          <Line
            key={planeY}
            points={[
              [bounds.min.x, planeY, 2],
              [bounds.max.x, planeY, 2],
            ]}
            color="#fbbf24"
            lineWidth={1}
            transparent
            opacity={0.55}
          />
        ))}

        {frame.typeLineYs.map((planeY) => (
          <group key={`label-${planeY}`}>
            <Line
              points={[
                [frame.labelEnterX, planeY, 6],
                [frame.labelEnterX, planeY + 22, 6],
              ]}
              color="#22d3ee"
              lineWidth={2}
            />
            <Line
              points={[
                [frame.labelRestX, planeY, 6],
                [frame.labelRestX, planeY + 22, 6],
              ]}
              color="#a78bfa"
              lineWidth={2}
            />
          </group>
        ))}

        <SpreadHalf side="left" skewY={left.skewY} scaleX={left.scaleX} offsetX={left.x} />
        <SpreadHalf side="right" skewY={right.skewY} scaleX={right.scaleX} offsetX={right.x} />

        <IsometricSpaceCoordinateLayer onSample={onCoordinateSample} />

        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[10, 24, 24]} />
          <meshStandardMaterial color="#facc15" emissive="#ca8a04" emissiveIntensity={0.35} />
        </mesh>
        <Html position={[0, 22, 0]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
          <span className="theme-isometric-space-viewer__axis-tag theme-isometric-space-viewer__axis-tag--pivot">
            pivot · f(0,0,0) · svg(640,500)
          </span>
        </Html>
      </group>

      <AxisLabel position={[260, 0, 0]}>+X</AxisLabel>
      <AxisLabel position={[0, 260, 0]}>+Y</AxisLabel>
      <AxisLabel position={[0, 0, -260]}>−Z viewer</AxisLabel>
      <AxisLabel position={[0, 0, 260]}>+Z depth</AxisLabel>

      <GizmoHelper alignment="bottom-right" margin={[72, 72]}>
        <GizmoViewport
          axisColors={['#ef4444', '#22c55e', '#3b82f6']}
          labelColor="#e2e8f0"
          hideNegativeAxes
        />
      </GizmoHelper>
    </>
  )
}
