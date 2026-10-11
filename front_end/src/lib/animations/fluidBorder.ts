/** Fluid spring border host — ref.fluid-borders-1 stroke · ref.fluid-borders-2 layer physics */

export const FLUID_BORDER_HOST_CLASS = 'theme-fluid-border'
export const FLUID_BORDER_BLOCK_CLASS = 'theme-fluid-border--block'
export const FLUID_BORDER_STATIC_CLASS = 'theme-fluid-border--static'

/** Default idle orbit lap when `fluidBorder` is on and `fluidBorderAuto` is omitted (seconds). */
export const FLUID_BORDER_DEFAULT_AUTO_SECONDS = 8

export type FluidBorderLayerPhysics = {
  viscosity: number
  mouseForce: number
  forceLimit: number
}

export type FluidBorderPhysics = {
  tension: number
  forceFactor: number
  hoverFactor: number
  noise: number
  gap: number
  margin: number
  layers: [FluidBorderLayerPhysics, FluidBorderLayerPhysics]
}

/** Shorthand merge — `layer1` / `layer2` or `layers` tuple partials */
export type FluidBorderPhysicsInput = Partial<
  Omit<FluidBorderPhysics, 'layers'>
> & {
  layers?: [Partial<FluidBorderLayerPhysics>?, Partial<FluidBorderLayerPhysics>?]
  layer1?: Partial<FluidBorderLayerPhysics>
  layer2?: Partial<FluidBorderLayerPhysics>
}

/** ref.fluid-borders-2 defaults — outer + inner stroke layers */
export const DEFAULT_FLUID_BORDER_LAYER_1: FluidBorderLayerPhysics = {
  viscosity: 0.5,
  mouseForce: 100,
  forceLimit: 2,
}

export const DEFAULT_FLUID_BORDER_LAYER_2: FluidBorderLayerPhysics = {
  viscosity: 0.8,
  mouseForce: 150,
  forceLimit: 3,
}

export const DEFAULT_FLUID_BORDER_PHYSICS: FluidBorderPhysics = {
  tension: 0.4,
  forceFactor: 0.2,
  hoverFactor: 0,
  noise: 0,
  gap: 3,
  margin: 12,
  layers: [DEFAULT_FLUID_BORDER_LAYER_1, DEFAULT_FLUID_BORDER_LAYER_2],
}

/** ref.fluid-borders-2 “different viscosity” demo */
export const FLUID_BORDER_PHYSICS_VISCOUS: FluidBorderPhysics = {
  ...DEFAULT_FLUID_BORDER_PHYSICS,
  forceFactor: 0.1,
  layers: [
    { viscosity: 0.5, mouseForce: 400, forceLimit: 1 },
    { viscosity: 0.4, mouseForce: 500, forceLimit: 2 },
  ],
}

/** ref.fluid-borders-2 hover demo — stronger in-bounds pull */
export const FLUID_BORDER_PHYSICS_HOVER: FluidBorderPhysics = {
  ...DEFAULT_FLUID_BORDER_PHYSICS,
  hoverFactor: 10,
}

export type FluidBorderPhysicsPreset = 'default' | 'viscous' | 'hover'

export const FLUID_BORDER_PHYSICS_PRESETS: Record<FluidBorderPhysicsPreset, FluidBorderPhysics> = {
  default: DEFAULT_FLUID_BORDER_PHYSICS,
  viscous: FLUID_BORDER_PHYSICS_VISCOUS,
  hover: FLUID_BORDER_PHYSICS_HOVER,
}

export const FLUID_BORDER_PHYSICS_PRESET_OPTIONS = [
  { value: 'default', label: 'Default — dual layer' },
  { value: 'viscous', label: 'Viscous — ref.fluid-borders-2' },
  { value: 'hover', label: 'Hover pull — ref.fluid-borders-2' },
] as const

function mergeLayer(
  base: FluidBorderLayerPhysics,
  partial?: Partial<FluidBorderLayerPhysics>,
): FluidBorderLayerPhysics {
  if (!partial) return base
  return { ...base, ...partial }
}

export function resolveFluidBorderPhysics(input?: FluidBorderPhysicsInput): FluidBorderPhysics {
  const base = DEFAULT_FLUID_BORDER_PHYSICS
  if (!input) return base
  return {
    tension: input.tension ?? base.tension,
    forceFactor: input.forceFactor ?? base.forceFactor,
    hoverFactor: input.hoverFactor ?? base.hoverFactor,
    noise: input.noise ?? base.noise,
    gap: input.gap ?? base.gap,
    margin: input.margin ?? base.margin,
    layers: [
      mergeLayer(base.layers[0], input.layers?.[0] ?? input.layer1),
      mergeLayer(base.layers[1], input.layers?.[1] ?? input.layer2),
    ],
  }
}

export function resolveFluidBorderAutoMs(auto?: number | false): number | false {
  if (auto === false) return false
  const seconds = auto ?? FLUID_BORDER_DEFAULT_AUTO_SECONDS
  return Math.max(1, seconds) * 1000
}

export function fluidBorderHostClass(enabled?: boolean, block = false): string {
  if (!enabled) return ''
  return [FLUID_BORDER_HOST_CLASS, block ? FLUID_BORDER_BLOCK_CLASS : ''].filter(Boolean).join(' ')
}
