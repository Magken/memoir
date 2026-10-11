import type { FeatureFidelity } from './types'

/** Shared fidelity shorthand for catalog feature matrices. */
export const F: Record<FeatureFidelity, FeatureFidelity> = {
  full: 'full',
  partial: 'partial',
  fallback: 'fallback',
  native: 'native',
  na: 'na',
  lossy: 'lossy',
}

export const FEATURE_FIDELITY_LABELS: Record<FeatureFidelity, string> = {
  full: 'Full',
  partial: 'Partial',
  fallback: 'Fallback text',
  native: 'Native only',
  na: '—',
  lossy: 'Lossy',
}

export const EDITOR_ACTION_KIND_LABELS = {
  prop: 'Prop',
  ui: 'UI',
  command: 'Command',
  runtime: 'Runtime',
} as const

export function naMatrix<T extends string>(formats: readonly T[]) {
  const row = Object.fromEntries(formats.map((f) => [f, F.na])) as Record<T, FeatureFidelity>
  return { import: { ...row }, export: { ...row } }
}

export function ioImportNa<T extends string>(formats: readonly T[]) {
  return Object.fromEntries(formats.map((f) => [f, F.na])) as Record<T, FeatureFidelity>
}
