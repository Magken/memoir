/** Map Zdog scene units (ref diameter ≈ 2) → CSS custom-property calcs. */

export function cssZ(u: number): string {
  return `calc(var(--css-shape-half) * ${u})`
}

export function cssDeg(rad: number): string {
  return `${(rad * 180) / Math.PI}deg`
}

const TAU = Math.PI * 2

export const CSS_SHAPE3D_TAU = TAU
