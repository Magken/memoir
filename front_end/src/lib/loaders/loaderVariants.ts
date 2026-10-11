export const LOADER_SIZES = ['button', 'sm', 'md', 'lg', 'page'] as const

export type LoaderSize = (typeof LOADER_SIZES)[number]

export const LOADER_VARIANTS = ['gyro', 'triad'] as const

export type LoaderVariant = (typeof LOADER_VARIANTS)[number]

/** App-wide loader style — `Loader`, `PageLoader`, and `LoadingButton` inherit unless `variant` is passed. */
export const DEFAULT_LOADER_VARIANT: LoaderVariant = 'triad'

/** Default size when `Loader` is used without `size`. */
export const DEFAULT_LOADER_SIZE: LoaderSize = 'md'

/** Default visible label for page / async content loading. */
export const DEFAULT_LOADER_LABEL = 'Loading…'

/** Progress copy for galleries and other async surfaces. */
export function formatLoadingProgress(loaded: number, total: number): string {
  return total > 0 ? `${DEFAULT_LOADER_LABEL} ${loaded}/${total}` : DEFAULT_LOADER_LABEL
}

export const loaderSizeClass: Record<LoaderSize, string> = {
  button: 'theme-loader--button',
  sm: 'theme-loader--sm',
  md: 'theme-loader--md',
  lg: 'theme-loader--lg',
  page: 'theme-loader--page',
}

export const loaderVariantClass: Record<LoaderVariant, string> = {
  gyro: 'theme-loader--gyro',
  triad: 'theme-loader--triad',
}
