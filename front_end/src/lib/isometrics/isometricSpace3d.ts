/**
 * WebGL debug adapter for `ISOMETRIC_SPACE.frame`.
 * Canonical frame: XY = screen, −Z = viewer — see [isometricSpace.ts](./isometricSpace.ts).
 * WebGL world matches frame on Y/Z; only X is negated for SVG left/right alignment.
 */

import {
  ISOMETRIC_DEFAULTS,
  isometricSpreadScaleX,
  isometricSpreadSkewY,
  isometricVariantIsStatic,
  type IsometricConfig,
  type IsometricVariant,
} from './isometricEffects'
import {
  ISOMETRIC_FRAME_LEGEND,
  ISOMETRIC_SPACE,
  isometricFrameToSvg,
  isometricSvgToFrame,
  type IsometricFramePoint,
} from './isometricSpace'

export type { IsometricFramePoint } from './isometricSpace'
export { ISOMETRIC_FRAME_LEGEND } from './isometricSpace'

export type IsometricWorldPoint = IsometricFramePoint

/** @deprecated Prefer `IsometricFramePoint` */
export type IsometricPlanePoint = IsometricFramePoint

export type IsometricHalfSpreadState = {
  skewY: number
  scaleX: number
  x: number
}

export type IsometricSpreadState = {
  left: IsometricHalfSpreadState
  right: IsometricHalfSpreadState
}

export type IsometricSpace3dFrame = {
  viewBox: { width: number; height: number }
  pivot: IsometricFramePoint
  seamX: number
  typeLineYs: readonly number[]
  labelEnterX: number
  labelRestX: number
  spread: IsometricSpreadState
}

const { viewBox, pivot, type, label, frame } = ISOMETRIC_SPACE

/** @deprecated Prefer `isometricSvgToFrame()` */
export const isometricSvgToPlane = isometricSvgToFrame

/** Frame → Three.js world using `ISOMETRIC_SPACE.frame.webglSceneScale`. */
export function isometricFrameToWorld(point: IsometricFramePoint): IsometricWorldPoint {
  const [sx, sy, sz] = frame.webglSceneScale
  return {
    x: point.x * sx,
    y: point.y * sy,
    z: point.z * sz,
  }
}

/** @deprecated Prefer `isometricFrameToWorld()` */
export const isometricPlaneToWorld = isometricFrameToWorld

/** SVG → Three.js world (frame compose + WebGL scale). */
export function isometricSvgToWorld(svgX: number, svgY: number, svgZ = 0): IsometricWorldPoint {
  return isometricFrameToWorld(isometricSvgToFrame(svgX, svgY, svgZ))
}

/** Three.js world → pivot-centered frame (inverse of `frame.webglSceneScale`). */
export function isometricWorldToFrame(world: IsometricWorldPoint): IsometricFramePoint {
  const [sx, sy, sz] = frame.webglSceneScale
  return {
    x: world.x / sx,
    y: world.y / sy,
    z: world.z / sz,
  }
}

/** Three.js world XY → SVG user space (ignores Z). */
export function isometricWorldToSvg(world: IsometricWorldPoint): { x: number; y: number } {
  return isometricFrameToSvg(isometricWorldToFrame(world))
}

export type IsometricCoordinateSample = {
  frame: IsometricFramePoint
  svg: { x: number; y: number }
  world: IsometricWorldPoint
}

export function isometricCoordinateSampleFromWorld(world: IsometricWorldPoint): IsometricCoordinateSample {
  const framePoint = isometricWorldToFrame(world)
  return {
    frame: framePoint,
    svg: isometricFrameToSvg(framePoint),
    world: { x: world.x, y: world.y, z: world.z },
  }
}

/** Ray hit → sample on the XY screen plane (frame z = 0). Use for screen hover readouts. */
export function isometricScreenPlaneSampleFromWorld(world: IsometricWorldPoint): IsometricCoordinateSample {
  const hit = isometricWorldToFrame(world)
  const frame: IsometricFramePoint = { x: hit.x, y: hit.y, z: 0 }
  return {
    frame,
    svg: isometricFrameToSvg(frame),
    world: isometricFrameToWorld(frame),
  }
}

export function formatIsometricCoord(value: number, digits = 1): string {
  return value.toFixed(digits)
}

export type IsometricSpaceLandmark = {
  id: string
  name: string
  frame: IsometricFramePoint
}

/** Named registry points with frame coordinates for the debug graph. */
export function isometricSpace3dLandmarks(): IsometricSpaceLandmark[] {
  const { viewBox, pivot, label, type } = ISOMETRIC_SPACE
  const firstLineY = type.lineYs[0]!
  return [
    { id: 'pivot', name: 'pivot', frame: { x: 0, y: 0, z: 0 } },
    {
      id: 'vb-tl',
      name: 'viewBox TL',
      frame: isometricSvgToFrame(viewBox.minX, viewBox.minY),
    },
    {
      id: 'vb-tr',
      name: 'viewBox TR',
      frame: isometricSvgToFrame(viewBox.minX + viewBox.width, viewBox.minY),
    },
    {
      id: 'vb-bl',
      name: 'viewBox BL',
      frame: isometricSvgToFrame(viewBox.minX, viewBox.minY + viewBox.height),
    },
    {
      id: 'vb-br',
      name: 'viewBox BR',
      frame: isometricSvgToFrame(viewBox.minX + viewBox.width, viewBox.minY + viewBox.height),
    },
    {
      id: 'seam-top',
      name: 'seam top',
      frame: isometricSvgToFrame(pivot.x, viewBox.minY),
    },
    {
      id: 'seam-base',
      name: 'seam base',
      frame: isometricSvgToFrame(pivot.x, viewBox.minY + viewBox.height),
    },
    {
      id: 'label-enter',
      name: 'label enter',
      frame: isometricSvgToFrame(label.enterX, firstLineY),
    },
    {
      id: 'label-rest',
      name: 'label rest',
      frame: isometricSvgToFrame(label.restX, firstLineY),
    },
  ]
}

function mapHalfSpread(
  index: 0 | 1,
  progress: number,
  config: Required<IsometricConfig>,
  isStatic: boolean,
): IsometricHalfSpreadState {
  const fromSkew = isometricSpreadSkewY(index, 'from', config)
  const toSkew = isometricSpreadSkewY(index, 'to', config)
  const fromScale = isometricSpreadScaleX(index, 'from', config)
  const toScale = isometricSpreadScaleX(index, 'to', config)
  const fromX = isStatic ? 0 : config.xRange
  const toX = isStatic ? 0 : -config.xRange

  return {
    skewY: fromSkew + (toSkew - fromSkew) * progress,
    scaleX: fromScale + (toScale - fromScale) * progress,
    x: fromX + (toX - fromX) * progress,
  }
}

/** GSAP fromTo sample at timeline progress — matches useIsometricScrub rest pose at 0.5. */
export function isometricSpreadStateAtProgress(
  progress: number,
  variant: IsometricVariant = 'spread',
  config: Required<IsometricConfig> = ISOMETRIC_DEFAULTS,
): IsometricSpreadState {
  const t = Math.max(0, Math.min(1, progress))
  const isStatic = isometricVariantIsStatic(variant)
  return {
    left: mapHalfSpread(0, t, config, isStatic),
    right: mapHalfSpread(1, t, config, isStatic),
  }
}

/** Illustrative 3D hinge angle — skewY degrees mapped to rotateY on frame-space meshes. */
export function isometricSkewYToRotateY(skewY: number): number {
  return (skewY * Math.PI) / 180
}

export function isometricSpace3dFrame(
  progress: number,
  variant: IsometricVariant = 'spread',
): IsometricSpace3dFrame {
  return {
    viewBox: { width: viewBox.width, height: viewBox.height },
    pivot: { x: 0, y: 0, z: 0 },
    seamX: 0,
    typeLineYs: type.lineYs.map((svgY) => isometricSvgToFrame(pivot.x, svgY).y),
    labelEnterX: isometricSvgToFrame(label.enterX, pivot.y).x,
    labelRestX: isometricSvgToFrame(label.restX, pivot.y).x,
    spread: isometricSpreadStateAtProgress(progress, variant),
  }
}

function boundsFromCorners(corners: IsometricFramePoint[]): {
  min: IsometricFramePoint
  max: IsometricFramePoint
  center: IsometricFramePoint
} {
  const min = { x: Infinity, y: Infinity, z: Infinity }
  const max = { x: -Infinity, y: -Infinity, z: -Infinity }
  for (const point of corners) {
    min.x = Math.min(min.x, point.x)
    min.y = Math.min(min.y, point.y)
    min.z = Math.min(min.z, point.z)
    max.x = Math.max(max.x, point.x)
    max.y = Math.max(max.y, point.y)
    max.z = Math.max(max.z, point.z)
  }
  return {
    min,
    max,
    center: {
      x: (min.x + max.x) / 2,
      y: (min.y + max.y) / 2,
      z: (min.z + max.z) / 2,
    },
  }
}

function viewBoxFrameCorners(): IsometricFramePoint[] {
  const { minX, minY, width, height } = viewBox
  return [
    isometricSvgToFrame(minX, minY + height),
    isometricSvgToFrame(minX + width, minY),
    isometricSvgToFrame(minX, minY),
    isometricSvgToFrame(minX + width, minY + height),
  ]
}

/** Frame-space bounds for meshes (XY screen plane, z = 0). */
export function isometricViewBoxFrameBounds(): {
  min: IsometricFramePoint
  max: IsometricFramePoint
  center: IsometricFramePoint
} {
  return boundsFromCorners(viewBoxFrameCorners())
}

/** @deprecated Prefer `isometricViewBoxFrameBounds()` */
export const isometricViewBoxPlaneBounds = isometricViewBoxFrameBounds

/** WebGL world bounds after `frame.webglSceneScale`. */
export function isometricViewBoxWorldBounds(): {
  min: IsometricWorldPoint
  max: IsometricWorldPoint
  center: IsometricWorldPoint
} {
  return boundsFromCorners(viewBoxFrameCorners().map(isometricFrameToWorld))
}

/** Default debug camera — on −world Z (frame −Z / viewer), head-on at pivot on XY. */
export const ISOMETRIC_SPACE_3D_CAMERA = {
  fov: 36,
  near: 2,
  far: 6000,
  /** Eye on −Z — looks toward +Z at the XY screen plane through pivot. */
  position: [0, 0, -1200] as const,
  target: [0, 0, 0] as const,
  minDistance: 480,
  maxDistance: 2400,
} as const

export function isometricSpace3dCameraTarget(): [number, number, number] {
  return [...ISOMETRIC_SPACE_3D_CAMERA.target]
}

export function isometricSpace3dDefaultCameraPose(): {
  position: [number, number, number]
  target: [number, number, number]
} {
  return {
    position: [...ISOMETRIC_SPACE_3D_CAMERA.position],
    target: isometricSpace3dCameraTarget(),
  }
}

/** Scene graph scale — re-export from registry for Three.js debug viewer. */
export const ISOMETRIC_SPACE_3D_SCENE_SCALE = ISOMETRIC_SPACE.frame.webglSceneScale

export const ISOMETRIC_SPACE_3D_LEGEND = [
  ...ISOMETRIC_FRAME_LEGEND,
  'WebGL: world = (−frame.x, frame.y, frame.z) · camera on −Z, target pivot (0,0,0)',
  'Seam at frame x = 0 — SVG x = 640',
  'Blue / orange planes hinge on the seam; rotateY ≈ GSAP skewY',
  'Gold lines = type baselines · cyan / violet = label enter / rest X',
] as const
