export const R3F_SHAPE3D_EDGE_OPTIONS = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
] as const

export function r3fShape3dEdgesEnabled(value: string): boolean {
  return value === 'on'
}
