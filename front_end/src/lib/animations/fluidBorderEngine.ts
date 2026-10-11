/** Springy rounded-rect border — ref.fluid-borders-1 geometry · ref.fluid-borders-2 dual-layer physics */

import {
  DEFAULT_FLUID_BORDER_PHYSICS,
  resolveFluidBorderPhysics,
  type FluidBorderLayerPhysics,
  type FluidBorderPhysics,
  type FluidBorderPhysicsInput,
} from './fluidBorder'

const PI2 = Math.PI / 2

export type FluidBorderPoint = {
  x: number
  y: number
  ox: number
  oy: number
  vx: number
  vy: number
}

export type FluidBorderTouch = {
  x: number
  y: number
  force: number
}

type FluidBorderLayerState = FluidBorderLayerPhysics & {
  points: FluidBorderPoint[]
}

export type FluidBorderEngineConfig = FluidBorderPhysics & {
  width: number
  height: number
  radius: number
}

/** @deprecated Use `DEFAULT_FLUID_BORDER_LAYER_2` from fluidBorder.ts */
export const DEFAULT_FLUID_BORDER_LAYER: FluidBorderLayerPhysics =
  DEFAULT_FLUID_BORDER_PHYSICS.layers[1]

export const DEFAULT_FLUID_BORDER_MARGIN = DEFAULT_FLUID_BORDER_PHYSICS.margin
export const DEFAULT_FLUID_BORDER_GAP = DEFAULT_FLUID_BORDER_PHYSICS.gap

function createPoint(x: number, y: number): FluidBorderPoint {
  return { x, y, ox: x, oy: y, vx: 0, vy: 0 }
}

function line(pointA: number[], pointB: number[]) {
  const lengthX = pointB[0] - pointA[0]
  const lengthY = pointB[1] - pointA[1]
  return {
    length: Math.sqrt(lengthX ** 2 + lengthY ** 2),
    angle: Math.atan2(lengthY, lengthX),
  }
}

function controlPoint(
  current: number[],
  previous: number[] | undefined,
  next: number[] | undefined,
  reverse?: boolean,
): [number, number] {
  const p = previous || current
  const n = next || current
  const smoothing = 0.2
  const o = line(p, n)
  const angle = o.angle + (reverse ? Math.PI : 0)
  const length = o.length * smoothing
  return [current[0] + Math.cos(angle) * length, current[1] + Math.sin(angle) * length]
}

function bezierCommand(point: number[], i: number, a: number[][]): string {
  const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point)
  const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true)
  return `C ${cpsX},${cpsY} ${cpeX},${cpeY} ${point[0]},${point[1]}`
}

function svgPath(points: number[][]): string {
  return points.reduce(
    (acc, point, i, a) =>
      i === 0 ? `M ${point[0]},${point[1]}` : `${acc} ${bezierCommand(point, i, a)}`,
    '',
  )
}

function buildPerimeterPoints(
  width: number,
  height: number,
  radius: number,
  margin: number,
  gap: number,
): FluidBorderPoint[] {
  const points: FluidBorderPoint[] = []
  const borderLength = radius * PI2

  for (let x = radius; x < width - radius; x += gap) {
    points.push(createPoint(margin + x, margin))
  }
  if (borderLength > gap) {
    for (let alpha = 0; alpha < borderLength; alpha += gap) {
      const angle = (alpha / borderLength) * PI2
      points.push(
        createPoint(
          Math.sin(angle) * radius + margin + width - radius,
          (1 - Math.cos(angle)) * radius + margin,
        ),
      )
    }
  }
  for (let y = radius; y < height - radius; y += gap) {
    points.push(createPoint(margin + width, margin + y))
  }
  if (borderLength > gap) {
    for (let alpha = borderLength; alpha >= 0; alpha -= gap) {
      const angle = (alpha / borderLength) * PI2
      points.push(
        createPoint(
          Math.sin(angle) * radius + margin + width - radius,
          Math.cos(angle) * radius + margin + height - radius,
        ),
      )
    }
  }
  for (let x = width - radius; x >= radius; x -= gap) {
    points.push(createPoint(margin + x, margin + height))
  }
  if (borderLength > gap) {
    for (let alpha = 0; alpha < borderLength; alpha += gap) {
      const angle = (alpha / borderLength) * PI2
      points.push(
        createPoint(
          (1 - Math.sin(angle)) * radius + margin,
          Math.cos(angle) * radius + margin + height - radius,
        ),
      )
    }
  }
  for (let y = height - radius; y >= radius; y -= gap) {
    points.push(createPoint(margin, margin + y))
  }
  if (borderLength > gap) {
    for (let alpha = borderLength; alpha >= 0; alpha -= gap) {
      const angle = (alpha / borderLength) * PI2
      points.push(
        createPoint(
          (1 - Math.sin(angle)) * radius + margin,
          (1 - Math.cos(angle)) * radius + margin,
        ),
      )
    }
  }
  return points
}

export class FluidBorderEngine {
  width: number
  height: number
  radius: number
  margin = 0
  gap = 0
  tension = 0
  forceFactor = 0
  hoverFactor = 0
  noise = 0
  layers: FluidBorderLayerState[] = []
  touches: FluidBorderTouch[] = []
  demo = true

  constructor(
    config: Partial<FluidBorderPhysicsInput> &
      Pick<FluidBorderEngineConfig, 'width' | 'height'> & { radius?: number },
  ) {
    const physics = resolveFluidBorderPhysics(config)
    const radius = Math.min(config.radius ?? 12, config.width / 2, config.height / 2)
    this.width = config.width
    this.height = config.height
    this.radius = radius
    this.applyPhysics(physics)
    this.initOrigins()
  }

  applyPhysics(physics: FluidBorderPhysics) {
    const prevPoints = this.layers.map((layer) => layer.points)
    this.margin = physics.margin
    this.gap = physics.gap
    this.tension = physics.tension
    this.forceFactor = physics.forceFactor
    this.hoverFactor = physics.hoverFactor
    this.noise = physics.noise
    this.layers = physics.layers.map((layer, index) => ({
      ...layer,
      points: prevPoints[index] ?? [],
    }))
  }

  setSize(width: number, height: number, radius: number) {
    const nextRadius = Math.min(radius, width / 2, height / 2)
    if (this.width === width && this.height === height && this.radius === nextRadius) return
    this.width = width
    this.height = height
    this.radius = nextRadius
    this.initOrigins()
  }

  /** Simulated cursor orbiting 15px outside the border — ref `demoTouch`. */
  demoTouch(periodMs: number): FluidBorderTouch {
    const offset = 15
    const left = this.margin - offset
    const top = this.margin - offset
    const w = this.width + offset * 2
    const h = this.height + offset * 2
    const perimeter = 2 * (w + h)
    const d = ((Date.now() % periodMs) / periodMs) * perimeter
    let x: number
    let y: number
    if (d < w) {
      x = left + d
      y = top
    } else if (d < w + h) {
      x = left + w
      y = top + (d - w)
    } else if (d < w + h + w) {
      x = left + w - (d - w - h)
      y = top + h
    } else {
      x = left
      y = top + h - (d - w - h - w)
    }
    return { x, y, force: 1 }
  }

  update(autoPeriodMs: number | false) {
    if (autoPeriodMs !== false && this.demo) {
      this.touches = [this.demoTouch(autoPeriodMs)]
    }
    for (const layer of this.layers) {
      for (const point of layer.points) {
        const dx = point.ox - point.x + (Math.random() - 0.5) * this.noise
        const dy = point.oy - point.y + (Math.random() - 0.5) * this.noise
        const d = Math.sqrt(dx * dx + dy * dy)
        const f = d * this.forceFactor
        point.vx += f * (dx / d || 0)
        point.vy += f * (dy / d || 0)
        for (const touch of this.touches) {
          let mouseForce = layer.mouseForce
          if (
            touch.x > this.margin &&
            touch.x < this.margin + this.width &&
            touch.y > this.margin &&
            touch.y < this.margin + this.height
          ) {
            mouseForce *= -this.hoverFactor
          }
          const mx = point.x - touch.x
          const my = point.y - touch.y
          const md = Math.sqrt(mx * mx + my * my)
          const mf = Math.max(
            -layer.forceLimit,
            Math.min(layer.forceLimit, (mouseForce * touch.force) / md),
          )
          point.vx += mf * (mx / md || 0)
          point.vy += mf * (my / md || 0)
        }
        point.vx *= layer.viscosity
        point.vy *= layer.viscosity
        point.x += point.vx
        point.y += point.vy
      }
    }
  }

  getPathDs(): string[] {
    return this.layers.map((layer) => {
      const coords = layer.points.map((point) => [point.x, point.y])
      return `${svgPath(coords)} Z`
    })
  }

  /** @deprecated Use `getPathDs()` */
  getPathD(): string {
    return this.getPathDs()[this.layers.length - 1] ?? ''
  }

  initOrigins() {
    const template = buildPerimeterPoints(
      this.width,
      this.height,
      this.radius,
      this.margin,
      this.gap,
    )
    this.layers = this.layers.map((layer) => ({
      ...layer,
      points: template.map((point) => createPoint(point.x, point.y)),
    }))
  }
}

export function parseBorderRadiusPx(computed: string, width: number, height: number): number {
  const token = computed.split(/\s+/)[0] ?? '0'
  if (token.endsWith('%')) {
    const pct = Number.parseFloat(token) / 100
    return Math.min(width, height) * pct
  }
  return Number.parseFloat(token) || 0
}

export type { FluidBorderLayerPhysics, FluidBorderPhysics, FluidBorderPhysicsInput }
