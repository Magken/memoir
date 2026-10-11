export type WebGpuGalleryPage = 'main' | 'inner' | 'index'

export type WebGpuPlaneBounds = {
  x: number
  y: number
  w: number
  h: number
  z?: number
}

export type WebGpuGalleryPlane = {
  mesh: import('three').Mesh
  material: import('three').Material
  sizeUniform: { value: import('three').Vector2 }
  opacityUniform: { value: number }
  bounds: WebGpuPlaneBounds
  opacity: number
  tilt: number
  tiltX: number
  trackedEl: HTMLElement | null
  kind: 'main' | 'satellite'
  image: number
  j?: number
  introVisible?: boolean
  /** Normalized texture shift for cover parallax (-1…1). */
  parallaxU?: number
  parallaxV?: number
}

export type WebGpuGalleryImage = {
  src: string
  alt: string
  caption: string
  fact: string
}

export type WebGpuRect = {
  x: number
  y: number
  w: number
  h: number
  z?: number
}

export type WebGpuTransitionContext = {
  gpu: import('./gpuEngine').WebGpuGalleryEngine
  fromImage: number | null
  toImage: number | null
  indexFloat: import('./indexFloat').WebGpuIndexFloat | null
}

export type WebGpuPageTransition = {
  out: (
    fromEl: HTMLElement | null,
    toEl: HTMLElement | null,
    ctx: WebGpuTransitionContext,
  ) => Promise<unknown>
  in: (
    fromEl: HTMLElement | null,
    toEl: HTMLElement | null,
    ctx: WebGpuTransitionContext,
  ) => Promise<unknown>
}
