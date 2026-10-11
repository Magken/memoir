import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  barLoaderSizeClass,
  barLoaderToneClass,
  barLoaderVariantClass,
  clampProgress,
  DEFAULT_BAR_LOADER_VARIANT,
  DEFAULT_PROGRESS_LOADER_SIZE,
  DEFAULT_PROGRESS_LOADER_TONE,
  radialLoaderArcSpan,
  radialLoaderPoint,
  radialLoaderRingGeometry,
  radialLoaderRotation,
  radialLoaderSizeClass,
  radialLoaderTipPosition,
  radialLoaderToneClass,
  RADIAL_LOADER_VIEWBOX,
  type BarLoaderVariant,
  type ProgressLoaderSize,
  type ProgressLoaderTone,
  type RadialLoaderRing,
  type RadialLoaderShape,
} from '../lib/loaders/progressLoaders'

export type {
  BarLoaderVariant,
  ProgressLoaderSize,
  ProgressLoaderTone,
  RadialLoaderRing,
  RadialLoaderShape,
} from '../lib/loaders/progressLoaders'

type RadialLoaderProps = {
  /** Stacked concentric arcs (outermost first) — ref.radial-loader-1 activity rings. */
  rings?: readonly RadialLoaderRing[]
  /** Shorthand for a single ring when `rings` is omitted. */
  value?: number
  /** Range bounds for the single-ring gauge (distance / weight / etc.). */
  min?: number
  max?: number
  tone?: ProgressLoaderTone
  size?: ProgressLoaderSize
  /** Full 360° ring or 180° gauge. */
  shape?: RadialLoaderShape
  /** Arc thickness in viewBox units (auto-fits stacked rings when omitted). */
  thickness?: number
  /** Gap between stacked rings in viewBox units. */
  gap?: number
  /** Animate the fill in from empty on mount. */
  animate?: boolean
  /** Spin a fixed arc instead of showing a value. */
  indeterminate?: boolean
  /** Soft accent bloom on the arcs. */
  glow?: boolean
  /** Tick marks along the arc (gauge scale). */
  ticks?: number
  /** Show min / max scale labels at the gauge ends (semi only). */
  showScale?: boolean
  /** Unit suffix shown under the auto center value when no `children`. */
  unit?: string
  /** Center icon shorthand (overridden by `children`). */
  icon?: LucideIcon
  /** Center label / value (single-ring style). */
  children?: ReactNode
  label?: string
  className?: string
  debug?: boolean
}

const RADIAL_CENTER = RADIAL_LOADER_VIEWBOX / 2

type ResolvedRing = {
  fraction: number
  tone?: ProgressLoaderTone
  label?: string
  icon?: LucideIcon
}

export function RadialLoader({
  rings,
  value,
  min = 0,
  max = 100,
  tone = DEFAULT_PROGRESS_LOADER_TONE,
  size = DEFAULT_PROGRESS_LOADER_SIZE,
  shape = 'full',
  thickness,
  gap,
  animate = true,
  indeterminate = false,
  glow = false,
  ticks = 0,
  showScale = false,
  unit,
  icon: CenterIcon,
  children,
  label,
  className = '',
  debug = false,
}: RadialLoaderProps) {
  const span = max - min || 1
  const rangeFraction = clampProgress(((value ?? 0) - min) / span * 100) / 100

  const resolvedRings: ResolvedRing[] =
    rings && rings.length > 0
      ? rings.map((ring) => ({
          fraction: clampProgress(ring.value) / 100,
          tone: ring.tone,
          label: ring.label,
          icon: ring.icon,
        }))
      : [{ fraction: rangeFraction, tone }]

  // Prime the fill from 0 on first frame so the CSS transition runs on mount.
  const [primed, setPrimed] = useState(!animate)
  useEffect(() => {
    if (!animate) return
    const id = requestAnimationFrame(() => setPrimed(true))
    return () => cancelAnimationFrame(id)
  }, [animate])

  if (debug) {
    console.debug('[RadialLoader]', { rings: resolvedRings, size, shape, indeterminate, glow })
  }

  const ringCount = resolvedRings.length
  const isSingleProgress = ringCount === 1 && !indeterminate
  const arcSpan = radialLoaderArcSpan(shape)
  const rotation = radialLoaderRotation(shape)
  const accessibleLabel =
    label ??
    (ringCount === 1
      ? `${Math.round(resolvedRings[0].fraction * 100)}%`
      : resolvedRings
          .map((ring) => `${ring.label ?? 'Ring'} ${Math.round(ring.fraction * 100)}%`)
          .join(', '))

  const a11yProps = isSingleProgress
    ? {
        role: 'progressbar' as const,
        'aria-valuenow': Math.round(value ?? min),
        'aria-valuemin': min,
        'aria-valuemax': max,
        'aria-label': accessibleLabel,
      }
    : { role: 'img' as const, 'aria-label': accessibleLabel }

  const ringGeometry = resolvedRings.map((_, index) =>
    radialLoaderRingGeometry(index, ringCount, { thickness, gap }),
  )
  const outerRadius = ringGeometry[0]?.radius ?? RADIAL_CENTER

  const centerContent =
    children ??
    (unit ? (
      <>
        <span className="theme-radial-loader__metric">{Math.round(value ?? min)}</span>
        <span className="theme-radial-loader__unit">{unit}</span>
      </>
    ) : CenterIcon ? (
      <CenterIcon aria-hidden />
    ) : null)

  return (
    <div
      className={[
        'theme-radial-loader',
        radialLoaderSizeClass[size],
        shape === 'semi' ? 'theme-radial-loader--semi' : '',
        ringCount > 1 ? 'theme-radial-loader--stacked' : '',
        indeterminate ? 'theme-radial-loader--indeterminate' : '',
        glow ? 'theme-radial-loader--glow' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...a11yProps}
    >
      <svg
        className="theme-radial-loader__svg"
        viewBox={`0 0 ${RADIAL_LOADER_VIEWBOX} ${RADIAL_LOADER_VIEWBOX}`}
        aria-hidden
      >
        {resolvedRings.map((ring, index) => {
          const { radius, strokeWidth, circumference } = ringGeometry[index]
          const fraction = !primed ? 0 : ring.fraction
          const ringTone = radialLoaderToneClass[ring.tone ?? tone]
          const valueOffset = indeterminate
            ? circumference * 0.75
            : circumference * (1 - fraction * arcSpan)

          return (
            <g key={`${index}-${ring.label ?? index}`}>
              <circle
                className="theme-radial-loader__track"
                cx={RADIAL_CENTER}
                cy={RADIAL_CENTER}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - arcSpan)}
                transform={`rotate(${rotation} ${RADIAL_CENTER} ${RADIAL_CENTER})`}
              />
              <circle
                className={['theme-radial-loader__value', ringTone].join(' ')}
                cx={RADIAL_CENTER}
                cy={RADIAL_CENTER}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={valueOffset}
                transform={`rotate(${rotation} ${RADIAL_CENTER} ${RADIAL_CENTER})`}
              />
            </g>
          )
        })}

      </svg>

      {ticks > 0 ? (
        <div className="theme-radial-loader__ticks">
          {Array.from({ length: ticks + 1 }, (_, i) => {
            const f = i / ticks
            const tickRadius = outerRadius + (ringGeometry[0]?.strokeWidth ?? 0) / 2 + 3
            const { x, y } = radialLoaderPoint(f, tickRadius, shape)
            const dx = x - RADIAL_CENTER
            const dy = y - RADIAL_CENTER
            const len = Math.hypot(dx, dy) || 1
            const rot = (Math.atan2(dy, dx) * 180) / Math.PI - 90
            const tickValue = Math.round(min + (max - min) * f)
            const isEnd = i === 0 || i === ticks
            return (
              <span
                key={`tick-${i}`}
                className={[
                  'theme-radial-loader__tick',
                  isEnd && showScale ? 'theme-radial-loader__tick--label' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={
                  {
                    ['--tip-x' as string]: `${(x / RADIAL_LOADER_VIEWBOX) * 100}%`,
                    ['--tip-y' as string]: `${(y / RADIAL_LOADER_VIEWBOX) * 100}%`,
                    ['--tick-rot' as string]: `${rot}deg`,
                    ['--out-x' as string]: String(dx / len),
                    ['--out-y' as string]: String(dy / len),
                  } as CSSProperties
                }
              >
                <span className="theme-radial-loader__tick-mark" />
                <span className="theme-radial-loader__tick-value">
                  {tickValue}
                  {unit ? <span className="theme-radial-loader__tick-unit">{unit}</span> : null}
                </span>
              </span>
            )
          })}
        </div>
      ) : null}

      {!indeterminate && resolvedRings.some((ring) => ring.icon) ? (
        <div className="theme-radial-loader__tips" aria-hidden>
          {resolvedRings.map((ring, index) => {
            const TipIcon = ring.icon
            if (!TipIcon) return null
            const { xPct, yPct } = radialLoaderTipPosition(
              primed ? ring.fraction : 0,
              ringGeometry[index].radius,
              shape,
            )
            return (
              <span
                key={`tip-${index}`}
                className="theme-radial-loader__tip"
                style={
                  {
                    ['--tip-x' as string]: `${xPct}%`,
                    ['--tip-y' as string]: `${yPct}%`,
                  } as CSSProperties
                }
              >
                <TipIcon aria-hidden />
              </span>
            )
          })}
        </div>
      ) : null}

      {centerContent ? <div className="theme-radial-loader__center">{centerContent}</div> : null}
    </div>
  )
}

type BarLoaderProps = {
  /** 0–100 fill percentage (ignored when `indeterminate`). */
  value?: number
  tone?: ProgressLoaderTone
  size?: ProgressLoaderSize
  variant?: BarLoaderVariant
  /** Sliding bar with no value. */
  indeterminate?: boolean
  /** Soft accent bloom on the fill. */
  glow?: boolean
  label?: string
  /** Leading Lucide icon beside the label. */
  icon?: LucideIcon
  /** Show the numeric percentage beside the track. */
  showValue?: boolean
  className?: string
  debug?: boolean
}

export function BarLoader({
  value = 0,
  tone = DEFAULT_PROGRESS_LOADER_TONE,
  size = DEFAULT_PROGRESS_LOADER_SIZE,
  variant = DEFAULT_BAR_LOADER_VARIANT,
  indeterminate = false,
  glow = false,
  label,
  icon: LabelIcon,
  showValue = false,
  className = '',
  debug = false,
}: BarLoaderProps) {
  const safeValue = clampProgress(value)

  if (debug) {
    console.debug('[BarLoader]', { value: safeValue, size, variant, indeterminate, glow })
  }

  const a11yProps = indeterminate
    ? { role: 'progressbar' as const, 'aria-busy': true, 'aria-label': label ?? 'Loading' }
    : {
        role: 'progressbar' as const,
        'aria-valuenow': Math.round(safeValue),
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-label': label ?? `${Math.round(safeValue)}% complete`,
      }

  return (
    <div
      className={[
        'theme-bar-loader',
        barLoaderSizeClass[size],
        barLoaderVariantClass[variant],
        indeterminate ? 'theme-bar-loader--indeterminate' : '',
        glow ? 'theme-bar-loader--glow' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...a11yProps}
    >
      {label || showValue ? (
        <div className="theme-bar-loader__head">
          {label ? (
            <span className="theme-bar-loader__label type-caption">
              {LabelIcon ? <LabelIcon className="theme-bar-loader__label-icon" aria-hidden /> : null}
              {label}
            </span>
          ) : null}
          {showValue && !indeterminate ? (
            <span className="theme-bar-loader__value-text type-caption font-mono">
              {Math.round(safeValue)}%
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="theme-bar-loader__track">
        <div
          className={['theme-bar-loader__fill', barLoaderToneClass[tone]].join(' ')}
          style={{ ['--bar-loader-value' as string]: String(safeValue / 100) } as CSSProperties}
        />
      </div>
    </div>
  )
}
