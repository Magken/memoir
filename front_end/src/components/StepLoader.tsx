import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Zap, type LucideIcon } from 'lucide-react'
import {
  batteryChargeTone,
  batteryLoaderOrientationClass,
  clampProgress,
  DEFAULT_PROGRESS_LOADER_SIZE,
  DEFAULT_PROGRESS_LOADER_TONE,
  dialLoaderShapeClass,
  loaderSizeClass,
  loaderToneClass,
  stepLoaderVariantClass,
  type BatteryLoaderOrientation,
  type DialLoaderShape,
  type ProgressLoaderSize,
  type ProgressLoaderTone,
  type StepLoaderVariant,
} from '../lib/loaders/progressLoaders'

export type {
  BatteryLoaderOrientation,
  DialLoaderShape,
  StepLoaderVariant,
} from '../lib/loaders/progressLoaders'

/* -------------------------------------------------------------------------- */
/* StepLoader — discrete segments (dots / bars / steps)                       */
/* -------------------------------------------------------------------------- */

type StepLoaderProps = {
  /** 0–100 progress (mapped to filled cells). */
  value?: number
  /** Number of cells. */
  steps?: number
  variant?: StepLoaderVariant
  tone?: ProgressLoaderTone
  size?: ProgressLoaderSize
  /** Travelling lit cell with no value. */
  indeterminate?: boolean
  glow?: boolean
  label?: string
  showValue?: boolean
  className?: string
  debug?: boolean
}

export function StepLoader({
  value = 0,
  steps = 5,
  variant = 'dots',
  tone = DEFAULT_PROGRESS_LOADER_TONE,
  size = DEFAULT_PROGRESS_LOADER_SIZE,
  indeterminate = false,
  glow = false,
  label,
  showValue = false,
  className = '',
  debug = false,
}: StepLoaderProps) {
  const count = Math.max(1, Math.round(steps))
  const safe = clampProgress(value)
  const filled = Math.round((safe / 100) * count)

  if (debug) {
    console.debug('[StepLoader]', { value: safe, count, filled, variant, indeterminate })
  }

  const a11yProps = indeterminate
    ? { role: 'progressbar' as const, 'aria-busy': true, 'aria-label': label ?? 'Loading' }
    : {
        role: 'progressbar' as const,
        'aria-valuenow': Math.round(safe),
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-label': label ?? `${Math.round(safe)}% complete`,
      }

  return (
    <div
      className={[
        'theme-step-loader',
        stepLoaderVariantClass[variant],
        loaderToneClass[tone],
        loaderSizeClass[size],
        indeterminate ? 'theme-step-loader--indeterminate' : '',
        glow ? 'theme-step-loader--glow' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...a11yProps}
    >
      {label || showValue ? (
        <div className="theme-step-loader__head">
          {label ? <span className="theme-step-loader__label type-caption">{label}</span> : null}
          {showValue && !indeterminate ? (
            <span className="theme-step-loader__value-text type-caption font-mono">
              {Math.round(safe)}%
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="theme-step-loader__track">
        {Array.from({ length: count }, (_, i) => (
          <span
            key={`cell-${i}`}
            className={[
              'theme-step-loader__cell',
              !indeterminate && i < filled ? 'theme-step-loader__cell--on' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ ['--i' as string]: String(i) } as CSSProperties}
          />
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* DialLoader — conic-gradient pie / donut                                    */
/* -------------------------------------------------------------------------- */

type DialLoaderProps = {
  value?: number
  min?: number
  max?: number
  shape?: DialLoaderShape
  tone?: ProgressLoaderTone
  size?: ProgressLoaderSize
  /** Spin a fixed wedge with no value. */
  indeterminate?: boolean
  glow?: boolean
  animate?: boolean
  unit?: string
  icon?: LucideIcon
  children?: ReactNode
  label?: string
  className?: string
  debug?: boolean
}

export function DialLoader({
  value = 0,
  min = 0,
  max = 100,
  shape = 'donut',
  tone = DEFAULT_PROGRESS_LOADER_TONE,
  size = DEFAULT_PROGRESS_LOADER_SIZE,
  indeterminate = false,
  glow = false,
  animate = true,
  unit,
  icon: CenterIcon,
  children,
  label,
  className = '',
  debug = false,
}: DialLoaderProps) {
  const span = max - min || 1
  const fraction = clampProgress(((value - min) / span) * 100) / 100

  const [primed, setPrimed] = useState(!animate)
  useEffect(() => {
    if (!animate) return
    const id = requestAnimationFrame(() => setPrimed(true))
    return () => cancelAnimationFrame(id)
  }, [animate])

  if (debug) {
    console.debug('[DialLoader]', { value, fraction, shape, indeterminate })
  }

  const fill = indeterminate ? 0 : primed ? fraction : 0
  const accessibleLabel = label ?? `${Math.round(value)}${unit ?? ''}`
  const a11yProps = indeterminate
    ? { role: 'progressbar' as const, 'aria-busy': true, 'aria-label': label ?? 'Loading' }
    : {
        role: 'progressbar' as const,
        'aria-valuenow': Math.round(value),
        'aria-valuemin': min,
        'aria-valuemax': max,
        'aria-label': accessibleLabel,
      }

  const centerContent =
    children ??
    (unit ? (
      <>
        <span className="theme-dial-loader__metric">{Math.round(value)}</span>
        <span className="theme-dial-loader__unit">{unit}</span>
      </>
    ) : CenterIcon ? (
      <CenterIcon aria-hidden />
    ) : null)

  return (
    <div
      className={[
        'theme-dial-loader',
        dialLoaderShapeClass[shape],
        loaderToneClass[tone],
        loaderSizeClass[size],
        indeterminate ? 'theme-dial-loader--indeterminate' : '',
        glow ? 'theme-dial-loader--glow' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ ['--dial-value' as string]: String(fill) } as CSSProperties}
      {...a11yProps}
    >
      <div className="theme-dial-loader__face" aria-hidden />
      {centerContent ? <div className="theme-dial-loader__center">{centerContent}</div> : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* BatteryLoader — charge cell with threshold colors + charging bolt          */
/* -------------------------------------------------------------------------- */

type BatteryLoaderProps = {
  value?: number
  tone?: ProgressLoaderTone
  /** Auto-pick tone from charge (low=error, mid=warning, high=success). */
  autoTone?: boolean
  size?: ProgressLoaderSize
  orientation?: BatteryLoaderOrientation
  /** Pulsing charge animation + bolt icon. */
  charging?: boolean
  glow?: boolean
  /** Hoverable scale stripes along the cell. */
  ticks?: number
  /** Keep the 0 / 100 end labels visible. */
  showScale?: boolean
  /** Value-label unit (defaults to %). */
  unit?: string
  label?: string
  showValue?: boolean
  className?: string
  debug?: boolean
}

const BATTERY_WAVE_H =
  'M0 10 C16.7 0 33.3 0 50 10 C66.7 20 83.3 20 100 10 C116.7 0 133.3 0 150 10 C166.7 20 183.3 20 200 10 V20 H0 Z'
const BATTERY_WAVE_V =
  'M0 0 H10 C20 16.7 20 33.3 10 50 C0 66.7 0 83.3 10 100 C20 116.7 20 133.3 10 150 C0 166.7 0 183.3 10 200 H0 Z'

export function BatteryLoader({
  value = 0,
  tone = DEFAULT_PROGRESS_LOADER_TONE,
  autoTone = true,
  size = DEFAULT_PROGRESS_LOADER_SIZE,
  orientation = 'horizontal',
  charging = false,
  glow = false,
  ticks = 0,
  showScale = false,
  unit = '%',
  label,
  showValue = false,
  className = '',
  debug = false,
}: BatteryLoaderProps) {
  const safe = clampProgress(value)
  const resolvedTone = autoTone ? batteryChargeTone(safe) : tone
  const isVertical = orientation === 'vertical'

  if (debug) {
    console.debug('[BatteryLoader]', { value: safe, resolvedTone, orientation, charging })
  }

  return (
    <div
      className={[
        'theme-battery-loader',
        batteryLoaderOrientationClass[orientation],
        loaderToneClass[resolvedTone],
        loaderSizeClass[size],
        charging ? 'theme-battery-loader--charging' : '',
        glow ? 'theme-battery-loader--glow' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="progressbar"
      aria-valuenow={Math.round(safe)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `Battery ${Math.round(safe)}%`}
    >
      <div className="theme-battery-loader__body">
        <div
          className="theme-battery-loader__fill"
          style={{ ['--battery-value' as string]: String(safe / 100) } as CSSProperties}
        >
          <svg
            className="theme-battery-loader__wave"
            viewBox={isVertical ? '0 0 200 20' : '0 0 20 200'}
            preserveAspectRatio="none"
            aria-hidden
          >
            <path d={isVertical ? BATTERY_WAVE_H : BATTERY_WAVE_V} />
          </svg>
        </div>
        {charging ? <Zap className="theme-battery-loader__bolt" aria-hidden /> : null}
        {showValue ? (
          <span className="theme-battery-loader__value-text">
            {Math.round(safe)}
            <span className="theme-battery-loader__value-unit">{unit}</span>
          </span>
        ) : null}
      </div>
      <span className="theme-battery-loader__cap" aria-hidden />

      {ticks > 0 ? (
        <div className="theme-battery-loader__ticks" aria-hidden>
          {Array.from({ length: ticks + 1 }, (_, i) => {
            const f = i / ticks
            const isEnd = i === 0 || i === ticks
            return (
              <span
                key={`tick-${i}`}
                className={[
                  'theme-battery-loader__tick',
                  isEnd && showScale ? 'theme-battery-loader__tick--label' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ ['--tick-pos' as string]: `${f * 100}%` } as CSSProperties}
              >
                <span className="theme-battery-loader__tick-mark" />
              </span>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
