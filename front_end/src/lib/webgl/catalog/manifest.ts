import type { WebglFeature, WebglFeatureStatus } from '../types'
import { WEBGL_FEATURES } from './features'

export function getWebglFeature(id: string): WebglFeature | undefined {
  return WEBGL_FEATURES.find((row) => row.id === id)
}

export function webglFeaturesByStatus(status: WebglFeatureStatus): WebglFeature[] {
  return WEBGL_FEATURES.filter((row) => row.status === status)
}

export function webglBuiltFeatureIds(): string[] {
  return WEBGL_FEATURES.filter((row) => row.status === 'built').map((row) => row.id)
}

export { WEBGL_FEATURES, WEBGL_BUILT_FEATURES, WEBGL_PLANNED_FEATURES } from './features'
export type { WebglFeature } from '../types'
