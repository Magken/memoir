/** WebGL toolkit catalog types — no three.js imports. */

export const WEBGL_FEATURE_KINDS = [
  'Animation',
  'Bootstrap',
  'Camera',
  'Compute',
  'DebugUI',
  'Geometry',
  'Helper',
  'Interaction',
  'Light',
  'Loader',
  'Material',
  'Math',
  'Performance',
  'PostProcessPass',
  'RenderTarget',
  'Renderer',
  'SceneGraph',
  'Shadow',
  'Texture',
  'Volume',
  'WebGPU',
] as const

export type WebglFeatureKind = (typeof WEBGL_FEATURE_KINDS)[number]

export const WEBGL_FEATURE_LAYERS = [
  'AssetIO',
  'Bootstrap',
  'Culling',
  'Draw',
  'OverlayUI',
  'PostProcess',
  'Present',
  'Resolve',
  'SceneSetup',
  'Simulation',
] as const

export type WebglFeatureLayer = (typeof WEBGL_FEATURE_LAYERS)[number]

export const WEBGL_FEATURE_STATUSES = ['built', 'planned'] as const

export type WebglFeatureStatus = (typeof WEBGL_FEATURE_STATUSES)[number]

export type WebglFeature = {
  /** Stable toolkit id, e.g. `camera-orbit-rig`. */
  id: string
  label: string
  kind: WebglFeatureKind
  layer: WebglFeatureLayer
  status: WebglFeatureStatus
  summary: string
  /** Repo-relative module path. Required when `status` is `built`. */
  module: string | null
  /** Feature ids in `item-reference/.../_toolkit/registry.json`. */
  referenceIds: readonly string[]
  knobs: readonly string[]
}

export const WEBGL_KIND_SET: ReadonlySet<string> = new Set(WEBGL_FEATURE_KINDS)
export const WEBGL_LAYER_SET: ReadonlySet<string> = new Set(WEBGL_FEATURE_LAYERS)
