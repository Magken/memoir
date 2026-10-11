import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  clampProgress,
  DEFAULT_PROGRESS_LOADER_TONE,
  fluidLoaderGradientClass,
  fluidLoaderShapeClass,
  fluidLoaderSizeClass,
  fluidLoaderToneClass,
  type FluidLoaderGradient,
  type FluidLoaderShape,
  type FluidLoaderSize,
  type ProgressLoaderTone,
} from '../lib/loaders/progressLoaders'

export type {
  FluidLoaderGradient,
  FluidLoaderShape,
  FluidLoaderSize,
} from '../lib/loaders/progressLoaders'

type FluidLoaderProps = {
  /** Fill amount. With `min`/`max` this is mapped into 0–100%. */
  value?: number
  min?: number
  max?: number
  shape?: FluidLoaderShape
  size?: FluidLoaderSize
  tone?: ProgressLoaderTone
  /**
   * Named color-scale gradient — low end differs from high end, anchored to the
   * vessel so the color shifts as the level rises (overrides `tone`).
   */
  gradient?: FluidLoaderGradient
  /** Animate the fill rising from empty on mount. */
  animate?: boolean
  /** Soft glow on the liquid. */
  glow?: boolean
  /** Hoverable scale stripes on the side (tube / bottle). */
  ticks?: number
  /** Keep the min / max end labels visible. */
  showScale?: boolean
  /** Unit suffix under the auto center value when no `children`. */
  unit?: string
  /** Center icon shorthand (overridden by `children`). */
  icon?: LucideIcon
  /** Center overlay content (value / label). */
  children?: ReactNode
  label?: string
  className?: string
  debug?: boolean
}

export function FluidLoader({
  value = 0,
  min = 0,
  max = 100,
  shape = 'tube',
  size = 'md',
  tone = DEFAULT_PROGRESS_LOADER_TONE,
  gradient,
  animate = true,
  glow = false,
  ticks = 0,
  showScale = false,
  unit,
  icon: CenterIcon,
  children,
  label,
  className = '',
  debug = false,
}: FluidLoaderProps) {
  const span = max - min || 1
  const fraction = clampProgress(((value - min) / span) * 100) / 100

  const [primed, setPrimed] = useState(!animate)
  useEffect(() => {
    if (!animate) return
    const id = requestAnimationFrame(() => setPrimed(true))
    return () => cancelAnimationFrame(id)
  }, [animate])

  if (debug) {
    console.debug('[FluidLoader]', { value, shape, size, tone, gradient, fraction, glow })
  }

  const fill = primed ? fraction : 0
  const accessibleLabel = label ?? `${Math.round(value)}${unit ?? ''}`

  const centerContent =
    children ??
    (unit ? (
      <>
        <span className="theme-fluid-loader__metric">{Math.round(value)}</span>
        <span className="theme-fluid-loader__unit">{unit}</span>
      </>
    ) : CenterIcon ? (
      <CenterIcon aria-hidden />
    ) : null)

  return (
    <div
      className={[
        'theme-fluid-loader',
        fluidLoaderShapeClass[shape],
        fluidLoaderSizeClass[size],
        gradient ? 'theme-fluid-loader--gradient' : fluidLoaderToneClass[tone],
        gradient ? fluidLoaderGradientClass[gradient] : '',
        glow ? 'theme-fluid-loader--glow' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={accessibleLabel}
      style={{ ['--fluid-value' as string]: String(fill) } as CSSProperties}
    >
      <div className="theme-fluid-loader__vessel">
        <div className="theme-fluid-loader__liquid">
          <svg
            className="theme-fluid-loader__wave"
            viewBox="0 0 200 20"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path d="M0 10 C16.7 0 33.3 0 50 10 C66.7 20 83.3 20 100 10 C116.7 0 133.3 0 150 10 C166.7 20 183.3 20 200 10 V20 H0 Z" />
          </svg>
          <svg
            className="theme-fluid-loader__wave theme-fluid-loader__wave--back"
            viewBox="0 0 200 20"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path d="M0 10 C16.7 0 33.3 0 50 10 C66.7 20 83.3 20 100 10 C116.7 0 133.3 0 150 10 C166.7 20 183.3 20 200 10 V20 H0 Z" />
          </svg>
        </div>
      </div>

      {ticks > 0 ? (
        <div className="theme-fluid-loader__ticks" aria-hidden>
          {Array.from({ length: ticks + 1 }, (_, i) => {
            const f = i / ticks
            const tickValue = Math.round(min + (max - min) * f)
            const isEnd = i === 0 || i === ticks
            return (
              <span
                key={`tick-${i}`}
                className={[
                  'theme-fluid-loader__tick',
                  isEnd && showScale ? 'theme-fluid-loader__tick--label' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ ['--tick-pos' as string]: `${f * 100}%` } as CSSProperties}
              >
                <span className="theme-fluid-loader__tick-mark" />
                <span className="theme-fluid-loader__tick-value">
                  {tickValue}
                  {unit ? <span className="theme-fluid-loader__tick-unit">{unit}</span> : null}
                </span>
              </span>
            )
          })}
        </div>
      ) : null}

      {centerContent ? <div className="theme-fluid-loader__center">{centerContent}</div> : null}
    </div>
  )
}
