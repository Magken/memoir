import type { SceneCameraLook, SceneNoiseKind } from '../../assets/sceneDoc'

export const SCENE_NOISE_LABELS: Record<SceneNoiseKind, string> = {
  off: 'Off',
  film: 'Film',
  white: 'White',
  simplex: 'Simplex',
}

export type DofKnobs = {
  bokehScale: number
  focusRange: number
  vignetteOffset: number
  vignetteDarkness: number
}

export function lookNeedsComposer(look: SceneCameraLook): boolean {
  if (look.focus > 0) return true
  return look.noise !== 'off' && look.grain > 0
}

export function noiseKindIndex(kind: SceneNoiseKind): number {
  if (kind === 'film') return 1
  if (kind === 'white') return 2
  if (kind === 'simplex') return 3
  return 0
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Map scene look knobs onto pmndrs DepthOfField + Vignette. */
export function dofFromLook(look: SceneCameraLook): DofKnobs {
  const focus = clamp(look.focus, 0, 1)
  const mm = clamp(look.focalLength, 18, 200)
  const tele = (mm - 18) / (200 - 18)
  const rangeWide = 2.2
  const rangeTight = 0.06
  const focusRange = (rangeWide + (rangeTight - rangeWide) * tele) * (1.15 - focus * 0.55)
  return {
    bokehScale: focus * (1.6 + tele * 5.4),
    focusRange: Math.max(0.04, focusRange),
    vignetteOffset: 0.12 + focus * 0.28,
    vignetteDarkness: focus * 0.72,
  }
}
