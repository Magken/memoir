/** Movable 3D locator for placing objects in the viewer and scene editor. */

export const REFERENCE_POINTER_KIND = 'webgl-reference-pointer'

/** Metres beside the Home look-at so the pin is not inside the subject. */
export const REFERENCE_POINTER_OFFSET: [number, number, number] = [0.18, 0, 0]

/** Identity Euler XYZ (radians), matching scene object `rotation`. */
export const REFERENCE_POINTER_ROTATION: [number, number, number] = [0, 0, 0]

export type ReferencePointerTag = 'scene' | 'item'

export type ReferencePointerPose = {
  position: [number, number, number]
  rotation: [number, number, number]
}

export type ReferencePointerPayload = {
  kind: typeof REFERENCE_POINTER_KIND
  tag: ReferencePointerTag
  position: [number, number, number]
  rotation: [number, number, number]
}

export function referencePointerHome(
  lookAt: readonly [number, number, number],
  offset: readonly [number, number, number] = REFERENCE_POINTER_OFFSET,
): [number, number, number] {
  return [lookAt[0] + offset[0], lookAt[1] + offset[1], lookAt[2] + offset[2]]
}

export function referencePointerLabel(tag: ReferencePointerTag): string {
  return tag === 'scene' ? 'Scene tag' : 'Item tag'
}

export function serializeReferencePointer(pose: ReferencePointerPose, tag: ReferencePointerTag): string {
  const payload: ReferencePointerPayload = {
    kind: REFERENCE_POINTER_KIND,
    tag,
    position: [pose.position[0], pose.position[1], pose.position[2]],
    rotation: [pose.rotation[0], pose.rotation[1], pose.rotation[2]],
  }
  return `${JSON.stringify(payload, null, 2)}\n`
}
