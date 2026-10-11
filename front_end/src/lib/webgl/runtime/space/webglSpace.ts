/** One coordinate system for the product WebGL toolkit. No three.js imports. */

export type WebglVec3 = readonly [number, number, number]

export const WEBGL_SPACE = {
  /** Right-handed, three.js default. */
  handedness: 'right' as const,
  /** World up. Subjects sit on y = `groundY`. */
  up: 'y' as const,
  /** One world unit. Asset `units: 'm'` maps 1:1. */
  unit: 'm' as const,
  groundY: 0,
  origin: [0, 0, 0] as WebglVec3,
  /** Default orbit / subject center (1 m cube sits on the ground, center at 0.5). */
  lookAt: [0, 0.5, 0] as WebglVec3,
  /** Default camera home (matches CAMERA_PRESETS.perspective). */
  cameraHome: [2.4, 1.6, 3.2] as WebglVec3,
  /**
   * Screen space for layout references (e.g. “75% viewport”).
   * Origin top-left; x and y are 0–1 fractions of the Canvas host.
   */
  screen: {
    origin: 'top-left' as const,
    x: 'left→right 0–1 of viewport width',
    y: 'top→bottom 0–1 of viewport height',
  },
  lights: {
    key: [4, 8, 5] as WebglVec3,
    fill: [-5, 3, -2] as WebglVec3,
    rim: [0, 2, -6] as WebglVec3,
    keyTarget: [0, 0, 0] as WebglVec3,
  },
} as const

export function viewportPercent(pctX: number, pctY: number): { x: number; y: number } {
  return { x: pctX / 100, y: pctY / 100 }
}

export function isOnGround(y: number, epsilon = 1e-4): boolean {
  return Math.abs(y - WEBGL_SPACE.groundY) <= epsilon
}
