import { useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { isometricFrameToSvg } from '../lib/isometrics/isometricSpace'
import {
  formatIsometricCoord,
  isometricScreenPlaneSampleFromWorld,
  isometricSpace3dLandmarks,
  isometricViewBoxFrameBounds,
  type IsometricCoordinateSample,
  type IsometricFramePoint,
} from '../lib/isometrics/isometricSpace3d'

type IsometricSpaceCoordinateLayerProps = {
  onSample?: (sample: IsometricCoordinateSample | null) => void
}

const bounds = isometricViewBoxFrameBounds()
const SCREEN_WIDTH = bounds.max.x - bounds.min.x
const SCREEN_HEIGHT = bounds.max.y - bounds.min.y
const LANDMARKS = isometricSpace3dLandmarks()

function CoordinateReadout({
  name,
  frame,
  compact = false,
}: {
  name: string
  frame: IsometricFramePoint
  compact?: boolean
}) {
  const svg = isometricFrameToSvg(frame)
  return (
    <div
      className={[
        'theme-isometric-space-viewer__point-readout',
        compact ? 'theme-isometric-space-viewer__point-readout--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <strong>{name}</strong>
      <span>
        f ({formatIsometricCoord(frame.x, 0)}, {formatIsometricCoord(frame.y, 0)},{' '}
        {formatIsometricCoord(frame.z, 0)})
      </span>
      {!compact ? (
        <span>
          svg ({formatIsometricCoord(svg.x, 0)}, {formatIsometricCoord(svg.y, 0)})
        </span>
      ) : null}
    </div>
  )
}

function LandmarkMarker({
  name,
  frame,
}: {
  name: string
  frame: IsometricFramePoint
}) {
  return (
    <group position={[frame.x, frame.y, frame.z + 8]}>
      <mesh>
        <sphereGeometry args={[5, 12, 12]} />
        <meshBasicMaterial color="#f472b6" />
      </mesh>
      <Html center distanceFactor={11} style={{ pointerEvents: 'none' }}>
        <CoordinateReadout name={name} frame={frame} />
      </Html>
    </group>
  )
}

export function IsometricSpaceCoordinateLayer({ onSample }: IsometricSpaceCoordinateLayerProps) {
  const [cursorFrame, setCursorFrame] = useState<IsometricFramePoint | null>(null)

  const handleMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    const sample = isometricScreenPlaneSampleFromWorld(event.point)
    setCursorFrame(sample.frame)
    onSample?.(sample)
  }

  const handleLeave = () => {
    setCursorFrame(null)
    onSample?.(null)
  }

  return (
    <>
      <mesh
        position={[bounds.center.x, bounds.center.y, -1]}
        onPointerMove={handleMove}
        onPointerOut={handleLeave}
      >
        <planeGeometry args={[SCREEN_WIDTH, SCREEN_HEIGHT]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {cursorFrame ? (
        <group position={[cursorFrame.x, cursorFrame.y, 4]}>
          <mesh>
            <sphereGeometry args={[6, 14, 14]} />
            <meshBasicMaterial color="#34d399" />
          </mesh>
          <Html position={[0, 28, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
            <CoordinateReadout name="cursor" frame={cursorFrame} />
          </Html>
        </group>
      ) : null}

      {LANDMARKS.map((landmark) => (
        <LandmarkMarker key={landmark.id} name={landmark.name} frame={landmark.frame} />
      ))}
    </>
  )
}

export function formatCoordinateSample(sample: IsometricCoordinateSample): {
  frame: string
  svg: string
  world: string
} {
  const { frame, svg, world } = sample
  return {
    frame: `(${formatIsometricCoord(frame.x)}, ${formatIsometricCoord(frame.y)}, ${formatIsometricCoord(frame.z)})`,
    svg: `(${formatIsometricCoord(svg.x)}, ${formatIsometricCoord(svg.y)})`,
    world: `(${formatIsometricCoord(world.x)}, ${formatIsometricCoord(world.y)}, ${formatIsometricCoord(world.z)})`,
  }
}
