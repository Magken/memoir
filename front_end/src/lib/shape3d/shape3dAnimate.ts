import Zdog from 'zdog'
import type { Shape3dViewRotation } from './shape3dFrame'
import { SHAPE3D_SPIN_CYCLE, SHAPE3D_SPIN_KEYFRAMES } from './shape3dFaces'

export type Shape3dSpinState = {
  ticker: number
  isSpinning: boolean
}

export function createShape3dSpinState(isSpinning = true): Shape3dSpinState {
  return { ticker: 0, isSpinning }
}

export function shape3dSpinStep(state: Shape3dSpinState): Shape3dViewRotation {
  const progress = state.ticker / SHAPE3D_SPIN_CYCLE
  const tween = Zdog.easeInOut(progress % 1, 4)
  const turnLimit = SHAPE3D_SPIN_KEYFRAMES.length - 1
  const turn = Math.floor(progress % turnLimit)
  const keyA = SHAPE3D_SPIN_KEYFRAMES[turn]
  const keyB = SHAPE3D_SPIN_KEYFRAMES[turn + 1]
  state.ticker++
  return {
    x: Zdog.lerp(keyA.x, keyB.x, tween),
    y: Zdog.lerp(keyA.y, keyB.y, tween),
  }
}

export type Shape3dFaceTween = {
  from: Shape3dViewRotation
  to: Shape3dViewRotation
  progress: number
  duration: number
}

export function createShape3dFaceTween(
  from: Shape3dViewRotation,
  to: Shape3dViewRotation,
  duration = 48,
): Shape3dFaceTween {
  return { from, to, progress: 0, duration }
}

export function shape3dFaceTweenStep(tween: Shape3dFaceTween): Shape3dViewRotation | null {
  if (tween.progress >= tween.duration) return null
  tween.progress++
  const t = Zdog.easeInOut(tween.progress / tween.duration, 3)
  return {
    x: Zdog.lerp(tween.from.x, tween.to.x, t),
    y: Zdog.lerp(tween.from.y, tween.to.y, t),
  }
}

export function shape3dDragRotation(
  start: Shape3dViewRotation,
  moveX: number,
  moveY: number,
  displaySize: number,
): Shape3dViewRotation {
  const TAU = Zdog.TAU
  return {
    x: start.x - (moveY / displaySize) * TAU,
    y: start.y - (moveX / displaySize) * TAU,
  }
}
