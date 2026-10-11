import { WEBGL_POWER_PREFERENCE } from '../../../visualActivity'

export const WEBGL_RENDERER_DEFAULTS = {
  antialias: true,
  alpha: true,
  powerPreference: WEBGL_POWER_PREFERENCE,
  dpr: [1, 2] as [number, number],
  toneMappingExposure: 1,
  shadows: true,
} as const
