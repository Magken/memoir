/** SVG stroke-dash menu icon presets — ref.animated-icon-1 */

export const STROKE_MENU_ICON_VARIANTS = ['cross-1', 'cross-2', 'back-1', 'back-2'] as const

export type StrokeMenuIconVariant = (typeof STROKE_MENU_ICON_VARIANTS)[number]

export type StrokeMenuIconPath = {
  className: string
  d: string
}

export type StrokeMenuIconPreset = {
  variant: StrokeMenuIconVariant
  kind: 'cross' | 'back'
  label: string
  paths: readonly StrokeMenuIconPath[]
}

export const STROKE_MENU_ICON_PRESETS: readonly StrokeMenuIconPreset[] = [
  {
    variant: 'cross-1',
    kind: 'cross',
    label: 'Cross close — arc slide',
    paths: [
      { className: 'line--1', d: 'M0 40h62c13 0 6 28-4 18L35 35' },
      { className: 'line--2', d: 'M0 50h70' },
      { className: 'line--3', d: 'M0 60h62c13 0 6-28-4-18L35 65' },
    ],
  },
  {
    variant: 'cross-2',
    kind: 'cross',
    label: 'Cross close — diagonal shift',
    paths: [
      { className: 'line--1', d: 'M0 70l28-28c2-2 2-2 7-2h64' },
      { className: 'line--2', d: 'M0 50h99' },
      { className: 'line--3', d: 'M0 30l28 28c2 2 2 2 7 2h64' },
    ],
  },
  {
    variant: 'back-1',
    kind: 'back',
    label: 'Back arrow — curved',
    paths: [
      { className: 'line--1', d: 'M0 40h62c18 0 18-20-17 5L31 55' },
      { className: 'line--2', d: 'M0 50h80' },
      { className: 'line--3', d: 'M0 60h62c18 0 18 20-17-5L31 45' },
    ],
  },
  {
    variant: 'back-2',
    kind: 'back',
    label: 'Back arrow — chevron shift',
    paths: [
      { className: 'line--1', d: 'M0 55l14-10c4.7-3.3 9-5 13-5h72' },
      { className: 'line--2', d: 'M0 50h99' },
      { className: 'line--3', d: 'M0 45l14 10c4.7 3.3 9 5 13 5h72' },
    ],
  },
]

export function strokeMenuIconPreset(variant: StrokeMenuIconVariant): StrokeMenuIconPreset {
  const preset = STROKE_MENU_ICON_PRESETS.find((item) => item.variant === variant)
  if (!preset) return STROKE_MENU_ICON_PRESETS[0]
  return preset
}
