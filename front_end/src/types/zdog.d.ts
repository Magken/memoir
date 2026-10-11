declare module 'zdog' {
  export const TAU: number

  export function easeInOut(progress: number, power?: number): number
  export function lerp(a: number, b: number, t: number): number

  export class Vector {
    x: number
    y: number
    z: number
    constructor(options?: { x?: number; y?: number; z?: number })
    set(options: { x?: number; y?: number; z?: number }): this
  }

  export type ZdogColor = string | false

  export class Illustration {
    constructor(options: {
      element: Element | string
      scale?: number
      zoom?: number
      resize?: boolean | string
      dragRotate?: boolean
      onResize?: (width: number, height: number) => void
    })
    zoom: number
    updateGraph(): void
    renderGraph(): void
  }

  export class Anchor {
    constructor(options?: {
      addTo?: Anchor | Illustration
      translate?: { x?: number; y?: number; z?: number }
      rotate?: { x?: number; y?: number; z?: number }
      scale?: number | { x?: number; y?: number; z?: number }
    })
    rotate: Vector
    copy(options?: Record<string, unknown>): Anchor
  }

  export class Dragger {
    constructor(options: {
      startElement?: Element
      onDragStart?: () => void
      onDragMove?: (pointer: unknown, moveX: number, moveY: number) => void
      onDragEnd?: () => void
    })
  }

  export class Hemisphere {
    constructor(options: Record<string, unknown>)
    copy(options?: Record<string, unknown>): Hemisphere
  }

  export class Cylinder {
    constructor(options: Record<string, unknown>)
  }

  export class Cone {
    constructor(options: Record<string, unknown>)
  }

  export class Box {
    constructor(options: Record<string, unknown>)
  }

  export class Polygon {
    constructor(options: Record<string, unknown>)
    copy(options?: Record<string, unknown>): Polygon
    rotate: Vector
  }

  const Zdog: {
    TAU: number
    easeInOut: typeof easeInOut
    lerp: typeof lerp
    Vector: typeof Vector
    Illustration: typeof Illustration
    Anchor: typeof Anchor
    Dragger: typeof Dragger
    Hemisphere: typeof Hemisphere
    Cylinder: typeof Cylinder
    Cone: typeof Cone
    Box: typeof Box
    Polygon: typeof Polygon
  }

  export default Zdog
}
