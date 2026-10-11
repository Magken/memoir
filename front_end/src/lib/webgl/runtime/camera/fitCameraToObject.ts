export type Box3Like = {
  min: readonly [number, number, number]
  max: readonly [number, number, number]
}

export type FitCameraResult = {
  position: [number, number, number]
  lookAt: [number, number, number]
  near: number
  far: number
}

function boxSize(box: Box3Like): [number, number, number] {
  return [
    box.max[0] - box.min[0],
    box.max[1] - box.min[1],
    box.max[2] - box.min[2],
  ]
}

function boxCenter(box: Box3Like): [number, number, number] {
  return [
    (box.min[0] + box.max[0]) / 2,
    (box.min[1] + box.max[1]) / 2,
    (box.min[2] + box.max[2]) / 2,
  ]
}

/**
 * Frame a bounding box with a perspective camera looking toward +Y-up origin.
 * Distance uses the larger of width/height against vertical FOV, plus padding.
 */
export function fitCameraToObject(
  box: Box3Like,
  options: { fov?: number; aspect?: number; padding?: number } = {},
): FitCameraResult {
  const fov = options.fov ?? 45
  const aspect = options.aspect ?? 1
  const padding = options.padding ?? 1.25
  const size = boxSize(box)
  const center = boxCenter(box)
  const maxDim = Math.max(size[0], size[1], size[2], 0.001)
  const fovRad = (fov * Math.PI) / 180
  const fitHeight = maxDim / (2 * Math.tan(fovRad / 2))
  const fitWidth = fitHeight / Math.max(aspect, 0.001)
  const distance = padding * Math.max(fitHeight, fitWidth)
  const position: [number, number, number] = [
    center[0] + distance * 0.6,
    center[1] + distance * 0.45,
    center[2] + distance,
  ]
  const radius = maxDim * padding
  return {
    position,
    lookAt: center,
    near: Math.max(radius / 100, 0.01),
    far: Math.max(radius * 20, 10),
  }
}
