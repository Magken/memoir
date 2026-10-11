import {
  DEFAULT_LOADER_LABEL,
  DEFAULT_LOADER_SIZE,
  DEFAULT_LOADER_VARIANT,
  loaderSizeClass,
  loaderVariantClass,
  type LoaderSize,
  type LoaderVariant,
} from '../lib/loaders/loaderVariants'

export {
  DEFAULT_LOADER_LABEL,
  DEFAULT_LOADER_SIZE,
  DEFAULT_LOADER_VARIANT,
  formatLoadingProgress,
} from '../lib/loaders/loaderVariants'

type LoaderProps = {
  variant?: LoaderVariant
  size?: LoaderSize
  /** Accessible name when no visible label */
  label?: string
  className?: string
  debug?: boolean
}

function GyroLoader() {
  return (
    <div className="theme-loader-gyro" aria-hidden>
      <div className="theme-loader-gyro__orbit theme-loader-gyro__orbit--a" />
      <div className="theme-loader-gyro__orbit theme-loader-gyro__orbit--b" />
      <div className="theme-loader-gyro__orbit theme-loader-gyro__orbit--c" />
      <div className="theme-loader-gyro__orbit theme-loader-gyro__orbit--w1" />
      <div className="theme-loader-gyro__orbit theme-loader-gyro__orbit--w2" />
      <div className="theme-loader-gyro__orbit theme-loader-gyro__orbit--w3" />
      <span className="theme-loader-gyro__core" />
    </div>
  )
}

function TriadLoader() {
  return (
    <div className="theme-loader-triad" aria-hidden>
      <div className="theme-loader-triad__ring theme-loader-triad__ring--one" />
      <div className="theme-loader-triad__ring theme-loader-triad__ring--two" />
      <div className="theme-loader-triad__ring theme-loader-triad__ring--three" />
    </div>
  )
}

export function Loader({
  variant = DEFAULT_LOADER_VARIANT,
  size = DEFAULT_LOADER_SIZE,
  label = 'Loading',
  className = '',
  debug = false,
}: LoaderProps) {
  if (debug) {
    console.debug('[Loader]', { variant, size, label })
  }

  return (
    <div
      role="status"
      aria-label={label}
      className={[
        'theme-loader',
        loaderVariantClass[variant],
        loaderSizeClass[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {variant === 'triad' ? <TriadLoader /> : <GyroLoader />}
    </div>
  )
}

type PageLoaderProps = {
  variant?: LoaderVariant
  /** Full-area block using `--theme-page-bg` (section / route loading) */
  fill?: boolean
  /** Tighter block for overlays (galleries, panels) — no min-height padding */
  compact?: boolean
  label?: string
  className?: string
  debug?: boolean
}

export function PageLoader({
  variant = DEFAULT_LOADER_VARIANT,
  fill = false,
  compact = false,
  label = DEFAULT_LOADER_LABEL,
  className = '',
  debug = false,
}: PageLoaderProps) {
  if (debug) {
    console.debug('[PageLoader]', { variant, fill, label })
  }

  return (
    <div
      className={[
        'theme-loader-page',
        fill ? 'theme-loader-page--fill' : '',
        compact ? 'theme-loader-page--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-busy="true"
      aria-live="polite"
    >
      <Loader variant={variant} size="page" label={label} />
      {label ? <p className="theme-loader-page__label type-body-sm">{label}</p> : null}
    </div>
  )
}

type ContentLoadOverlayProps = {
  loading: boolean
  label?: string
  variant?: LoaderVariant
  className?: string
  debug?: boolean
}

/** Absolute overlay for async surfaces (galleries, canvases) — inherits app loader defaults. */
export function ContentLoadOverlay({
  loading,
  label = DEFAULT_LOADER_LABEL,
  variant,
  className = '',
  debug = false,
}: ContentLoadOverlayProps) {
  if (debug) {
    console.debug('[ContentLoadOverlay]', { loading, label, variant })
  }

  return (
    <div
      className={[
        'theme-content-load-overlay',
        loading ? '' : 'theme-content-load-overlay--hidden',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-live="polite"
      aria-busy={loading}
    >
      <PageLoader label={label} variant={variant} compact />
    </div>
  )
}

export type { LoaderVariant } from '../lib/loaders/loaderVariants'
