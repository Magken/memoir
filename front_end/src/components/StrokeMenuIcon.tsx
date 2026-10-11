import { useId, useState } from 'react'
import {
  strokeMenuIconPreset,
  type StrokeMenuIconVariant,
} from '../lib/animations/strokeMenuIcons'

type StrokeMenuIconProps = {
  variant: StrokeMenuIconVariant
  /** Controlled open / active state (checkbox checked). */
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  /**
   * Accessible name — required when interactive.
   * Ignored when `decorative` (parent control owns the name).
   */
  label?: string
  /**
   * Visual only — no checkbox/label. Drive morph with `checked` → `.is-open`.
   * Safe to nest inside a button.
   */
  decorative?: boolean
  /** Accent hover disc behind the strokes. Off for shared underline chrome. */
  hit?: boolean
  /**
   * SVG viewBox. Default `0 0 100 100`.
   * Menu LCL crops to the stroke cluster so a 1em-tall box matches letter height.
   */
  viewBox?: string
  className?: string
  debug?: boolean
}

export function StrokeMenuIcon({
  variant,
  checked,
  defaultChecked = false,
  onCheckedChange,
  label,
  decorative = false,
  hit = true,
  viewBox = '0 0 100 100',
  className = '',
  debug = false,
}: StrokeMenuIconProps) {
  const inputId = useId()
  const [internalChecked, setInternalChecked] = useState(defaultChecked)
  const isChecked = checked ?? internalChecked
  const preset = strokeMenuIconPreset(variant)

  const onChange = () => {
    const next = !isChecked
    if (checked === undefined) setInternalChecked(next)
    onCheckedChange?.(next)
  }

  if (debug) {
    console.debug('[StrokeMenuIcon]', { variant, isChecked, kind: preset.kind, decorative, hit })
  }

  const classes = [
    'theme-stroke-menu-icon',
    `theme-stroke-menu-icon--${variant}`,
    `theme-stroke-menu-icon--${preset.kind}`,
    isChecked ? 'is-open' : '',
    hit ? '' : 'theme-stroke-menu-icon--no-hit',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const svg = (
    <svg className="theme-stroke-menu-icon__svg" viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {hit ? <circle className="theme-stroke-menu-icon__hit" cx="50" cy="50" r="30" /> : null}
      {preset.paths.map((path) => (
        <path key={path.className} className={path.className} d={path.d} />
      ))}
    </svg>
  )

  if (decorative) {
    return (
      <span className={classes} aria-hidden>
        {svg}
      </span>
    )
  }

  if (!label) {
    throw new Error('StrokeMenuIcon: `label` is required unless `decorative`')
  }

  return (
    <label className={classes}>
      <input
        id={inputId}
        type="checkbox"
        className="theme-stroke-menu-icon__input"
        checked={isChecked}
        onChange={onChange}
        aria-label={label}
      />
      {svg}
    </label>
  )
}
