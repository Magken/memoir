import { Vector3, type Camera, type PerspectiveCamera } from 'three'

/** Arrow keys + A/D/S pan. W is not a pan key. Matches OrbitControls pan signs. */
export const KEY_PAN_SPEED = 10

const _camOffset = new Vector3()
const _right = new Vector3()
const _up = new Vector3()
const _move = new Vector3()

export function panPixelsForCode(code: string, speed = KEY_PAN_SPEED): { x: number; y: number } | null {
  switch (code) {
    case 'ArrowLeft':
    case 'KeyA':
      return { x: speed, y: 0 }
    case 'ArrowRight':
    case 'KeyD':
      return { x: -speed, y: 0 }
    case 'ArrowUp':
      return { x: 0, y: speed }
    case 'ArrowDown':
    case 'KeyS':
      return { x: 0, y: -speed }
    default:
      return null
  }
}

function isPerspective(camera: Camera): camera is PerspectiveCamera {
  return 'isPerspectiveCamera' in camera && Boolean((camera as PerspectiveCamera).isPerspectiveCamera)
}

/** Slide camera + target in screen space. three-stdlib OrbitControls does not expose `_pan`. */
export function panOrbitByPixels(
  camera: Camera,
  target: Vector3,
  deltaX: number,
  deltaY: number,
  clientHeight: number,
): boolean {
  if (!clientHeight || (!deltaX && !deltaY)) return false
  if (!isPerspective(camera)) return false
  _camOffset.copy(camera.position).sub(target)
  let targetDistance = _camOffset.length()
  targetDistance *= Math.tan((camera.fov / 2) * Math.PI / 180)
  const left = (2 * deltaX * targetDistance) / clientHeight
  const up = (2 * deltaY * targetDistance) / clientHeight
  const te = camera.matrix.elements
  _right.set(te[0], te[1], te[2]).multiplyScalar(-left)
  _up.set(te[4], te[5], te[6]).multiplyScalar(up)
  _move.copy(_right).add(_up)
  target.add(_move)
  camera.position.add(_move)
  return true
}
