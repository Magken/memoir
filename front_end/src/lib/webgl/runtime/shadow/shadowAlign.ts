import { WEBGL_SPACE, type WebglVec3 } from '../space/webglSpace'

/** Shadow catcher and key light share the same world space as subjects. */
export const SHADOW_ALIGN = {
  groundY: WEBGL_SPACE.groundY,
  catcher: 'shadow-ground' as const,
  key: WEBGL_SPACE.lights.key,
  target: WEBGL_SPACE.lights.keyTarget,
}

export function keyLightOffset(): WebglVec3 {
  const [x, y, z] = SHADOW_ALIGN.key
  const [tx, ty, tz] = SHADOW_ALIGN.target
  return [x - tx, y - ty, z - tz]
}
